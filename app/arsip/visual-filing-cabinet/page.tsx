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
import { useAuth } from "@/context/AuthContext"; // Impor useAuth
import { toast } from 'react-toastify';
import Loading from './loading';

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

// Tambahkan interface untuk isi berkas
interface IsiBerkasArsip {
  id_isi_arsip: string;
  id_berkas_induk_fkey: string;
  nomor_item: string;
  kode_klasifikasi: string;
  uraian_informasi: string;
  kurun_waktu: string | null;
  jumlah: number | null;
  keterangan: string | null;
  jangka_simpan: string | null;
  tingkat_perkembangan: string | null;
  media_simpan: string | null;
  file_url: string | null;
}

export default function VisualisasiFiling() {
  const supabase = createClient();
  const router = useRouter();
  
  const [visualizationData, setVisualizationData] = useState<VisualizationData>({});
  const { user, isLoading: isAuthLoading, error: authError } = useAuth(); // Gunakan useAuth
  const [userBidangId, setUserBidangId] = useState<number | null>(null);
  const [userBidangNama, setUserBidangNama] = useState<string>("");
  const [expandedCabinets, setExpandedCabinets] = useState<Set<string>>(new Set());
  const [expandedLaci, setExpandedLaci] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isiBerkasList, setIsiBerkasList] = useState<IsiBerkasArsip[]>([]);

  const ALLOWED_ROLE = "Pegawai";
  const SIGN_IN_PATH = "/sign-in";
  const DEFAULT_HOME_PATH = "/"; 
  const [dataLoading, setDataLoading] = useState(true);

  // Auth check
  useEffect(() => {
    const fetchData = async () => {
      // Jika AuthContext masih loading, tunggu
      if (isAuthLoading) return;

      // Jika ada error dari AuthContext, tampilkan dan jangan lanjutkan
      if (authError) {
        toast.error(`Error Autentikasi: ${authError}`);
        return;
      }

      // Jika tidak ada user setelah AuthContext selesai loading, redirect (AuthContext seharusnya sudah melakukan ini)
      if (!user) {
        return;
      }

      // Verifikasi role pengguna dan kelengkapan data bidang
      if (user.role !== ALLOWED_ROLE || !user.id_bidang_fkey) {
        toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini atau data bidang tidak lengkap.");
        router.push(DEFAULT_HOME_PATH);
        return;
      }

      setUserBidangId(user.id_bidang_fkey);
      setUserBidangNama(user.daftar_bidang?.nama_bidang || "");
    };
    fetchData();
  }, [user, isAuthLoading, authError, router]);

  // Fetch visualization data
  const fetchVisualizationData = useCallback(async () => {
    if (userBidangId === null) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    
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
        setDataLoading(false);
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
    
    setDataLoading(false);
  }, [userBidangId, supabase]);

  // Fetch isi berkas arsip aktif
  const fetchIsiBerkas = useCallback(async (arsipAktifIds: string[]) => {
    if (!arsipAktifIds.length) {
      setIsiBerkasList([]);
      return;
    }
    const { data, error } = await supabase
      .from('isi_berkas_arsip')
      .select('*')
      .in('id_berkas_induk_fkey', arsipAktifIds);
    if (error) {
      toast.error('Gagal memuat isi berkas arsip: ' + error.message);
      setIsiBerkasList([]);
      return;
    }
    setIsiBerkasList(data || []);
  }, [supabase]);

  useEffect(() => {
    if (userBidangId !== null) {
      fetchVisualizationData();
    }
  }, [userBidangId, fetchVisualizationData]);

  // Fetch isi berkas setelah visualizationData berubah
  useEffect(() => {
    // Kumpulkan semua id_arsip_aktif dari visualizationData
    const allArsipAktifIds: string[] = [];
    Object.values(visualizationData).forEach(cabinet => {
      Object.values(cabinet.laci).forEach(laci => {
        Object.values(laci.folders).forEach(folder => {
          folder.arsip_list.forEach(arsip => {
            if (arsip.id_arsip_aktif) allArsipAktifIds.push(arsip.id_arsip_aktif);
          });
        });
      });
    });
    fetchIsiBerkas(allArsipAktifIds);
  }, [visualizationData, fetchIsiBerkas]);

  // Helper untuk ambil isi berkas per folder
  const getIsiBerkasForBerkas = useCallback((id_arsip_aktif: string) => {
    return isiBerkasList
      .filter(isi => isi.id_berkas_induk_fkey === id_arsip_aktif)
      .sort((a, b) => a.nomor_item.localeCompare(b.nomor_item));
  }, [isiBerkasList]);

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

  if (isAuthLoading || dataLoading) {
    return <Loading />; 
  }

  return (
    <div className="bg-background py-8 px-4">
      <div className="max-w-[1600px] mx-auto bg-card text-card-foreground rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-6 py-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Archive size={24} />
            Visualisasi Filing Cabinet - {userBidangNama}
          </h2>
        </div>

        {/* Visualization Content */}
        <div className="p-6 border-t border-border">
          <div className="max-w-[900px] mx-auto">
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
                          .sort((a, b) => Number(a[0]) - Number(b[0]))
                          .map(([folderNo, folder]) => {
                            const folderKey = `${cabinetNo}-${laciNo}-${folderNo}`;
                            const isFolderOpen = expandedFolders.has(folderKey);
                            
                            // Urutkan arsip berdasarkan nomor_berkas (number)
                            const sortedArsip = [...folder.arsip_list].sort((a, b) => a.nomor_berkas - b.nomor_berkas);
                            
                            // Ambil data folderName sesuai permintaan
                            const folderBerkas = sortedArsip[0];
                            let folderName = `Folder ${folderNo}`;
                            if (folderBerkas) {
                              let uraian = folderBerkas.uraian_informasi;
                              if (uraian.length > 30) uraian = uraian.substring(0, 30) + '...';
                              folderName = `${folderBerkas.nomor_berkas} - ${folderBerkas.kode_klasifikasi} - ${uraian}`;
                            }
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
                                  {/* Folder name as a link to arsip/detail/id */}
                                  {folderBerkas ? (
                                    <span className="font-medium text-primary hover:underline cursor-pointer" onClick={e => { e.stopPropagation(); router.push(`/arsip/detail/${folderBerkas.id_arsip_aktif}`); }}>
                                      {folderName}
                                    </span>
                                  ) : (
                                    <span className="font-medium">{folderName}</span>
                                  )}
                                  <span className="flex-1" />
                                  <span className="ml-2 text-xs text-muted-foreground text-right min-w-[70px]">{folderBerkas ? `${folderBerkas.jumlah || 0} Berkas` : '0 Berkas'}</span>
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
                                    folderBerkas ? (
                                      <div className="flex flex-col gap-1">
                                        {/* Render isi berkas arsip */}
                                        {getIsiBerkasForBerkas(folderBerkas.id_arsip_aktif).length > 0 ? (
                                          getIsiBerkasForBerkas(folderBerkas.id_arsip_aktif).map((isi) => (
                                            <div
                                              key={isi.id_isi_arsip}
                                              className="flex items-center gap-2 py-1 px-2 hover:bg-muted/20 rounded transition text-xs cursor-pointer"
                                              onClick={() => router.push(`/arsip/detail-item/${isi.id_isi_arsip}`)}
                                            >
                                              <FileText size={12} className="text-green-600 flex-shrink-0" />
                                              <span className="font-mono w-[40px] text-right">{isi.nomor_item}</span>
                                              <span className="truncate max-w-[180px]">{isi.uraian_informasi}</span>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-xs text-muted-foreground">Tidak ada isi berkas</div>
                                        )}
                                      </div>
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