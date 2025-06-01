import { Search, FileText, CheckSquare, Square, Info, Filter, Check, X } from "lucide-react";
import { ArsipAktif } from "../types";
import { differenceInDays } from "date-fns";

interface SelectArsipProps {
  loading: boolean;
  arsipList: ArsipAktif[];
  selectedArsip: ArsipAktif[];
  searchTerm: string;
  filterMode: string;
  currentPage: number;
  totalPages: number;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (mode: 'all' | 'expired' | 'selected') => void;
  toggleSelectArsip: (arsip: ArsipAktif) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  setSelectedArsip: React.Dispatch<React.SetStateAction<ArsipAktif[]>>;
  itemsPerPage: number; 
}

export function SelectArsip({
  loading,
  arsipList,
  selectedArsip,
  searchTerm,
  filterMode,
  currentPage,
  totalPages,
  onSearch,
  onFilterChange,
  toggleSelectArsip,
  handlePrevPage,
  handleNextPage,
  setSelectedArsip,
  itemsPerPage 
}: SelectArsipProps) {

  // Fungsi untuk mengecek apakah semua arsip di halaman ini terpilih
  const isAllCurrentPageSelected = () => {
    if (arsipList.length === 0) return false;
    return arsipList.every(arsip =>
      (Array.isArray(selectedArsip) ? selectedArsip : []).some(selected => selected.id_arsip_aktif === arsip.id_arsip_aktif)
    );
  };

  // Fungsi untuk toggle select all di halaman saat ini
  const toggleSelectAll = () => {
    if (isAllCurrentPageSelected()) {
      // Unselect semua arsip di halaman ini
      const currentPageIds = arsipList.map(arsip => arsip.id_arsip_aktif);
      setSelectedArsip((Array.isArray(selectedArsip) ? selectedArsip : []).filter(arsip =>
        !currentPageIds.includes(arsip.id_arsip_aktif)
      ));
    } else {
      // Select semua arsip di halaman ini yang belum diselect
      const newSelectedArsip = [...(Array.isArray(selectedArsip) ? selectedArsip : [])];
      arsipList.forEach(arsip => {
        if (!newSelectedArsip.some(selected => selected.id_arsip_aktif === arsip.id_arsip_aktif)) {
          newSelectedArsip.push(arsip);
        }
      });
      setSelectedArsip(newSelectedArsip);
    }
  };

  const sortedArsipList = [...arsipList].sort((a, b) => {
    const numA = Number(a.nomor_berkas);
    const numB = Number(b.nomor_berkas);
    return numA - numB;
  });

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-primary">Pilih Arsip untuk Dipindahkan</h3>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Cari arsip..."
              value={searchTerm}
              onChange={onSearch}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-colors duration-300"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${filterMode === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            <Filter size={16} /> Semua
          </button>
          <button
            onClick={() => onFilterChange('expired')} 
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${filterMode === 'expired'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            <X size={16} /> Kadaluarsa
          </button>
          <button
            onClick={() => onFilterChange('selected')} 
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${filterMode === 'selected'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            <Check size={16} /> Terpilih ({selectedArsip.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-x-auto"> {/* Changed to rounded-lg and added overflow-x-auto */}
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected()}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-input"
                  />
                  <span className="ml-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pilih Semua</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[7%]">No. Berkas</th> 
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[15%]">Kode Klasifikasi</th> 
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[30%]">Uraian Informasi</th> 
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[18%]">Kurun Waktu</th> 
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider w-[10%]">Jumlah</th> 
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[20%]">Lokasi</th> 
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[15%]">Jatuh Tempo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-muted-foreground">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : sortedArsipList.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  Tidak ada arsip yang ditemukan.
                </td>
              </tr>
            ) : (
              sortedArsipList.map((arsip, index) => (
                <tr key={arsip.id_arsip_aktif} className={`border-t border-border hover:bg-muted/20 transition-colors duration-150 ${(Array.isArray(selectedArsip) ? selectedArsip : []).some(selected => selected.id_arsip_aktif === arsip.id_arsip_aktif) ? 'bg-primary/10' : 'bg-card'}`}>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={(Array.isArray(selectedArsip) ? selectedArsip : []).some(selected => selected.id_arsip_aktif === arsip.id_arsip_aktif)}
                      onChange={() => toggleSelectArsip(arsip)} 
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-input"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.nomor_berkas}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{arsip.kode_klasifikasi}</td>
                  <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate" title={arsip.uraian_informasi}>{arsip.uraian_informasi}</td>
                  {/* Menampilkan jangka_simpan (periode aktif) */}
                  <td className="px-4 py-3 text-sm text-foreground">{arsip.jangka_simpan || '-'}</td>
                  <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.jumlah}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{arsip.lokasi_penyimpanan
                    ? [
                      arsip.lokasi_penyimpanan.no_filing_cabinet,
                      arsip.lokasi_penyimpanan.no_laci,
                      arsip.lokasi_penyimpanan.no_folder
                    ].filter(Boolean).join(" / ")
                    : "-"}</td>
                  <td className="px-4 py-3 text-center">
                    {(() => { // Jatuh Tempo / Countdown
                      let countdownInfo: React.ReactNode = "-";
                      if (arsip.jangka_simpan) {
                        const parts = arsip.jangka_simpan.split(" s.d. ");
                        const endDateStringDMY = parts.length > 1 ? parts[1] : parts[0]; // Format DD-MM-YYYY

                        if (endDateStringDMY) {
                          const dateParts = endDateStringDMY.split("-");
                          if (dateParts.length === 3) {
                            const day = parseInt(dateParts[0], 10);
                            const month = parseInt(dateParts[1], 10) - 1; // JS month is 0-indexed
                            const year = parseInt(dateParts[2], 10);

                            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                              const tanggalAkhir = new Date(year, month, day);
                              tanggalAkhir.setHours(23, 59, 59, 999); // Set ke akhir hari

                              if (!isNaN(tanggalAkhir.getTime())) {
                                const today = new Date();
                                const selisihHari = differenceInDays(tanggalAkhir, today);

                                if (selisihHari < 0) {
                                  countdownInfo = (
                                    <span className="text-red-500 dark:text-red-400 text-xs font-medium">
                                      Lewat {Math.abs(selisihHari)} hari
                                    </span>
                                  );
                                } else {
                                  countdownInfo = (
                                    <span className="text-orange-500 dark:text-orange-400 text-xs font-medium">
                                      {selisihHari} hari lagi
                                    </span>
                                  );
                                }
                              }
                            }
                          }
                        }
                      }
                      return countdownInfo;
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-2"> 
        <div className="text-sm text-muted-foreground">
          {/* Menampilkan {arsipList.length} dari total {totalPages * itemsPerPage} arsip */}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Sebelumnya
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
}