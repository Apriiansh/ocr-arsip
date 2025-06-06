"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FolderOpen, 
  Archive, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Eye,
  Layers,
  Box
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';

interface ArsipData {
  id_arsip_aktif: string;
  nomor_berkas: number;
  kode_klasifikasi: string;
  uraian_informasi: string;
  status_persetujuan: string;
  kurun_waktu: string | null;
  jumlah: number | null;
}

interface FolderData {
  no_folder: string;
  arsip_count: number;
  arsip_list: ArsipData[];
}

interface LaciData {
  no_laci: string;
  folder_count: number;
  folders: { [key: string]: FolderData };
}

interface FilingCabinetData {
  no_filing_cabinet: string;
  laci_count: number;
  laci: { [key: string]: LaciData };
}

interface VisualizationData {
  [key: string]: FilingCabinetData;
}

// Tambahkan interface untuk hasil relasi
interface UserData {
  role: string;
  id_bidang_fkey: number;
  daftar_bidang?: { nama_bidang: string } | { nama_bidang: string }[];
}

export default function VisualisasiFiling() {
  const supabase = createClient();
  const router = useRouter();
  
  const [visualizationData, setVisualizationData] = useState<VisualizationData>({});
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [userBidangId, setUserBidangId] = useState<number | null>(null);
  const [userBidangNama, setUserBidangNama] = useState<string>("");
  const [expandedCabinets, setExpandedCabinets] = useState<Set<string>>(new Set());
  const [expandedLaci, setExpandedLaci] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const ALLOWED_ROLE = "Pegawai";
  const SIGN_IN_PATH = "/sign-in";
  const DEFAULT_HOME_PATH = "/";

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push(SIGN_IN_PATH);
        setAuthLoading(false);
        return;
      }

      const userId = session.user.id;
      
      try {
        const { data: userData, error: userFetchError } = await supabase
          .from("users")
          .select(`
            role, 
            id_bidang_fkey,
            daftar_bidang (
              nama_bidang
            )
          `)
          .eq("user_id", userId)
          .single<UserData>(); // <-- tambahkan tipe di sini

        if (userFetchError || !userData || !userData.role || userData.id_bidang_fkey === null) {
          toast.warn("Data pengguna tidak lengkap. Silakan login kembali.");
          router.push(SIGN_IN_PATH);
          setAuthLoading(false);
          return;
        }

        if (userData.role !== ALLOWED_ROLE) {
          toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini.");
          router.push(DEFAULT_HOME_PATH);
          setAuthLoading(false);
          return;
        }

        setUserBidangId(userData.id_bidang_fkey);
        setUserBidangNama(
          Array.isArray(userData.daftar_bidang)
            ? userData.daftar_bidang[0]?.nama_bidang || ""
            : userData.daftar_bidang?.nama_bidang || ""
        );
      } catch (error: any) {
        toast.error("Terjadi kesalahan saat verifikasi: " + error.message);
        router.push(SIGN_IN_PATH);
        setAuthLoading(false);
        return;
      }
      
      setAuthLoading(false);
    };

    checkAuth();
  }, [router, supabase]);

  // Fetch visualization data
  const fetchVisualizationData = useCallback(async () => {
    if (userBidangId === null) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // Fetch lokasi penyimpanan dengan arsip untuk bidang pengguna
      let query = supabase
        .from("lokasi_penyimpanan")
        .select(`
          no_filing_cabinet,
          no_laci,
          no_folder,
          arsip_aktif (
            id_arsip_aktif,
            nomor_berkas,
            kode_klasifikasi,
            uraian_informasi,
            status_persetujuan,
            kurun_waktu,
            jumlah
          )
        `)
        .eq('id_bidang_fkey', userBidangId);

      const { data: lokasiData, error } = await query;

      if (error) {
        toast.error("Gagal memuat data visualisasi: " + error.message);
        setVisualizationData({});
        setLoading(false);
        return;
      }

      // Process data menjadi struktur hierarkis
      const processedData: VisualizationData = {};

      // Kumpulkan semua ID arsip aktif dari lokasiData untuk pengecekan pemindahan
      const allArsipAktifIds: string[] = [];
      lokasiData?.forEach(lokasi => {
        lokasi.arsip_aktif?.forEach((arsip: any) => {
          if (arsip && arsip.id_arsip_aktif) {
            allArsipAktifIds.push(arsip.id_arsip_aktif);
          }
        });
      });

      let movedArsipIds = new Set<string>();
      if (allArsipAktifIds.length > 0) {
        const { data: pemindahanLinks, error: pemindahanError } = await supabase
          .from('pemindahan_arsip_link')
          .select('id_arsip_aktif_fkey')
          .in('id_arsip_aktif_fkey', allArsipAktifIds);

        if (pemindahanError) {
          toast.error("Gagal memuat data link pemindahan: " + pemindahanError.message);
          // Pertimbangkan bagaimana menangani error ini, mungkin lanjutkan tanpa filter pemindahan
        } else if (pemindahanLinks) {
          pemindahanLinks.forEach(link => {
            if (link.id_arsip_aktif_fkey) {
              movedArsipIds.add(link.id_arsip_aktif_fkey);
            }
          });
        }
      }

      lokasiData?.forEach((lokasi) => {
        const { no_filing_cabinet, no_laci, no_folder, arsip_aktif } = lokasi;
        
        // 1. Filter arsip yang sudah dipindahkan
        const availableArsip = (arsip_aktif || []).filter(
          (arsip: any) => arsip && !movedArsipIds.has(arsip.id_arsip_aktif)
        );
        // Arsip yang tersedia (tidak dipindahkan)
        const arsipForFolder = availableArsip;

        // Initialize filing cabinet jika belum ada
        if (!processedData[no_filing_cabinet]) {
          processedData[no_filing_cabinet] = {
            no_filing_cabinet,
            laci_count: 0,
            laci: {}
          };
        }

        // Initialize laci jika belum ada
        if (!processedData[no_filing_cabinet].laci[no_laci]) {
          processedData[no_filing_cabinet].laci[no_laci] = {
            no_laci,
            folder_count: 0,
            folders: {}
          };
          processedData[no_filing_cabinet].laci_count++;
        }

        // Initialize folder jika belum ada
        if (!processedData[no_filing_cabinet].laci[no_laci].folders[no_folder]) {
          processedData[no_filing_cabinet].laci[no_laci].folders[no_folder] = {
            no_folder,
            arsip_count: 0,
            arsip_list: []
          };
          processedData[no_filing_cabinet].laci[no_laci].folder_count++;
        }

        // Add arsip to folder
        processedData[no_filing_cabinet].laci[no_laci].folders[no_folder].arsip_list = arsipForFolder;
        processedData[no_filing_cabinet].laci[no_laci].folders[no_folder].arsip_count = arsipForFolder.length;
      });

      setVisualizationData(processedData);
    } catch (error: any) {
      toast.error("Terjadi kesalahan tak terduga: " + error.message);
      setVisualizationData({});
    }
    
    setLoading(false);
  }, [userBidangId, supabase]);

  useEffect(() => {
    if (userBidangId !== null) {
      fetchVisualizationData();
    }
  }, [userBidangId, fetchVisualizationData]);

  // Toggle expand functions
  const toggleCabinet = (cabinetNo: string) => {
    const newExpanded = new Set(expandedCabinets);
    if (newExpanded.has(cabinetNo)) {
      newExpanded.delete(cabinetNo);
    } else {
      newExpanded.add(cabinetNo);
    }
    setExpandedCabinets(newExpanded);
  };

  const toggleLaci = (laciKey: string) => {
    const newExpanded = new Set(expandedLaci);
    if (newExpanded.has(laciKey)) {
      newExpanded.delete(laciKey);
    } else {
      newExpanded.add(laciKey);
    }
    setExpandedLaci(newExpanded);
  };

  const toggleFolder = (folderKey: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderKey)) {
      newExpanded.delete(folderKey);
    } else {
      newExpanded.add(folderKey);
    }
    setExpandedFolders(newExpanded);
  };

  if (authLoading || loading) {
    // Jika loading.tsx ada, ini tidak akan ditampilkan pada initial load.
    // Ini akan berguna untuk re-fetch.
    return null; 
  }

  return (
    <div className="bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto bg-card text-card-foreground rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-6 py-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Archive size={24} />
            Visualisasi Filing Cabinet - {userBidangNama}
          </h2>
        </div>

        {/* Visualization Content */}
        <div className="p-6 border-t border-border">
          <div className="max-w-md mx-auto">
            <div className="bg-gray-400 rounded-lg shadow-lg p-2 flex flex-col gap-2 border-4 border-gray-600 relative">
              {/* Lemari atas */}
              <div className="absolute -top-3 left-0 right-0 h-3 bg-gray-600 rounded-t-lg"></div>
              {/* 4 Laci */}
              {[1, 2, 3, 4].map((laciIdx) => {
                const laciNo = laciIdx.toString();
                // Cari data laci dari visualizationData
                let laciData: LaciData | undefined;
                let cabinetNo = "";
                Object.entries(visualizationData).forEach(([cabNo, cabinet]) => {
                  if (cabinet.laci[laciNo]) {
                    laciData = cabinet.laci[laciNo];
                    cabinetNo = cabNo;
                  }
                });
                const laciKey = `maincabinet-${laciNo}`;
                const isOpen = expandedLaci.has(laciKey);

                return (
                  <div
                    key={laciKey}
                    className={`bg-gradient-to-b from-gray-200 to-gray-300 border-2 border-gray-500 rounded-md mb-2 shadow-inner transition-all duration-300 overflow-hidden`}
                    style={{
                      boxShadow: isOpen
                        ? "0 8px 24px 0 rgba(0,0,0,0.10)"
                        : "0 2px 8px 0 rgba(0,0,0,0.06)",
                      transform: isOpen ? "translateY(2px) scale(1.01)" : "none",
                    }}
                  >
                    {/* Laci Handle */}
                    <div
                      className="flex items-center justify-between px-6 py-3 cursor-pointer bg-gray-300 hover:bg-gray-400 transition font-semibold text-lg"
                      onClick={() => {
                        const newSet = new Set(expandedLaci);
                        if (isOpen) newSet.delete(laciKey);
                        else newSet.add(laciKey);
                        setExpandedLaci(newSet);
                      }}
                      style={{
                        borderBottom: isOpen ? "2px solid #888" : "none",
                        borderRadius: isOpen ? "12px 12px 0 0" : "12px",
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {isOpen ? <ChevronDown /> : <ChevronRight />}
                        <Layers size={20} className="text-secondary-foreground" />
                        Laci {laciNo}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {laciData ? laciData.folder_count : 0} Folder
                      </span>
                    </div>
                    {/* Isi Laci */}
                    <div
                      className={`transition-all duration-300 bg-white`}
                      style={{
                        maxHeight: isOpen ? 400 : 0,
                        opacity: isOpen ? 1 : 0,
                        padding: isOpen ? "16px" : "0 16px",
                        overflow: "auto",
                      }}
                    >
                      {isOpen && laciData ? (
                        // Folder diurutkan berdasarkan kode klasifikasi (no_folder)
                        Object.entries(laciData.folders)
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([folderNo, folder]) => {
                            const folderKey = `${cabinetNo}-${laciNo}-${folderNo}`;
                            const isFolderOpen = expandedFolders.has(folderKey);
                            return (
                              <div key={folderNo} className="mb-3 border-b pb-2 last:border-b-0 last:pb-0">
                                <div
                                  className="flex items-center gap-2 mb-1 cursor-pointer select-none"
                                  onClick={() => {
                                    const newSet = new Set(expandedFolders);
                                    if (isFolderOpen) newSet.delete(folderKey);
                                    else newSet.add(folderKey);
                                    setExpandedFolders(newSet);
                                  }}
                                >
                                  {isFolderOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  <FolderOpen size={16} className="text-yellow-600" />
                                  <span className="font-medium">Folder {folderNo}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">{folder.arsip_count} Arsip</span>
                                </div>
                                <div
                                  className="ml-6 transition-all duration-300"
                                  style={{
                                    maxHeight: isFolderOpen ? 500 : 0,
                                    opacity: isFolderOpen ? 1 : 0,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {isFolderOpen && (
                                    folder.arsip_list.length > 0 ? (
                                      folder.arsip_list.map((arsip) => (
                                        <div
                                          key={arsip.id_arsip_aktif}
                                          className="flex items-center justify-between gap-2 py-1 px-2 hover:bg-muted/20 rounded transition"
                                          style={{ minWidth: 0 }}
                                        >
                                          <div className="flex items-center gap-2 min-w-0 w-full">
                                            <FileText size={14} className="text-blue-600 flex-shrink-0" />
                                            <span className="text-xs font-medium flex-shrink-0 w-[60px] text-right">[{arsip.nomor_berkas}]</span>
                                            <span className="text-xs font-medium flex-shrink-0 w-[80px] truncate">{arsip.kode_klasifikasi}</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">{arsip.uraian_informasi}</span>
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <span
                                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                arsip.status_persetujuan === "Disetujui"
                                                  ? "bg-green-100 text-green-700"
                                                  : arsip.status_persetujuan === "Ditolak"
                                                  ? "bg-red-100 text-red-700"
                                                  : arsip.status_persetujuan === "Menunggu"
                                                  ? "bg-yellow-100 text-yellow-700"
                                                  : "bg-gray-100 text-gray-700"
                                              }`}
                                            >
                                              {arsip.status_persetujuan || "N/A"}
                                            </span>
                                            <button
                                              onClick={() => router.push(`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`)}
                                              className="p-1 rounded text-blue-600 hover:bg-blue-50 transition"
                                              title="Lihat Detail"
                                            >
                                              <Eye size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-xs text-muted-foreground">Folder kosong</div>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-center text-xs text-muted-foreground">Tidak ada folder</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Lemari bawah */}
              <div className="absolute -bottom-3 left-0 right-0 h-3 bg-gray-600 rounded-b-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}