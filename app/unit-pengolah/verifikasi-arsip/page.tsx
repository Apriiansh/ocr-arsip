"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation"; // Ditambahkan karena digunakan di versi lengkap
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { sendUserNotification } from "@/utils/notificationService";
import { ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, Check, X, FileCheck, Box, Filter } from "lucide-react";

interface Arsip {
    id_arsip_aktif: string; // Primary Key
    nomor_berkas: number;
    kode_klasifikasi: string;
    uraian_informasi: string;
    jumlah: number;
    keterangan: string; // Sesuai skema: not null
    file_url: string | null;
    user_id: string | null; // Sesuai skema: nullable
    created_at: string | null; // Supabase returns ISO string
    tingkat_perkembangan: string | null;
    media_simpan: string | null;
    tanggal_mulai: string | null; // Supabase returns ISO string for date
    tanggal_berakhir: string | null; // Supabase returns ISO string for date
    masa_retensi: number | null;
    kurun_waktu: string | null; // Sesuai skema: text
    status_persetujuan: string;
    lokasi_penyimpanan: { // Objek untuk data lokasi dari join
        no_filing_cabinet: string | null;
        no_laci: string | null;
        no_folder: string | null;
    } | null;
}

// Loading Skeleton Component
const LoadingSkeleton = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="bg-primary/10 h-16 flex justify-between items-center px-6 py-4 rounded-lg">
                <div className="h-8 w-3/5 bg-primary/20 rounded-lg"></div>
                <div className="flex gap-2">
                    <div className="h-9 w-28 bg-primary/20 rounded-lg"></div>
                    <div className="h-9 w-28 bg-primary/20 rounded-lg"></div>
                </div>
            </div>

            {/* Filters Skeleton */}
            <div className="px-6 py-4 border-y border-border/50">
                <div className="flex gap-4">
                    <div className="h-10 w-2/3 bg-muted rounded-lg"></div>
                    <div className="h-10 w-1/3 bg-muted rounded-lg"></div>
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="px-6">
                <div className="bg-muted p-4">
                    <div className="h-8 w-full bg-muted-foreground/10 rounded"></div>
                </div>
            </div>
        </div>
    );
};

