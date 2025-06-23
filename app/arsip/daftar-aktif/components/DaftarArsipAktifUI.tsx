"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Trash2, Eye, FileText, FolderOpen, Filter, Archive, FileSpreadsheet, ListChecks } from "lucide-react";
import Loading from "../loading";
import { ArsipRow, IsiBerkasRow, ViewMode } from "../useDaftarArsipAktif";

interface LokasiPenyimpanan {
    id_bidang_fkey: number;
    no_filing_cabinet?: string | null;
    no_laci: string | null;
    no_folder: string | null;
}

function getLokasiObj(lokasi: ArsipRow["lokasi_penyimpanan"]): LokasiPenyimpanan | null {
    if (!lokasi) return null;
    if (Array.isArray(lokasi)) return lokasi[0] || null;
    return lokasi;
}

type DaftarArsipAktifUIProps = {
    arsipList: ArsipRow[];
    isiBerkasList: IsiBerkasRow[];
    searchTerm: string;
    dataLoading: boolean;
    isAuthLoading: boolean;
    authError: string | null;
    currentPage: number;
    totalPages: number;
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    isReordering: boolean;
    isExporting: boolean;
    statusFilterAktif: string;
    viewMode: ViewMode;
    filteredArsip: ArsipRow[];
    filteredIsiBerkas: IsiBerkasRow[];
    handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDelete: (id: string, type: 'berkas' | 'isiBerkas') => void;
    handleNextPage: () => void;
    handlePrevPage: () => void;
    handleSortRequest: (key: string) => void;
    handleExportExcel: () => void;
    handleReorderAndSaveNomorBerkas: () => void;
    handleReorderAndSaveNomorItem: () => void; // Add the new handler
    handleViewModeChange: (newMode: ViewMode) => void;
    setStatusFilterAktif: (value: string) => void;
    setCurrentPage: (page: number) => void;
};

