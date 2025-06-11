"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ArrowRight, Save, FolderOpen, CheckCircle2, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client"; // Import SupabaseClient
import { toast } from "react-toastify";
import { ArsipAktif, BeritaAcara, PemindahanInfo, ApprovalStatus as IApprovalStatus, ProcessStatus } from "./types";
import { ALLOWED_ROLES, SIGN_IN_PATH, DEFAULT_HOME_PATH, getISODateString, calculateRetentionExpired, formatDate, kodeKlasifikasiCompare } from "./utils";
import { SelectArsip } from "./components/SelectArsip";
import { BeritaAcaraForm } from "./components/BeritaAcaraForm";
import { PemindahanForm } from "./components/PemindahanForm";
import { ApprovalStatus } from "./components/ApprovalStatus";
import { SuccessConfirmation } from "./components/SuccessConfirmation";
import { PemindahanLoadingSkeleton } from "./components/LoadingSkeleton";
import { sendDepartmentHeadNotification, sendRoleNotification } from "@/utils/notificationService";
import Loading from "./loading";

export default function PemindahanArsip() {
	const supabase = createClient();
	const router = useRouter();

	// State untuk autentikasi dan data pengguna
	const [authLoading, setAuthLoading] = useState(true);
	const [userRole, setUserRole] = useState<string | null>(null);
	const [userBidangId, setUserBidangId] = useState<number | null>(null);
	const [userId, setUserId] = useState<string | null>(null);

	// State untuk halaman dan langkah proses
	const [currentStep, setCurrentStep] = useState(1);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const itemsPerPage = 10;

	// State untuk pencarian dan filter
	const [searchTerm, setSearchTerm] = useState("");
	const [filterMode, setFilterMode] = useState<'all' | 'expired' | 'selected'>('all');
	// State untuk data arsip dan proses pemindahan
	const [arsipList, setArsipList] = useState<ArsipAktif[]>([]);
	const [selectedArsip, setSelectedArsip] = useState<ArsipAktif[]>([]);
	const [beritaAcara, setBeritaAcara] = useState<BeritaAcara>({
		nomor_berita_acara: "",
		tanggal_berita_acara: getISODateString(new Date()),
		keterangan: "",
		dasar: "Jadwal Retensi Arsip (JRA) dan peraturan kearsipan yang berlaku"
	});

	// State untuk data pemindahan arsip
	const [pemindahanInfo, setPemindahanInfo] = useState<PemindahanInfo & { arsip_edits?: any[] }>({
		lokasi_simpan: "",
		nomor_boks: "",
		jenis: "",
		jangka_simpan_inaktif: 0,
		nasib_akhir: "",
		kategori_arsip: "Arsip Konvensional",
		keterangan: "",
		arsip_edits: []
	});

	// State untuk proses persetujuan
	const [approvalStatus, setApprovalStatus] = useState<IApprovalStatus>({
		kepala_bidang: {
			status: "Menunggu",
			verified_by: null,
			verified_at: null,
		},
		sekretaris: {
			status: "Menunggu",
			verified_by: null,
			verified_at: null,
		}
	});

	// Tambahkan state untuk process status
	const [processStatus, setProcessStatus] = useState<ProcessStatus>({ status: 'idle' });

	// Tambahkan state untuk process ID
	const [processId, setProcessId] = useState<string | null>(null);

	useEffect(() => {
		const checkAuth = async () => {
			setAuthLoading(true);
			const { data: { session } } = await supabase.auth.getSession();

			if (!session) {
				console.warn("No active session, redirecting to sign-in.");
				router.push(SIGN_IN_PATH);
				setAuthLoading(false);
				return;
			}

			// Jika ada sesi, periksa peran pengguna
			const userId = session.user.id;
			setUserId(userId);

			try {
				const { data: userData, error: userFetchError } = await supabase
					.from("users")
					.select("role, id_bidang_fkey, nama")
					.eq("user_id", userId)
					.single();

				if (userFetchError) {
					console.error("Error fetching user role:", userFetchError);
					toast.error("Gagal memverifikasi peran pengguna: " + userFetchError.message);
					setAuthLoading(false);
					router.push(SIGN_IN_PATH);
					return;
				}

				if (!userData || !userData.role) {
					toast.warn("Data pengguna tidak lengkap. Silakan login kembali.");
					setAuthLoading(false);
					router.push(SIGN_IN_PATH);
					return;
				}

				setUserRole(userData.role);
				setUserBidangId(userData.id_bidang_fkey);

				if (!ALLOWED_ROLES.includes(userData.role)) {
					console.warn(`User role "${userData.role}" is not authorized for this page. Redirecting.`);
					toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini. Peran Anda: " + userData.role);
					setAuthLoading(false);
					router.push(DEFAULT_HOME_PATH);
					return;
				}
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
				console.error("Unexpected error fetching user role:", errorMessage);
				toast.error("Terjadi kesalahan saat verifikasi peran: " + errorMessage);
				setAuthLoading(false);
				router.push(SIGN_IN_PATH);
				return;
			}

			setAuthLoading(false);
		};

		checkAuth();
	}, [router, supabase]);

	// Update the fetchArsipAktif function to properly transform the data
	const fetchArsipAktif = useCallback(async () => {
		if (userBidangId === null) {
			setLoading(false);
			setArsipList([]);
			setTotalPages(0);
			return;
		}

		setLoading(true);
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage - 1;

		try {
			// Base query
			let query = supabase
				.from("arsip_aktif")
				.select(`
                    id_arsip_aktif,
                    nomor_berkas,
                    kode_klasifikasi,
                    uraian_informasi,
                    kurun_waktu,
                    jumlah,
                    keterangan,
                    tingkat_perkembangan,
                    media_simpan,
                    file_url,
                    jangka_simpan,
                    status_persetujuan,
                    masa_retensi,
                    lokasi_penyimpanan!inner (
                        id_bidang_fkey,
                        no_filing_cabinet,
                        no_laci,
                        no_folder
                    )
                `, { count: "exact" })
				.eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId)
				.eq('status_persetujuan', 'Disetujui');

			const { data: initialArsipData, error, count } = await query
				.order("nomor_berkas", { ascending: true })
				.range(startIndex, endIndex);

			console.log("[DEBUG FETCH] Initial Arsip Data:", initialArsipData); // Log data awal
			if (error) {
				toast.error("Gagal memuat data arsip: " + error.message);
				setArsipList([]);
				setTotalPages(0);
				return;
			}

			if (!initialArsipData || initialArsipData.length === 0) {
				setArsipList([]);
				setTotalPages(Math.ceil((count || 0) / itemsPerPage));
				setLoading(false);
				return;
			}

			const arsipAktifIds = initialArsipData.map(a => a.id_arsip_aktif);
			const { data: linkedArsipData, error: linkedArsipError } = await supabase
				.from('pemindahan_arsip_link')
				.select('id_arsip_aktif_fkey')
				.in('id_arsip_aktif_fkey', arsipAktifIds);

			if (linkedArsipError) {
				toast.error("Gagal memeriksa status pemindahan arsip: " + linkedArsipError.message);
				// Lanjutkan dengan data yang ada, atau handle error sesuai kebutuhan
			}

			const linkedArsipIds = new Set(linkedArsipData?.map(link => link.id_arsip_aktif_fkey) || []);
			console.log("[DEBUG FETCH] Linked Arsip IDs:", Array.from(linkedArsipIds)); // Log ID arsip yang sudah terlink
			const unlinkedArsipData = initialArsipData.filter(arsip => !linkedArsipIds.has(arsip.id_arsip_aktif));
			console.log("[DEBUG FETCH] Unlinked Arsip Data (after filter):", unlinkedArsipData); // Log data setelah filter

			// Transform data to match ArsipAktif interface
			// Get unique base kode_klasifikasi from unlinkedArsipData
			const uniqueBaseKodeKlasifikasi = Array.from(new Set(unlinkedArsipData.map(a => a.kode_klasifikasi ? a.kode_klasifikasi.split('/')[0].trim() : '').filter(Boolean))); // Tambahkan trim di sini juga

			let klasifikasiMap = new Map();
			if (uniqueBaseKodeKlasifikasi.length > 0) {
				const { data: allKlasifikasiData, error: klasifikasiError } = await supabase
					.from('klasifikasi_arsip')
					.select('kode_klasifikasi, label, aktif, inaktif, nasib_akhir')
					.in('kode_klasifikasi', uniqueBaseKodeKlasifikasi);

				if (klasifikasiError) {
					toast.error("Gagal mengambil data klasifikasi: " + klasifikasiError.message);
				} else if (allKlasifikasiData) {
					// console.log("[PEMINDAHAN DEBUG] Raw allKlasifikasiData from DB:", allKlasifikasiData);
					klasifikasiMap = new Map(allKlasifikasiData.map(k => [
						k.kode_klasifikasi ? k.kode_klasifikasi.trim() : '',
						{ label: k.label, aktif: k.aktif, inaktif: k.inaktif, nasib_akhir: k.nasib_akhir }
					]));
					console.log("[PEMINDAHAN DEBUG] Populated klasifikasiMap keys (after trim):", Array.from(klasifikasiMap.keys()));
				}
			}

			const arsipWithRetention = unlinkedArsipData.map((arsip: any) => {
				try {
					const baseKodeKlasifikasi = arsip.kode_klasifikasi ? arsip.kode_klasifikasi.split('/')[0] : '';
					const trimmedBaseKode = baseKodeKlasifikasi.trim();

					let klasifikasiData;
					if (klasifikasiMap instanceof Map) {
						klasifikasiData = klasifikasiMap.get(trimmedBaseKode);
					} else if (Array.isArray(klasifikasiMap)) {
						const entry = (klasifikasiMap as Array<{ key: string, value: any }>).find(e => e.key === trimmedBaseKode);
						klasifikasiData = entry ? entry.value : undefined;
					} else {
						console.error("[PEMINDAHAN ERROR] Tipe klasifikasiMap tidak dikenal:", typeof klasifikasiMap, klasifikasiMap);
					}

					const isRetentionExpired = klasifikasiData ?
						calculateRetentionExpired(arsip, klasifikasiData) :
						false;

					return {
						...arsip,
						retensi_data: klasifikasiData && typeof klasifikasiData.inaktif !== 'undefined' && typeof klasifikasiData.nasib_akhir !== 'undefined' ? {
							aktif: klasifikasiData.aktif,
							inaktif: klasifikasiData.inaktif,
							nasib_akhir: klasifikasiData.nasib_akhir,
							label: klasifikasiData.label
						} : null,
						is_retention_expired: isRetentionExpired,
						lokasi_penyimpanan: {
							id_bidang_fkey: arsip.lokasi_penyimpanan?.id_bidang_fkey || "",
							no_filing_cabinet: arsip.lokasi_penyimpanan?.no_filing_cabinet || "",
							no_laci: arsip.lokasi_penyimpanan?.no_laci || "",
							no_folder: arsip.lokasi_penyimpanan?.no_folder || ""
						}
					} as ArsipAktif;
				} catch (error) {
					console.error(`Error processing arsip ${arsip.id_arsip_aktif}:`, error);
					console.error(`[FETCH ARSIP ERROR] Error processing arsip ID ${arsip.id_arsip_aktif} (Kode: ${arsip.kode_klasifikasi}):`, error);
					return {
						...arsip,
						retensi_data: null,
						is_retention_expired: false
					} as ArsipAktif;
				}
			});

			console.log("[PEMINDAHAN LOG] Arsip with Retention (and label):", arsipWithRetention);

			const sortedArsipWithRetention = [...arsipWithRetention].sort((a, b) =>
				kodeKlasifikasiCompare(a.kode_klasifikasi, b.kode_klasifikasi)
			  );

			let filteredData = sortedArsipWithRetention;

			if (filterMode === "expired") {
				filteredData = arsipWithRetention.filter(arsip => arsip.is_retention_expired);
			} else if (filterMode === "selected") {
				const selectedIds = selectedArsip.map(item => item.id_arsip_aktif);
				filteredData = arsipWithRetention.filter(arsip => selectedIds.includes(arsip.id_arsip_aktif));
			}

			setArsipList(filteredData);
			setTotalPages(Math.ceil((count || 0) / itemsPerPage));
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			toast.error(errorMessage);
			console.error("Error fetching arsip:", error);
			setArsipList([]);
			setTotalPages(0);
		}

		setLoading(false);
	}, [currentPage, filterMode, itemsPerPage, selectedArsip, supabase, userBidangId]);

	useEffect(() => {
		if (userBidangId !== null && currentStep === 1) {
			fetchArsipAktif();
		}
	}, [userBidangId, currentPage, fetchArsipAktif, filterMode, currentStep]);

	// Effect untuk polling status persetujuan ketika di langkah 4
	useEffect(() => {
		let intervalId: NodeJS.Timeout | null = null;

		const checkCurrentApprovalStatus = async () => {
			if (!beritaAcara.nomor_berita_acara || !processId) { // Tambahkan pengecekan processId
				console.log("[PEMINDAHAN POLLING] No berita acara number or processId to check status");
				return; // Pastikan processId ada untuk polling
			}

			try {
				const { data, error } = await supabase
					.from("pemindahan_process") // Mengambil dari pemindahan_process
					.select("approval_status")
					.eq("id", processId) // Menggunakan processId sebagai identifier
					.maybeSingle(); // Gunakan maybeSingle() agar tidak error jika belum ada

				if (error) {
					console.error("[PEMINDAHAN POLLING] Error fetching approval status:", error);
					return;
				}

				// Jika data ditemukan dan memiliki approval_status
				if (data && data.approval_status) {
					// Pastikan struktur approval_status konsisten
					const newApprovalStatus = data.approval_status as IApprovalStatus;
					if (newApprovalStatus.kepala_bidang?.status && newApprovalStatus.sekretaris?.status) { // Periksa status di dalam objek
						setApprovalStatus(newApprovalStatus);
						console.log("[PEMINDAHAN POLLING] Fetched approval status from pemindahan_process:", newApprovalStatus);
					}
				}
			} catch (err) {
				console.error("[PEMINDAHAN POLLING] Error in approval status check:", err);
			}
		};

		if (currentStep === 4 && (approvalStatus.kepala_bidang.status !== "Disetujui" || approvalStatus.sekretaris.status !== "Disetujui")) {
			console.log("[PEMINDAHAN POLLING] Setting up approval status checking for step 4");
			checkCurrentApprovalStatus(); // Panggil sekali saat pertama kali masuk step 4
			intervalId = setInterval(checkCurrentApprovalStatus, 10000); // Polling setiap 10 detik
		}

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, [currentStep, beritaAcara.nomor_berita_acara, processId, supabase, approvalStatus.kepala_bidang.status, approvalStatus.sekretaris.status]); // Tambahkan dependensi yang relevan

	// Handler untuk pencarian
	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	// Filter arsip berdasarkan pencarian
	const filteredArsip = arsipList.filter(arsip =>
		arsip.kode_klasifikasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
		arsip.uraian_informasi.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Handler untuk pemilihan arsip
	const toggleSelectArsip = (arsip: ArsipAktif) => {
		const isSelected = selectedArsip.some(item => item.id_arsip_aktif === arsip.id_arsip_aktif);

		if (isSelected) {
			setSelectedArsip(selectedArsip.filter(item => item.id_arsip_aktif !== arsip.id_arsip_aktif));
		} else {
			setSelectedArsip([...selectedArsip, arsip]);
		}
	};

	// Handler untuk pagination
	const handleNextPage = () => {
		if (currentPage < totalPages) {
			setCurrentPage(currentPage + 1);
		}
	};

	const handlePrevPage = () => {
		if (currentPage > 1) {
			setCurrentPage(currentPage - 1);
		}
	};

	// Handler untuk perubahan mode filter
	const handleFilterChange = (mode: 'all' | 'expired' | 'selected') => {
		setFilterMode(mode);
		setCurrentPage(1);
	};

	// Handler untuk input berita acara
	const handleBeritaAcaraChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setBeritaAcara(prev => ({ ...prev, [name]: value }));
	};

	// Handler untuk input informasi pemindahan
	const handlePemindahanInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setPemindahanInfo(prev => ({ ...prev, [name]: value }));
	};

	// Handler untuk perubahan field spesifik arsip dalam PemindahanForm
	const handleArsipFieldChange = (arsipId: string, fieldName: 'jenis_arsip_edited' | 'masa_retensi_inaktif_edited' | 'nasib_akhir_edited', value: string | number) => {
		setSelectedArsip(prevArsipList =>
			prevArsipList.map(arsip =>
				arsip.id_arsip_aktif === arsipId
					? { ...arsip, [fieldName]: value }
					: arsip
			)
		)//
		// ;
		// Update ke pemindahanInfo.arsip_edits
		setPemindahanInfo(prev => {
			const edits = Array.isArray(prev.arsip_edits) ? [...prev.arsip_edits] : [];
			const idx = edits.findIndex(e => e.id_arsip_aktif === arsipId);
			if (idx >= 0) {
				edits[idx] = { ...edits[idx], [fieldName]: value };
			} else {
				edits.push({ id_arsip_aktif: arsipId, [fieldName]: value });
			}
			return { ...prev, arsip_edits: edits };
		});
	};
	// Handler untuk perpindahan langkah
	const handleNextStep = () => {
		// Validasi sebelum pindah langkah
		if (currentStep === 1 && selectedArsip.length === 0) {
			toast.warning("Pilih minimal satu arsip untuk dipindahkan!");
			return;
		}

		if (currentStep === 2) {
			// Validasi form berita acara
			if (!beritaAcara.nomor_berita_acara || !beritaAcara.tanggal_berita_acara) {
				toast.warning("Lengkapi form berita acara pemindahan!");
				return;
			}
		}

		if (currentStep === 3) {
			// Validasi approval
			if (approvalStatus.kepala_bidang.status !== "Disetujui" || approvalStatus.sekretaris.status !== "Disetujui") {
				toast.info("Menunggu persetujuan dari Kepala Bidang dan Sekretaris...");
				return;
			}
			// Jika sudah disetujui, lanjut ke step 4
		}

		if (currentStep === 4) {
			// Validasi form informasi pemindahan
			if (!pemindahanInfo.lokasi_simpan || !pemindahanInfo.nomor_boks) {
				toast.warning("Lengkapi informasi lokasi penyimpanan arsip inaktif!");
				return;
			}
			// Proses pemindahan arsip
			if (processStatus.status !== 'processing' && processStatus.status !== 'completed') {
				handlePemindahanArsip();
				return;
			} else if (processStatus.status === 'completed') {
				setCurrentStep(5);
				return;
			}
		}

		setCurrentStep(currentStep + 1);
	};

	const handlePrevStep = () => {
		setCurrentStep(currentStep - 1);
	};

	// Fungsi untuk load process yang ada
	const loadExistingProcess = async () => {
		if (!userId) return;

		try {
			// Check for process_id in URL
			const urlParams = new URLSearchParams(window.location.search);
			const processIdFromUrl = urlParams.get('process_id');

			let processQuery = supabase
				.from('pemindahan_process')
				.select('*')
				.eq('user_id', userId)
				.eq('is_completed', false);

			// If process_id is provided in URL, use that specific process
			if (processIdFromUrl) {
				processQuery = processQuery.eq('id', processIdFromUrl);
			}

			const { data: processes, error } = await processQuery
				.order('created_at', { ascending: false })
				.limit(1);

			if (error) {
				console.error('Error loading process:', error);
				return;
			}

			if (processes && processes.length > 0) {
				const process = processes[0];
				setProcessId(process.id);

				// Load selected arsip details if there are selected_arsip_ids
				let validArsip: ArsipAktif[] = [];
				if (process.selected_arsip_ids && Array.isArray(process.selected_arsip_ids) && process.selected_arsip_ids.length > 0) {
					const { data: arsipData } = await supabase
						.from('arsip_aktif')
						.select('*')
						.in('id_arsip_aktif', process.selected_arsip_ids);

					// Validasi: hanya ambil arsip yang benar-benar ada
					const arsipListFetched = (arsipData || []).filter(a => !!a);
					const validArsipIds = arsipListFetched.map(a => a.id_arsip_aktif);
					const missingArsipIds = process.selected_arsip_ids.filter((id: any) => !validArsipIds.includes(id));

					// Transformasi data arsip agar field retensi_data, label, inaktif, nasib_akhir terisi
					let klasifikasiMap = new Map();
					const uniqueBaseKodeKlasifikasi = Array.from(new Set(arsipListFetched.map(a => a.kode_klasifikasi ? a.kode_klasifikasi.split('/')[0].trim() : '').filter(Boolean)));
					if (uniqueBaseKodeKlasifikasi.length > 0) {
						const { data: allKlasifikasiData } = await supabase
							.from('klasifikasi_arsip')
							.select('kode_klasifikasi, label, aktif, inaktif, nasib_akhir')
							.in('kode_klasifikasi', uniqueBaseKodeKlasifikasi);
						if (allKlasifikasiData) {
							klasifikasiMap = new Map(allKlasifikasiData.map(k => [
								k.kode_klasifikasi ? k.kode_klasifikasi.trim() : '',
								{ label: k.label, aktif: k.aktif, inaktif: k.inaktif, nasib_akhir: k.nasib_akhir }
							]));
						}
					}

					validArsip = arsipListFetched.map((arsip: any) => {
						const baseKodeKlasifikasi = arsip.kode_klasifikasi ? arsip.kode_klasifikasi.split('/')[0] : '';
						const trimmedBaseKode = baseKodeKlasifikasi.trim();
						let klasifikasiData = klasifikasiMap.get(trimmedBaseKode);
						return {
							...arsip,
							retensi_data: klasifikasiData && typeof klasifikasiData.inaktif !== 'undefined' && typeof klasifikasiData.nasib_akhir !== 'undefined' ? {
								aktif: klasifikasiData.aktif,
								inaktif: klasifikasiData.inaktif,
								nasib_akhir: klasifikasiData.nasib_akhir,
								label: klasifikasiData.label
							} : null,
							is_retention_expired: false,
							lokasi_penyimpanan: {
								id_bidang_fkey: arsip.lokasi_penyimpanan?.id_bidang_fkey || "",
								no_filing_cabinet: arsip.lokasi_penyimpanan?.no_filing_cabinet || "",
								no_laci: arsip.lokasi_penyimpanan?.no_laci || "",
								no_folder: arsip.lokasi_penyimpanan?.no_folder || ""
							}
						} as ArsipAktif;
					});

					if (validArsip.length === 0) {
						// Semua arsip hilang, reset proses
						setSelectedArsip([]);
						setCurrentStep(1);
						setBeritaAcara({
							nomor_berita_acara: "",
							tanggal_berita_acara: getISODateString(new Date()),
							keterangan: "",
							dasar: "Jadwal Retensi Arsip (JRA) dan peraturan kearsipan yang berlaku"
						});
						setPemindahanInfo({
							lokasi_simpan: "",
							nomor_boks: "",
							jenis: "",
							jangka_simpan_inaktif: 0,
							nasib_akhir: "",
							kategori_arsip: "Arsip Konvensional",
							keterangan: ""
						});
						setApprovalStatus({
							kepala_bidang: {
								status: "Menunggu",
								verified_by: null,
								verified_at: null,
							},
							sekretaris: {
								status: "Menunggu",
								verified_by: null,
								verified_at: null,
							}
						});
						setProcessStatus({ status: 'idle' });
						toast.error('Data arsip yang dipilih sudah tidak tersedia. Proses diulang.');
						return;
					}

					if (missingArsipIds.length > 0) {
						// Ada arsip yang hilang, update proses di database
						await supabase
							.from('pemindahan_process')
							.update({ selected_arsip_ids: validArsip.map(a => a.id_arsip_aktif) })
							.eq('id', process.id);
						toast.warn('Beberapa arsip yang dipilih sudah tidak tersedia dan dihapus dari proses.');
					}
				}
				setSelectedArsip(validArsip);

				// Jika selectedArsip kosong, paksa ke step 1
				if (!validArsip || validArsip.length === 0) {
					setCurrentStep(1);
				} else {
					setCurrentStep(process.current_step);
				}

				// Set other process data with default values if null
				setBeritaAcara(process.berita_acara && typeof process.berita_acara === 'object' ? process.berita_acara : {
					nomor_berita_acara: "",
					tanggal_berita_acara: getISODateString(new Date()),
					keterangan: "",
					dasar: "Jadwal Retensi Arsip (JRA) dan peraturan kearsipan yang berlaku"
				});

				setPemindahanInfo(process.pemindahan_info && typeof process.pemindahan_info === 'object' ? { ...process.pemindahan_info, arsip_edits: process.pemindahan_info.arsip_edits || [] } : {
					lokasi_simpan: "",
					nomor_boks: "",
					jenis: "",
					jangka_simpan_inaktif: 0,
					nasib_akhir: "",
					kategori_arsip: "Arsip Konvensional",
					keterangan: "",
					arsip_edits: []
				});

				setApprovalStatus(process.approval_status || {
					kepala_bidang: {
						status: "Menunggu",
						verified_by: null,
						verified_at: null,
					},
					sekretaris: {
						status: "Menunggu",
						verified_by: null,
						verified_at: null,
					}
				});

				setProcessStatus(process.process_status || { status: 'idle' });
			} else {
				// Create new process with default values
				const { data: newProcess, error: createError } = await supabase
					.from('pemindahan_process')
					.insert({
						user_id: userId,
						current_step: 1,
						selected_arsip_ids: [],
						berita_acara: null,
						pemindahan_info: null,
						approval_status: {
							kepala_bidang: {
								status: "Menunggu",
								verified_by: null,
								verified_at: null,
							},
							sekretaris: {
								status: "Menunggu",
								verified_by: null,
								verified_at: null,
							}
						},
						process_status: { status: 'idle' },
						is_completed: false
					})
					.select()
					.single();

				if (createError) {
					console.error('Error creating process:', createError);
					return;
				}

				setProcessId(newProcess.id);
				setSelectedArsip([]);
			}
		} catch (error) {
			console.error('Error:', error);
		}
	};

	// Load process saat komponen mount
	useEffect(() => {
		loadExistingProcess();
	}, [userId]);

	// Update process di database
	const updateProcess = async () => {
		if (!processId) return;

		try {
			const updateData = {
				current_step: currentStep,
				selected_arsip_ids: selectedArsip.length > 0 ? selectedArsip.map(a => a.id_arsip_aktif) : [],
				berita_acara: Object.keys(beritaAcara).length > 0 ? beritaAcara : null,
				pemindahan_info: { ...pemindahanInfo, arsip_edits: pemindahanInfo.arsip_edits || [] },
				approval_status: approvalStatus,
				process_status: processStatus
			};

			const { error } = await supabase
				.from('pemindahan_process')
				.update(updateData)
				.eq('id', processId);

			if (error) {
				console.error('Error updating process:', error);
				throw error;
			}
		} catch (error) {
			console.error('Error updating process:', error);
		}
	};

	// Update setiap kali ada perubahan state
	useEffect(() => {
		updateProcess();
	}, [currentStep, selectedArsip, beritaAcara, pemindahanInfo, approvalStatus, processStatus]);

	const sendNotificationToApprover = async (
		userBidangId: number | null,
		beritaAcaraId: string,
		nomorBeritaAcara: string
	) => {
		try {
			// Kirim ke Kepala Bidang (pastikan userBidangId ada)
			if (userBidangId) {
				await sendDepartmentHeadNotification(
					userBidangId,
					"Permintaan Persetujuan Pemindahan Arsip",
					`Permintaan pemindahan arsip dengan nomor ${nomorBeritaAcara} memerlukan persetujuan Anda.`,
					`/arsip/pemindahan/verifikasi/kepala-bidang`,
					"pemindahan_arsip"
				);
			}
			// Kirim ke semua Sekretaris
			await sendRoleNotification(
				"Sekretaris",
				"Permintaan Persetujuan Pemindahan Arsip",
				`Permintaan pemindahan arsip dengan nomor ${nomorBeritaAcara} memerlukan persetujuan Anda.`,
				`/arsip/pemindahan/verifikasi/sekretaris`,
				"pemindahan_arsip"
			);
		} catch (error) {
			console.error("Error in sendNotificationToApprover:", error);
		}
	};

	// Modify handlePemindahanArsip to include notifications
	const handlePemindahanArsip = async () => {
		if (!userId || selectedArsip.length === 0) {
			toast.error("Data tidak lengkap untuk pemindahan arsip.");
			return;
		}

		try {
			setLoading(true);
			setProcessStatus({ status: 'processing' });

			// Update process status first to prevent duplicate clicks
			if (processId) {
				await supabase
					.from("pemindahan_process")
					.update({
						process_status: { status: 'processing' }
					})
					.eq("id", processId);
			}

			// Check if berita acara already exists
			const { data: existingBA, error: checkError } = await supabase
				.from("berita_acara_pemindahan")
				.select("id")
				.eq("nomor_berita_acara", beritaAcara.nomor_berita_acara)
				.maybeSingle();

			if (checkError) {
				throw checkError;
			}

			// If berita acara already exists and has created arsip inaktif, just navigate to step 5
			if (existingBA) {
				// Check if arsip inaktif already created
				const { data: existingArsipInaktif, error: checkArsipError } = await supabase
					.from("arsip_inaktif")
					.select("id_arsip_inaktif")
					.eq("id_berita_acara", existingBA.id)
					.limit(1);

				if (checkArsipError) {
					throw checkArsipError;
				}

				if (existingArsipInaktif && existingArsipInaktif.length > 0) {
					// Show success message and navigate to step 5
					toast.success("Arsip sudah berhasil dipindahkan sebelumnya.");
					setProcessStatus({ status: 'completed' });
					setCurrentStep(5);
					setLoading(false);
					return;
				}
			}

			// 1. Create berita acara pemindahan first if it doesn't exist yet
			let beritaAcaraId;

			if (!existingBA) {
				const beritaAcaraInsert = {
					nomor_berita_acara: beritaAcara.nomor_berita_acara,
					tanggal_berita_acara: beritaAcara.tanggal_berita_acara,
					keterangan: beritaAcara.keterangan,
					dasar: beritaAcara.dasar,
					user_id: userId,
					jumlah_arsip: selectedArsip.length,
					status: "Menunggu",
					// approval_status tidak lagi disimpan di berita_acara_pemindahan
				};

				const { data: beritaAcaraData, error: beritaAcaraError } = await supabase
					.from("berita_acara_pemindahan")
					.insert(beritaAcaraInsert)
					.select()
					.single();

				if (beritaAcaraError) {
					throw beritaAcaraError;
				}

				beritaAcaraId = beritaAcaraData.id;

				await sendNotificationToApprover(userBidangId, beritaAcaraId, beritaAcara.nomor_berita_acara);
			} else {
				beritaAcaraId = existingBA.id;
			}

			console.log("[PEMINDAHAN LOG] Creating new pemindahan record with approval_status:", {
				kepala_bidang: {
					status: "Menunggu",
					verified_by: null,
					verified_at: null,
				},
				sekretaris: {
					status: "Menunggu",
					verified_by: null,
					verified_at: null,
				}
			});

			// 2. Update process record
			const processData = {
				user_id: userId,
				current_step: currentStep,
				selected_arsip_ids: selectedArsip.map(arsip => arsip.id_arsip_aktif),
				berita_acara: beritaAcara,
				pemindahan_info: pemindahanInfo,
				approval_status: approvalStatus,
				process_status: { status: 'processing' },
				is_completed: false
			};

			console.log("[PEMINDAHAN LOG] Process data for update/insert:", {
				user_id: userId,
				current_step: currentStep,
				selected_arsip_count: selectedArsip.length,
				approval_status: approvalStatus
			});

			let process_id = processId;
			if (!process_id) {
				const { data: newProcess, error: processError } = await supabase
					.from("pemindahan_process")
					.insert(processData)
					.select("id")
					.single();

				if (processError) {
					console.error("[PEMINDAHAN LOG] Error inserting process record:", processError);
					throw processError;
				}
				process_id = newProcess.id;
				console.log("[PEMINDAHAN LOG] Created new process record:", newProcess.id);
				setProcessId(process_id);
			} else {
				const { error: updateError } = await supabase
					.from("pemindahan_process")
					.update(processData)
					.eq("id", process_id);

				if (updateError) {
					console.error("[PEMINDAHAN LOG] Error updating process record:", updateError);
					throw updateError;
				}
				console.log("[PEMINDAHAN LOG] Updated existing process record:", process_id);
			}

			// 3. Create arsip inaktif records
			const arsipEditsMap = Array.isArray(pemindahanInfo.arsip_edits)
				? Object.fromEntries(pemindahanInfo.arsip_edits.map(e => [e.id_arsip_aktif, e]))
				: {};
			
			const finalArsipInaktifData: any[] = [];

			// Sort all selectedArsip globally for consistent numbering
			const sortedSelectedArsip = [...selectedArsip].sort((a, b) => {
				const klasComparison = kodeKlasifikasiCompare(a.kode_klasifikasi, b.kode_klasifikasi);
				if (klasComparison !== 0) return klasComparison;

				if (a.kurun_waktu < b.kurun_waktu) return -1;
				if (a.kurun_waktu > b.kurun_waktu) return 1;
				
				// Compare nomor_berkas as numbers if they are numeric, otherwise as strings
				const numA = Number(a.nomor_berkas);
				const numB = Number(b.nomor_berkas);
				if (!isNaN(numA) && !isNaN(numB)) {
					if (numA < numB) return -1;
					if (numA > numB) return 1;
				} else {
					const nomorBerkasComparison = a.nomor_berkas.toString().localeCompare(b.nomor_berkas.toString());
					if (nomorBerkasComparison !== 0) return nomorBerkasComparison;
				}
				
				return a.id_arsip_aktif.localeCompare(b.id_arsip_aktif); // Final stable sort
			});

			sortedSelectedArsip.forEach((arsip, index) => {
				const newNomorBerkas = (index + 1).toString(); // New sequential nomor_berkas

				const klasData = arsip.retensi_data; // Bisa null
				const edit = arsipEditsMap[arsip.id_arsip_aktif] || {};

				// Prioritaskan nilai yang diedit user, fallback ke retensi_data
				const jenisArsip = edit.jenis_arsip_edited ?? (arsip as any).jenis_arsip_edited ?? klasData?.label ?? "";

				let masaRetensiInaktifVal: number | undefined = undefined;
				if (typeof edit.masa_retensi_inaktif_edited === 'number') {
					masaRetensiInaktifVal = edit.masa_retensi_inaktif_edited;
				} else if (typeof edit.masa_retensi_inaktif_edited === 'string' && edit.masa_retensi_inaktif_edited !== "") {
					masaRetensiInaktifVal = parseInt(edit.masa_retensi_inaktif_edited, 10);
					if (isNaN(masaRetensiInaktifVal)) masaRetensiInaktifVal = undefined;
				} else if (typeof (arsip as any).masa_retensi_inaktif_edited === 'number') { // Fallback ke field lama jika ada di state
					masaRetensiInaktifVal = (arsip as any).masa_retensi_inaktif_edited;
				} else if (typeof (arsip as any).masa_retensi_inaktif_edited === 'string' && (arsip as any).masa_retensi_inaktif_edited !== "") {
					masaRetensiInaktifVal = parseInt((arsip as any).masa_retensi_inaktif_edited, 10);
					if (isNaN(masaRetensiInaktifVal)) masaRetensiInaktifVal = undefined;
				} else if (typeof klasData?.inaktif === 'number') {
					masaRetensiInaktifVal = klasData.inaktif;
				}
				
				const nasibAkhir = edit.nasib_akhir_edited ?? (arsip as any).nasib_akhir_edited ?? klasData?.nasib_akhir ?? "";

				// Validasi penting
				if (!jenisArsip) {
					throw new Error(`Jenis arsip wajib diisi untuk arsip ID ${arsip.id_arsip_aktif} (Kode: ${arsip.kode_klasifikasi}, No. Berkas Asli: ${arsip.nomor_berkas}).`);
				}
				if (typeof masaRetensiInaktifVal === 'undefined' || masaRetensiInaktifVal < 0) {
					throw new Error(`Masa retensi inaktif wajib diisi dan valid untuk arsip ID ${arsip.id_arsip_aktif} (Kode: ${arsip.kode_klasifikasi}, No. Berkas Asli: ${arsip.nomor_berkas}).`);
				}
				if (!nasibAkhir) {
					throw new Error(`Nasib akhir wajib diisi untuk arsip ID ${arsip.id_arsip_aktif} (Kode: ${arsip.kode_klasifikasi}, No. Berkas Asli: ${arsip.nomor_berkas}).`);
				}

				// Hitung kurun_waktu_inaktif_mulai dan kurun_waktu_inaktif_berakhir
				let kurunWaktuInaktifMulaiStr: string | null = null;
				let kurunWaktuInaktifBerakhirStr: string | null = null;

				if (arsip.jangka_simpan && typeof masaRetensiInaktifVal === 'number' && masaRetensiInaktifVal >= 0) {
					const parts = arsip.jangka_simpan.split(" s.d. ");
					const endDateAktifStrDMY = parts.length > 1 ? parts[1] : parts[0];

					if (endDateAktifStrDMY) {
						const datePartsDMY = endDateAktifStrDMY.split("-");
						if (datePartsDMY.length === 3) {
							const yearAktifEnd = parseInt(datePartsDMY[2], 10);
							if (!isNaN(yearAktifEnd)) {
								const tahunMulaiInaktif = yearAktifEnd + 1;
								const tanggalMulaiInaktif = new Date(tahunMulaiInaktif, 0, 1);
								kurunWaktuInaktifMulaiStr = formatDate(tanggalMulaiInaktif); 

								const tahunBerakhirInaktif = tahunMulaiInaktif + masaRetensiInaktifVal - 1;
								const tanggalBerakhirInaktif = new Date(tahunBerakhirInaktif, 11, 31);
								kurunWaktuInaktifBerakhirStr = formatDate(tanggalBerakhirInaktif);
							}
						}
					}
				}

				let periodeInaktifDisplay = "-"; 
				const formattedMulaiInaktif = kurunWaktuInaktifMulaiStr;
				const formattedBerakhirInaktif = kurunWaktuInaktifBerakhirStr;

				if (formattedMulaiInaktif && formattedBerakhirInaktif) {
					periodeInaktifDisplay = `${formattedMulaiInaktif} s.d. ${formattedBerakhirInaktif}`;
				} else if (formattedMulaiInaktif) {
					periodeInaktifDisplay = formattedMulaiInaktif;
				}

				finalArsipInaktifData.push({
					nomor_berkas: newNomorBerkas, // Menggunakan nomor berkas baru
					kode_klasifikasi: arsip.kode_klasifikasi,
					jenis_arsip: jenisArsip,
					kurun_waktu: arsip.kurun_waktu,
					jangka_simpan: periodeInaktifDisplay,
					tingkat_perkembangan: arsip.tingkat_perkembangan,
					jumlah: arsip.jumlah,
					keterangan: arsip.keterangan,
					nomor_definitif_folder_dan_boks: pemindahanInfo.nomor_boks,
					lokasi_simpan: pemindahanInfo.lokasi_simpan,
					masa_retensi: masaRetensiInaktifVal,
					nasib_akhir: nasibAkhir,
					kategori_arsip: pemindahanInfo.kategori_arsip,
					id_arsip_aktif: arsip.id_arsip_aktif,
					tanggal_pindah: new Date().toISOString().split('T')[0],
					file_url: arsip.file_url,
					user_id: userId,
					status_persetujuan: "Menunggu",
					id_berita_acara: beritaAcaraId,
				});
			});

			const { data: newInactiveArsip, error: inaktifError } = await supabase
				.from("arsip_inaktif")
				.insert(finalArsipInaktifData) // Menggunakan data yang sudah diproses
				.select("*"); // Diubah sementara untuk debugging

			console.log("[PEMINDAHAN LOG] newInactiveArsip (raw from select '*'):", newInactiveArsip);

			if (inaktifError) throw inaktifError;
			if (!newInactiveArsip || newInactiveArsip.length === 0) {
				throw new Error("Gagal membuat arsip inaktif atau mengambil ID mereka.");
			}

			// 4. Create links in pemindahan_arsip_link table
			const pemindahanLinkData = newInactiveArsip.map(inaktif => ({
				id_arsip_aktif_fkey: inaktif.id_arsip_aktif, // This was part of arsipInaktifData and returned by select()
				id_arsip_inaktif_fkey: inaktif.id_arsip_inaktif,
				id_pemindahan_process_fkey: process_id // Ensured to be non-null earlier in the function
			}));

			const { error: linkError } = await supabase
				.from("pemindahan_arsip_link")
				.insert(pemindahanLinkData);

			if (linkError) {
				// Log error but don't necessarily stop the whole process if inactive archives were created.
				// The core transfer is done, but linking failed.
				console.error("Gagal membuat link pemindahan arsip:", linkError);
				toast.warn("Pemindahan arsip inti berhasil, namun gagal mencatat link pemindahan.");
				// Depending on business logic, you might want to throw linkError here or handle it differently.
			}

			// Update process status to completed
			const newProcessStatus: ProcessStatus = { status: 'completed' };
			setProcessStatus(newProcessStatus);

			// Update database with completed status
			await supabase
				.from("pemindahan_process")
				.update({
					process_status: newProcessStatus,
					is_completed: true,
					current_step: 5 // Set current step to 5 to ensure it moves forward
				})
				.eq("id", process_id);

			// Update status berita_acara_pemindahan menjadi "Selesai"
			if (beritaAcaraId) {
				await supabase
					.from("berita_acara_pemindahan")
					.update({ status: "Selesai" })
					.eq("id", beritaAcaraId);
			}

			toast.success("Proses pemindahan arsip berhasil!");
			setCurrentStep(5); // Move to success step
		} catch (error) {
			console.error("Error in handlePemindahanArsip:", error);
			toast.error("Gagal melakukan pemindahan arsip: " + (error as Error).message);
			const errorStatus: ProcessStatus = { status: 'error', message: (error as Error).message };
			setProcessStatus(errorStatus);
		} finally {
			setLoading(false);
		}
	};

	const handleReset = () => {
		setCurrentStep(1);
		setSelectedArsip([]);
		setBeritaAcara({
			nomor_berita_acara: "",
			tanggal_berita_acara: getISODateString(new Date()),
			keterangan: "",
			dasar: "Jadwal Retensi Arsip (JRA) dan peraturan kearsipan yang berlaku"
		});
		setPemindahanInfo({
			lokasi_simpan: "",
			nomor_boks: "",
			jenis: "",
			jangka_simpan_inaktif: 0,
			nasib_akhir: "",
			kategori_arsip: "Arsip Konvensional",
			keterangan: ""
		});
		setApprovalStatus({
			kepala_bidang: {
				status: "Menunggu",
				verified_by: null,
				verified_at: null,
			},
			sekretaris: {
				status: "Menunggu",
				verified_by: null,
				verified_at: null,
			}
		});
		setProcessStatus({ status: 'idle' });
	};

	// Fungsi untuk mereset proses
	const handleResetProcess = async () => {
		if (!processId || !userId) return;

		try {
			// Set process saat ini sebagai completed
			const { error: updateError } = await supabase
				.from('pemindahan_process')
				.update({ is_completed: true })
				.eq('id', processId);

			if (updateError) {
				console.error('Error completing current process:', updateError);
				toast.error('Gagal mereset proses pemindahan');
				return;
			}

			// Buat proses baru
			const { data: newProcess, error: createError } = await supabase
				.from('pemindahan_process')
				.insert({
					user_id: userId,
					current_step: 1,
					selected_arsip_ids: [],
					berita_acara: null,
					pemindahan_info: null,
					approval_status: { // Inisialisasi dengan struktur objek yang benar
						kepala_bidang: {
							status: "Menunggu",
							verified_by: null,
							verified_at: null,
						},
						sekretaris: {
							status: "Menunggu",
							verified_by: null,
							verified_at: null,
						}
					},
					process_status: { status: 'idle' },
					is_completed: false
				})
				.select()
				.single();

			if (createError) {
				console.error('Error creating new process:', createError);
				toast.error('Gagal membuat proses baru');
				return;
			}

			// Reset semua state ke nilai awal
			setProcessId(newProcess.id);
			setCurrentStep(1);
			setSelectedArsip([]);
			setBeritaAcara({
				nomor_berita_acara: "",
				tanggal_berita_acara: getISODateString(new Date()),
				keterangan: "",
				dasar: "Jadwal Retensi Arsip (JRA) dan peraturan kearsipan yang berlaku"
			});
			setPemindahanInfo({
				lokasi_simpan: "",
				nomor_boks: "",
				jenis: "",
				jangka_simpan_inaktif: 0,
				nasib_akhir: "",
				kategori_arsip: "Arsip Konvensional",
				keterangan: "",
				arsip_edits: []
			});
			setApprovalStatus({
				kepala_bidang: {
					status: "Menunggu",
					verified_by: null,
					verified_at: null,
				},
				sekretaris: {
					status: "Menunggu",
					verified_by: null,
					verified_at: null,
				}
			});
			setProcessStatus({ status: 'idle' });

			toast.success('Proses pemindahan berhasil direset');
		} catch (error) {
			console.error('Error resetting process:', error);
			toast.error('Terjadi kesalahan saat mereset proses');
		}
	};

	if (authLoading) {
		return <Loading />;
	}

	return (
		<div className="w-full h-full p-6"> {/* Consistent page padding */}
			<div className="max-w-7xl mx-auto w-full h-full flex flex-col"> {/* Content wrapper */}
				<div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col"> {/* Main content card */}
					{/* Header */}
					<div className="bg-primary/10 px-6 py-4"> {/* Adjusted header background */}
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-2xl font-bold flex items-center gap-2 text-primary"> {/* Adjusted title color */}
								<FolderOpen size={24} /> Pemindahan Arsip Aktif ke Inaktif
							</h2>
							<button
								onClick={() => {
									if (window.confirm('Apakah Anda yakin ingin mengulang proses dari awal? Semua data yang belum disimpan akan hilang.')) {
										handleResetProcess();
									}
								}}
								className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium"
							>
								<RefreshCw size={16} />
								Reset Proses
							</button>
						</div>
						<div className="mt-2 flex items-center">
							<div className="flex items-center">
								{[1, 2, 3, 4, 5].map((step) => (
									<div key={step} className="flex items-center">
										<div
											className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${currentStep === step
												? "bg-primary text-primary-foreground" // Active step
												: currentStep > step
													? "bg-green-500 text-white" // Completed step
													: "bg-primary/20 text-primary/70" // Inactive step
												}`}
										>
											{currentStep > step ? <CheckCircle2 size={18} /> : step}
										</div>
										{step < 5 && (
											<div className={`w-20 h-1 ${currentStep > step ? "bg-green-500" : "bg-primary/20" // Connector line color
												}`}></div>
										)}
									</div>
								))}
							</div>
							<div className="ml-4 text-muted-foreground text-sm"> {/* Adjusted step label color */}
								{currentStep === 1 && "Pilih Arsip"}
								{currentStep === 2 && "Berita Acara"}
								{currentStep === 3 && "Persetujuan"}
								{currentStep === 4 && "Informasi Pemindahan"}
								{currentStep === 5 && "Konfirmasi Selesai"}
							</div>
						</div>
					</div>

					{/* Content */}
					{currentStep === 1 && (
						<SelectArsip
							loading={loading}
							arsipList={filteredArsip}
							selectedArsip={selectedArsip}
							searchTerm={searchTerm}
							filterMode={filterMode}
							currentPage={currentPage}
							totalPages={totalPages}
							onSearch={handleSearch}
							onFilterChange={handleFilterChange}
							toggleSelectArsip={toggleSelectArsip}
							handlePrevPage={handlePrevPage}
							handleNextPage={handleNextPage}
							setSelectedArsip={setSelectedArsip}
							itemsPerPage={itemsPerPage} // Kirim prop itemsPerPage
						/>
					)}

					{currentStep === 2 && (
						<BeritaAcaraForm
							beritaAcara={beritaAcara}
							selectedArsipCount={selectedArsip.length}
							userBidangId={userBidangId || 0}
							onChange={handleBeritaAcaraChange}
						/>
					)}

					{currentStep === 3 && (
						<ApprovalStatus
							approvalStatus={approvalStatus}
							processStatus={processStatus}
							beritaAcara={beritaAcara}
							pemindahanInfo={pemindahanInfo}
							selectedArsipCount={selectedArsip.length}
						/>
					)}

					{currentStep === 4 && (
						<PemindahanForm
							selectedArsip={selectedArsip}
							pemindahanInfo={pemindahanInfo}
							onChangePemindahanInfo={handlePemindahanInfoChange}
							onArsipFieldChange={handleArsipFieldChange}
						/>
					)}

					{currentStep === 5 && (
						<SuccessConfirmation
							selectedArsipCount={selectedArsip.length}
							beritaAcara={beritaAcara}
							pemindahanInfo={pemindahanInfo}
							onReset={handleReset}
						/>
					)}

					{/* Navigation Buttons */}
					{currentStep < 5 && (
						<div className="flex justify-between items-center p-6 border-t border-border">
							{currentStep > 1 ? (
								<button
									onClick={handlePrevStep}
									disabled={loading}
									className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
								>
									<ChevronLeft size={18} />
									Kembali
								</button>
							) : (
								<div></div>
							)}
							<button
								onClick={handleNextStep}
								disabled={loading}
								className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
							>
								{currentStep === 4 && approvalStatus.kepala_bidang.status === "Disetujui" && approvalStatus.sekretaris.status === "Disetujui" ? (
									<>
										Proses Pemindahan
										<Save size={18} />
									</>
								) : (
									<>
										{currentStep === 3 ? "Lanjutkan" : currentStep === 4 ? "Lanjutkan" : "Lanjutkan"}
										<ArrowRight size={18} />
									</>
								)}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}