export default function VerifikasiArsip() {
    const supabase = createClient();
    const [arsipList, setArsipList] = useState<Arsip[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [dataLoading, setDataLoading] = useState(true); // Mengganti nama loading menjadi dataLoading
    // Menggunakan id_arsip_aktif (string) untuk selectedArsipIds
    const [selectedArsipIds, setSelectedArsipIds] = useState<string[]>([]);
    const [authLoading, setAuthLoading] = useState(true); // Loading untuk auth & role check
    const [userNamaBidang, setUserNamaBidang] = useState<string | null>(null); // String nama bidang
    const [userIdBidang, setUserIdBidang] = useState<number | null>(null); // ID bidang (integer)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [statusFilter, setStatusFilter] = useState("Menunggu"); // Default ke "Menunggu"

    const router = useRouter(); // Inisialisasi router

    const ITEMS_PER_PAGE = 10;
    const ALLOWED_ROLE = "Kepala_Bidang";
    const SIGN_IN_PATH = "/sign-in";
    const DEFAULT_HOME_PATH = "/";

    const fetchData = useCallback(async (idBidangKepala: number, page: number) => {
        console.log(`fetchData (verifikasi): Called with idBidangKepala: ${idBidangKepala}, page: ${page}`);
        if (!idBidangKepala) {
            console.log("fetchData (verifikasi): idBidangKepala is null, aborting.");
            setDataLoading(false);
            return;
        }
        setDataLoading(true);

        // Langkah 1: Dapatkan semua id_lokasi dari lokasi_penyimpanan yang id_bidang_fkey-nya adalah idBidangKepala
        console.log(`fetchData (verifikasi): Fetching lokasi_penyimpanan for id_bidang_fkey: ${idBidangKepala}`);
        const { data: lokasiDiBidang, error: lokasiError } = await supabase
            .from("lokasi_penyimpanan")
            .select("id_lokasi")
            .eq("id_bidang_fkey", idBidangKepala); // <-- Gunakan id_bidang_fkey

        if (lokasiError) {
            const message = lokasiError.message || "Gagal memuat data lokasi untuk bidang.";
            toast.error(message);
            console.error("Error fetching lokasi di bidang (verifikasi):", lokasiError.message || lokasiError);
            setDataLoading(false);
            setArsipList([]);
            setTotalPages(0);
            return;
        }
        console.log(`fetchData (verifikasi): Query result for lokasi_penyimpanan in id_bidang_fkey '${idBidangKepala}':`, lokasiDiBidang);

        const lokasiIdsDiBidang = lokasiDiBidang?.map(l => l.id_lokasi) || [];
        console.log(`fetchData (verifikasi): Extracted lokasiIdsDiBidang:`, lokasiIdsDiBidang);

        if (lokasiIdsDiBidang.length === 0) {
            console.warn(`fetchData (verifikasi): Tidak ada lokasi penyimpanan yang ditemukan untuk id_bidang_fkey ${idBidangKepala}. Tidak ada arsip yang akan diambil.`);
            setArsipList([]);
            setTotalPages(0);
            setDataLoading(false);
            return;
        }

        // Langkah 2: Ambil arsip berdasarkan lokasiIdsDiBidang
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE - 1;

        // Langkah Tambahan: Dapatkan ID arsip aktif yang sudah ada di pemindahan_arsip_link
        const { data: pemindahanLinks, error: pemindahanError } = await supabase
            .from('pemindahan_arsip_link')
            .select('id_arsip_aktif_fkey');

        if (pemindahanError) {
            toast.error("Gagal memuat data link pemindahan: " + pemindahanError.message);
            // Pertimbangkan apakah akan menghentikan proses atau melanjutkan tanpa filter ini
            // Untuk saat ini, kita lanjutkan saja, tapi log errornya.
            console.error("Error fetching pemindahan_arsip_link:", pemindahanError);
        }

        const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];
        
        let query = supabase
            .from("arsip_aktif")
            .select(`
                *, 
                id_arsip_aktif,
                lokasi_penyimpanan:id_lokasi_fkey (
                    no_filing_cabinet,
                    no_laci,
                    no_folder
                )
            `, { count: "exact" })
            .in("id_lokasi_fkey", lokasiIdsDiBidang); // Filter berdasarkan id_lokasi_fkey

        if (statusFilter !== "all") {
            query = query.eq("status_persetujuan", statusFilter);
        }

        if (idsToExclude.length > 0) {
            const idsToExcludeString = `(${idsToExclude.join(',')})`;
            query = query.not('id_arsip_aktif', 'in', idsToExcludeString);
        }
        
        query = query.order("nomor_berkas", { ascending: true }) // Atau created_at, tergantung kebutuhan
                     .range(startIndex, endIndex);
        
        const { data, error, count } = await query;
        
        console.log(`fetchData (verifikasi): arsip_aktif query (lokasiIds=${JSON.stringify(lokasiIdsDiBidang)}) - data:`, data, "count:", count, "error:", error);

        if (error) {
            const message = error.message || "Gagal memuat data arsip!";
            toast.error(message);
            console.error("Error fetching data (verifikasi):", error.message || error);
            setArsipList([]);
            setTotalPages(0);
        } else {
            setArsipList(data || []);
            setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
        }
        setDataLoading(false);
    }, [supabase, ITEMS_PER_PAGE, statusFilter]); // Tambahkan statusFilter

    useEffect(() => {
        const checkAuthAndFetchInitialData = async () => {
            setAuthLoading(true);
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) { // Jika tidak ada sesi
                console.log("checkAuthAndFetchInitialData: No session, redirecting to sign-in.");
                router.push(SIGN_IN_PATH);
                setAuthLoading(false); // Pastikan loading dihentikan
                return;
            }

            const userId = session.user.id;
            let userRole: string | null = null;
            let fetchedUserData: {
                role: string;
                id_bidang_fkey: number;
                daftar_bidang: { nama_bidang: string } | null; // Kembali ke objek tunggal atau null
            } | null = null; // Gunakan as unknown as saat set fetchedUserData jika perlu

            try {
                const { data: userData, error: userFetchError } = await supabase
                    .from("users")
                    .select("role, id_bidang_fkey, daftar_bidang:id_bidang_fkey ( nama_bidang )") // Ambil id_bidang_fkey dan join
                    .eq("user_id", userId)
                    .single();
                
                console.log(`checkAuthAndFetchInitialData: User data for ${userId}:`, userData, "Error:", userFetchError);

                if (userFetchError || !userData) {
                    toast.error("Gagal memverifikasi data pengguna.");
                    router.push(SIGN_IN_PATH);
                    setAuthLoading(false);
                    return;
                }
                
                // Periksa kelengkapan data dengan asumsi daftar_bidang adalah objek
                if (!userData.role ||
                    userData.id_bidang_fkey === null ||
                    !userData.daftar_bidang || // Pastikan objek daftar_bidang ada (tidak null)
                    typeof userData.daftar_bidang !== 'object' || // Pastikan itu objek
                    Array.isArray(userData.daftar_bidang) || // Pastikan itu BUKAN array
                    typeof (userData.daftar_bidang as { nama_bidang?: string }).nama_bidang !== 'string' // Akses aman ke nama_bidang
                ) {
                    toast.warn("Informasi peran atau bidang pengguna tidak lengkap.");
                    router.push(SIGN_IN_PATH); 
                    setAuthLoading(false);
                    return;
                }
                userRole = userData.role;
                fetchedUserData = userData as unknown as { role: string; id_bidang_fkey: number; daftar_bidang: { nama_bidang: string; } | null; };

            } catch (error: any) {
                toast.error("Terjadi kesalahan saat verifikasi peran.");
                router.push(SIGN_IN_PATH);
                setAuthLoading(false);
                return;
            }

            if (userRole !== ALLOWED_ROLE) {
                console.log(`Redirecting to HOME because userRole ('${userRole}') !== ALLOWED_ROLE ('${ALLOWED_ROLE}')`);
                toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini.");
                router.push(DEFAULT_HOME_PATH);
                setAuthLoading(false);
                return;
            }
            
            // Akses properti nama_bidang dari objek daftar_bidang
            if (fetchedUserData && fetchedUserData.daftar_bidang && typeof fetchedUserData.daftar_bidang.nama_bidang === 'string') {
                setUserNamaBidang(fetchedUserData.daftar_bidang.nama_bidang);
                setUserIdBidang(fetchedUserData.id_bidang_fkey);
                console.log(`checkAuthAndFetchInitialData: User Nama Bidang set to: ${fetchedUserData.daftar_bidang.nama_bidang}, ID Bidang: ${fetchedUserData.id_bidang_fkey}`);
            } else {
                toast.error("Gagal memproses data bidang pengguna setelah verifikasi.");
                router.push(SIGN_IN_PATH);
            }
            setAuthLoading(false); 
        };
        checkAuthAndFetchInitialData();
    }, [supabase, router, SIGN_IN_PATH, DEFAULT_HOME_PATH, ALLOWED_ROLE]); // Dependensi untuk useEffect otentikasi

    useEffect(() => {
        // Sekarang fetchData dipanggil dengan userIdBidang (integer)
        if (userIdBidang && !authLoading) { 
            console.log(`useEffect (data fetch trigger): Calling fetchData with userIdBidang: ${userIdBidang}, currentPage: ${currentPage}`);
            fetchData(userIdBidang, currentPage); 
        } else if (!authLoading && !userIdBidang) { // Jika auth selesai tapi tidak ada userIdBidang
            setDataLoading(false); // Hentikan loading data jika tidak ada ID bidang
            setArsipList([]);
            setTotalPages(0);
        }
    }, [userIdBidang, currentPage, fetchData, authLoading, statusFilter]); // Tambahkan statusFilter


    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }, []);

    // Client-side search after data is fetched (and server-side filtered by status)
    const filteredArsip = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return arsipList.filter(arsip =>
            searchTerm === "" ||
                (arsip.kode_klasifikasi?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (arsip.uraian_informasi?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [arsipList, searchTerm]);

    const updateStatus = async (status: string, arsipIds?: string[]) => {
        const idsToProcess = arsipIds ?? selectedArsipIds;
        if (idsToProcess.length === 0) {
            toast.warn("Pilih arsip terlebih dahulu!");
            return;
        }

        setDataLoading(true);
        // Get arsip data first to access user_id for notifications
        const { data: arsipToUpdate, error: fetchError } = await supabase
            .from("arsip_aktif")
            .select("id_arsip_aktif, uraian_informasi, kode_klasifikasi, user_id")
            .in("id_arsip_aktif", idsToProcess);

        if (fetchError || !arsipToUpdate || arsipToUpdate.length === 0) {
            toast.error("Gagal memuat data arsip untuk diupdate!");
            console.error("Error fetching arsip data:", fetchError);
            setDataLoading(false);
            return;
        }
        // Update status
        const { error } = await supabase
            .from("arsip_aktif")
            .update({ status_persetujuan: status })
            .in("id_arsip_aktif", idsToProcess);

        if (error) {
            toast.error("Gagal memperbarui status arsip!");
            console.error("Error updating status:", error);
            setDataLoading(false);
        } else {
            toast.success(`Berhasil ${status.toLowerCase()} ${idsToProcess.length} arsip!`);

            // Send notifications to users
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;

            // Notifikasi ke pemilik arsip
            for (const arsip of arsipToUpdate) {
                if (arsip.user_id && arsip.user_id !== currentUserId) {
                    const notificationTitle = `Status Arsip Aktif: ${status}`;
                    const notificationMessage = `Arsip "${arsip.uraian_informasi}" (${arsip.kode_klasifikasi}) telah ${status.toLowerCase()} oleh Kepala Bidang.`;
                    const link = `/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`;

                    await sendUserNotification(
                        arsip.user_id,
                        notificationTitle,
                        notificationMessage,
                        link,
                        "arsip aktif diverifikasi"
                    );
                }
            }

            if (userIdBidang) {
                fetchData(userIdBidang, currentPage);
            }
            setSelectedArsipIds([]);
        }
        // setDataLoading(false) akan di-handle oleh fetchData
    };

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

    if (authLoading) {
        return (
            <div className="w-full h-full p-6"> {/* Consistent page padding */}
                <div className="max-w-8xl mx-auto w-full h-full flex flex-col"> {/* Content wrapper */}
                    <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                        <LoadingSkeleton /> {/* LoadingSkeleton renders the inner parts of the card */}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-6"> {/* Consistent page padding */}
            <div className="max-w-8xl mx-auto w-full h-full flex flex-col"> {/* Content wrapper */}
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col"> {/* Main content card */}
                    {/* Header */}
                    <div className="bg-primary/10 px-6 py-4 flex justify-between items-center rounded-lg">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
                            <FileCheck size={24} /> Verifikasi Arsip Aktif
                        </h2>
                        {selectedArsipIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-4 py-2 bg-[hsl(var(--neon-green))] hover:bg-[hsl(var(--neon-green))]/90 text-black dark:text-background rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg hover:shadow-[hsl(var(--neon-green))]/30"
                                    onClick={() => updateStatus("Disetujui")}
                                    disabled={dataLoading || selectedArsipIds.length === 0}
                                >
                                    <CheckCircle2 size={18} />
                                    Setujui ({selectedArsipIds.length})
                                </button>
                                <button
                                    className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg hover:shadow-destructive/30"
                                    onClick={() => updateStatus("Ditolak")}                                    disabled={dataLoading || selectedArsipIds.length === 0}
                                >
                                    <XCircle size={18} />
                                    Tolak ({selectedArsipIds.length})
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="px-6 py-4 border-y border-border/50">
                        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="relative flex-1 min-w-[250px] md:w-auto">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari arsip berdasarkan kode klasifikasi atau uraian..."
                                        value={searchTerm}
                                        onChange={handleSearch}
                                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-colors duration-300"
                                    />
                                </div>
                                <div className="relative min-w-[180px]">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm transition-colors duration-300"
                                    >
                                        <option value="all">Semua Status</option>
                                        <option value="Menunggu">Menunggu</option>
                                        <option value="Disetujui">Disetujui</option>
                                        <option value="Ditolak">Ditolak</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="p-6 flex-grow flex flex-col overflow-auto">
                        {dataLoading ? (
                            <LoadingSkeleton />
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border">
                                {filteredArsip.length > 0 ? (
                                    <table className="min-w-full divide-y divide-border">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-center w-12">
                                                    <input
                                                        type="checkbox"
                                                        disabled={filteredArsip.length === 0}
                                                        checked={filteredArsip.length > 0 && selectedArsipIds.length === filteredArsip.length}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            if (checked) {
                                                                setSelectedArsipIds(filteredArsip.map(a => a.id_arsip_aktif));
                                                            } else {
                                                                setSelectedArsipIds([]);
                                                            }
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">No. Berkas</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kode</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uraian</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kurun Waktu</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tingkat Perk.</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Media</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lokasi</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                                {/* Kolom Aksi dihilangkan untuk konsistensi, aksi dilakukan via header */}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-card divide-y divide-border">
                                            {filteredArsip.map((arsip) => (
                                                <tr key={arsip.id_arsip_aktif} className="hover:bg-muted/30 transition-colors duration-150">
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedArsipIds.includes(arsip.id_arsip_aktif)}
                                                            onChange={(e) => {
                                                                const currentId = arsip.id_arsip_aktif;
                                                                if (e.target.checked) {
                                                                    setSelectedArsipIds(prev => [...prev, currentId]);
                                                                } else {
                                                                    setSelectedArsipIds(prev => prev.filter(id => id !== currentId));
                                                                }
                                                            }}
                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground">{arsip.nomor_berkas}</td>
                                                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap text-foreground">{arsip.kode_klasifikasi}</td>
                                                    <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate" title={arsip.uraian_informasi}>{arsip.uraian_informasi}</td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground">{arsip.kurun_waktu || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.jumlah || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.tingkat_perkembangan || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.media_simpan || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap text-foreground">
                                                        {`${arsip.lokasi_penyimpanan?.no_filing_cabinet || '-'}/` +
                                                         `${arsip.lokasi_penyimpanan?.no_laci || '-'}/` +
                                                         `${arsip.lokasi_penyimpanan?.no_folder || '-'}`}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold leading-none ${
                                                            arsip.status_persetujuan === "Disetujui"
                                                                ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400"
                                                                : arsip.status_persetujuan === "Ditolak"
                                                                ? "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-400"
                                                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/20 dark:text-yellow-400"
                                                        }`}>
                                                            {arsip.status_persetujuan}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-16 text-muted-foreground">
                                        <Box className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
                                        <p className="text-xl font-semibold">Tidak Ada Arsip</p>
                                        <p className="text-sm">Tidak ada arsip yang cocok dengan filter atau pencarian Anda.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-auto p-6 pt-0"> {/* Added mt-auto, adjusted padding */}
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1 || dataLoading}
                                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg transition-colors flex items-center gap-2 hover:bg-muted/80 disabled:opacity-50"
                                >
                                    <ChevronLeft size={16} /> Sebelumnya
                                </button>
                                <span className="text-sm text-muted-foreground">
                                    Halaman {currentPage} dari {totalPages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages || dataLoading}
                                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg transition-colors flex items-center gap-2 hover:bg-muted/80 disabled:opacity-50"
                                >
                                    Selanjutnya <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}