export function DaftarArsipAktifUI({
    arsipList,
    isiBerkasList,
    searchTerm,
    dataLoading,
    isAuthLoading,
    authError,
    currentPage,
    totalPages,
    sortConfig,
    isReordering,
    isExporting,
    statusFilterAktif,
    viewMode,
    filteredArsip,
    filteredIsiBerkas,
    handleSearch,
    handleDelete,
    handleNextPage,
    handlePrevPage,
    handleSortRequest,
    handleExportExcel,
    handleReorderAndSaveNomorBerkas,
    handleReorderAndSaveNomorItem, // Destructure the new handler
    handleViewModeChange,
    setStatusFilterAktif,
    setCurrentPage,
}: DaftarArsipAktifUIProps) {

    const getSortIndicator = (key: string) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' ? '↑' : '↓';
        }
        return <span className="opacity-0 group-hover:opacity-50 transition-opacity">↕</span>;
    };

    if (isAuthLoading || dataLoading) {
        return <Loading />;
    }

    if (authError) {
        return <div className="flex items-center justify-center h-full text-red-500">Error Autentikasi: {authError}</div>;
    }

    return (
        <div className="w-full h-full p-6">
            <div className="max-w-10xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col"> {/* Main content card */}
                    {/* Header */}
                    <div className="bg-primary/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-lg">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <FolderOpen size={24} /> Daftar Arsip Aktif
                        </h2>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center sm:justify-end items-center">
                            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
                                <button
                                    onClick={() => handleViewModeChange("berkas")}
                                    disabled={dataLoading}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out flex items-center gap-1
                            ${viewMode === 'berkas' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
                                >
                                    <FolderOpen size={14} /> Berkas
                                </button>
                                <button
                                    onClick={() => handleViewModeChange("isiBerkas")}
                                    disabled={dataLoading}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out flex items-center gap-1
                            ${viewMode === 'isiBerkas' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
                                >
                                    <ListChecks size={14} /> Isi Berkas
                                </button>
                            </div>
                            <button
                                onClick={handleExportExcel}
                                disabled={isExporting || dataLoading || isAuthLoading || (viewMode === 'berkas' && filteredArsip.length === 0) || (viewMode === 'isiBerkas' && filteredIsiBerkas.length === 0)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 border border-green-600 text-green-600 rounded-lg text-xs font-medium hover:bg-green-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Export data yang ditampilkan ke Excel"
                            >
                                <FileSpreadsheet size={18} />
                                {isExporting ? "Mengekspor..." : "Export Excel"}
                            </button>
                            <Link
                                href="/arsip/visual-filing-cabinet"
                                className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/10 transition-colors duration-200"
                                title="Lihat visualisasi filing cabinet"
                            >
                                <Archive size={18} />
                                Visualisasi Filing
                            </Link>
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="p-6 border-b border-border/50">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Search size={20} className="text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                placeholder={viewMode === 'berkas' ? "Cari kode klasifikasi atau uraian berkas..." : "Cari nomor item, kode, atau uraian isi..."}
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300"
                            />
                        </div>
                    </div>

                    {/* Action Buttons Section */}
                    <div className="px-6 py-3 border-b border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 w-full">
                        {/* Left Side: Filter or empty div for spacing */}
                        <div className="w-full md:w-auto">
                            {viewMode === 'berkas' && (
                                <div className="relative min-w-[180px]">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                    <select
                                        value={statusFilterAktif}
                                        onChange={(e) => {
                                            setStatusFilterAktif(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm transition-colors duration-300"
                                    >
                                        <option value="Semua">Semua Status</option>
                                        <option value="Menunggu">Menunggu Persetujuan</option>
                                        <option value="Disetujui">Disetujui</option>
                                        <option value="Ditolak">Ditolak</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Reorder Buttons */}
                        <div className="w-full md:w-auto flex justify-end">
                            {viewMode === 'berkas' && (
                                <button
                                    onClick={handleReorderAndSaveNomorBerkas}
                                    disabled={isReordering || dataLoading || isAuthLoading || arsipList.length === 0}
                                    className="px-4 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm font-medium"
                                >
                                    {isReordering ? "Menyimpan..." : `Tata Ulang Berkas`}
                                </button>
                            )}
                            {viewMode === 'isiBerkas' && (
                                <button
                                    onClick={handleReorderAndSaveNomorItem}
                                    disabled={isReordering || dataLoading || isAuthLoading || filteredIsiBerkas.length === 0}
                                    className="px-4 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm font-medium"
                                >
                                    {isReordering ? "Menyimpan..." : `Tata Ulang Item`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="p-6 flex-grow flex flex-col overflow-auto">
                        {(viewMode === 'berkas' && filteredArsip.length > 0) || (viewMode === 'isiBerkas' && filteredIsiBerkas.length > 0) ? (
                            <table className="min-w-full divide-y divide-border rounded-lg overflow-hidden">
                                <thead>
                                    <tr className="bg-muted text-muted-foreground">
                                        {viewMode === 'berkas' ? (
                                            <>
                                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group" onClick={() => handleSortRequest('nomor_berkas')}>
                                                    No. Berkas <span className="ml-1">{getSortIndicator('nomor_berkas')}</span>
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group" onClick={() => handleSortRequest('kode_klasifikasi')}>
                                                    Kode Klasifikasi<span className="ml-1">{getSortIndicator('kode_klasifikasi')}</span>
                                                </th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">No. Berkas</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group" onClick={() => handleSortRequest('nomor_item')}>
                                                    No. Item <span className="ml-1">{getSortIndicator('nomor_item')}</span>
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group" onClick={() => handleSortRequest('kode_klasifikasi')}>
                                                    Kode Klasifikasi <span className="ml-1">{getSortIndicator('kode_klasifikasi')}</span>
                                                </th>
                                            </>
                                        )}
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Uraian Informasi</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Kurun Waktu</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Jumlah</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Tingkat Perkembangan</th>
                                        {viewMode === 'berkas' && <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Lokasi</th>}
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Jangka Simpan</th>
                                        {viewMode === 'berkas' && <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Akses</th>}
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Keterangan</th>
                                        {viewMode === 'berkas' && <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>}
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {viewMode === 'berkas' && filteredArsip.map((arsip) => (
                                        <tr key={arsip.id_arsip_aktif} className="hover:bg-muted transition-colors duration-150">
                                            <td className="px-4 py-3 text-sm text-center">{arsip.nomor_berkas}</td>
                                            <td className="px-4 py-3 text-sm text-center">{arsip.kode_klasifikasi}</td>
                                            <td className="px-4 py-3 text-sm text-justify max-w-xs truncate" title={arsip.uraian_informasi}>{arsip.uraian_informasi}</td>
                                            <td className="px-4 py-3 text-sm text-center">{arsip.kurun_waktu || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-center">{arsip.jumlah || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-center">{arsip.tingkat_perkembangan || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-center">
                                                {getLokasiObj(arsip.lokasi_penyimpanan)
                                                    ? `${getLokasiObj(arsip.lokasi_penyimpanan)?.no_filing_cabinet || '-'} / ${getLokasiObj(arsip.lokasi_penyimpanan)?.no_laci || '-'} / ${getLokasiObj(arsip.lokasi_penyimpanan)?.no_folder || '-'}`
                                                    : '- / - / -'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center max-w-xs truncate" title={arsip.jangka_simpan || undefined}>{arsip.jangka_simpan || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-center">{arsip.akses || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-center max-w-xs truncate" title={arsip.keterangan || undefined}>{arsip.keterangan || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${arsip.status_persetujuan === "Disetujui" ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400"
                                                        : arsip.status_persetujuan === "Ditolak" ? "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-400"
                                                            : arsip.status_persetujuan === "Menunggu" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/20 dark:text-yellow-400"
                                                                : "bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-400"
                                                    }`}>
                                                    {arsip.status_persetujuan || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                                                <Link href={`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`} passHref>
                                                    <button
                                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out"
                                                        title="Lihat Detail"
                                                        aria-label="Lihat Detail Arsip"
                                                    >
                                                        <Eye size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(arsip.id_arsip_aktif, 'berkas')}
                                                    className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-destructive group ml-2 transition-all duration-150 ease-in-out"
                                                    title="Hapus Arsip"
                                                    aria-label="Hapus Arsip"
                                                >
                                                    <Trash2 size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {viewMode === 'isiBerkas' && filteredIsiBerkas.map((item) => (
                                        <tr key={item.id_isi_arsip} className="hover:bg-muted transition-colors duration-150">
                                            <td className="px-4 py-3 text-sm text-center" title={item.berkas_arsip_aktif?.uraian_informasi}>
                                                {item.berkas_arsip_aktif?.nomor_berkas || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center">{item.nomor_item}</td>
                                            <td className="px-4 py-3 text-sm text-center">{item.kode_klasifikasi}</td>
                                            <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={item.uraian_informasi}>{item.uraian_informasi}</td>
                                            <td className="px-4 py-3 text-sm text-center">{item.kurun_waktu || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-center">{item.jumlah || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-center">{item.tingkat_perkembangan || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={item.jangka_simpan || undefined}>{item.jangka_simpan || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={item.keterangan || undefined}>{item.keterangan || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                                                <Link href={`/arsip/arsip-aktif/detail-item/${item.id_isi_arsip}`} passHref>
                                                    <button
                                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out"
                                                        title="Lihat Detail Item"
                                                        aria-label="Lihat Detail Item Isi Arsip"
                                                    >
                                                        <Eye size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(item.id_isi_arsip, 'isiBerkas')}
                                                    className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-destructive group ml-2 transition-all duration-150 ease-in-out"
                                                    title="Hapus Item Isi Arsip"
                                                    aria-label="Hapus Item Isi Arsip"
                                                >
                                                    <Trash2 size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-16 bg-muted/50 rounded-lg flex-grow flex flex-col justify-center items-center">
                                <FileText size={48} className="mx-auto text-muted-foreground" />
                                <p className="mt-2 text-lg text-muted-foreground">Tidak ada arsip ditemukan.</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center p-4 border-t border-border/50 mt-auto">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1 || dataLoading}
                                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <ChevronLeft size={16} />
                                Sebelumnya
                            </button>
                            <span className="text-sm text-muted-foreground">
                                Halaman {currentPage} dari {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages || dataLoading}
                                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                Selanjutnya
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}