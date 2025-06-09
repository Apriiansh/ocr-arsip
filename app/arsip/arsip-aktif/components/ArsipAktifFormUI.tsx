"use client";
import { FileText, FolderOpen, Save, ScanSearch, RefreshCcw } from "lucide-react";
import React, { useState, useEffect } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"; // Untuk tipe router

interface FormDataState {
  nomor_berkas: number; // Ditambahkan dan disesuaikan menjadi number
  file_url: string | null; // Ditambahkan agar sesuai dengan state di hook
  kode_klasifikasi: string;
  uraian_informasi: string;
  tanggal_penciptaan_mulai: string;
  tanggal_penciptaan_berakhir: string;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  masa_retensi: string;
  kurun_waktu: string;
  jangka_simpan: string; // Tambahkan ini agar sesuai dengan state di hook
  jumlah: string;
  keterangan: string;
  tingkat_perkembangan: string;
  media_simpan: string;
}

interface CalculatedLocationState {
  no_filing_cabinet: string;
  no_laci: string;
  no_folder: string;
}

interface KlasifikasiItem {
  kode_klasifikasi: string;
  label: string;
}

interface ArsipAktifFormUIProps {
  editId: string | null;
  formData: FormDataState;
  pdfFile: File | null;
  pdfPreviewUrl: string | null;
  ocrLoading: boolean;
  submitting: boolean;
  klasifikasiList: KlasifikasiItem[];
  selectedKodeDasar: string;
  kodeTambahan: string;
  calculatedLocation: CalculatedLocationState;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleKodeDasarChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleKodeTambahanChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExtractPdf: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancelSubmit: () => void; 
  router: AppRouterInstance; // Menggunakan tipe yang lebih spesifik
  handleRefreshDraft?: () => void; // Tambahkan opsional jika ingin lewat props
  kodeKlasifikasiMode: 'otomatis' | 'manual';
  setKodeKlasifikasiMode: (mode: 'otomatis' | 'manual') => void;
}

export default function ArsipAktifFormUI({
  editId,
  formData,
  pdfFile,
  pdfPreviewUrl,
  ocrLoading,
  submitting,
  klasifikasiList,
  selectedKodeDasar,
  kodeTambahan,
  calculatedLocation,
  handleChange,
  handleKodeDasarChange,
  handleKodeTambahanChange,
  handlePdfUpload,
  handleExtractPdf,
  handleSubmit,
  handleCancelSubmit,
  router,
  handleRefreshDraft,
  kodeKlasifikasiMode,
  setKodeKlasifikasiMode,
}: ArsipAktifFormUIProps) {
  // State untuk menampilkan preview PDF
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  
  // Debugging useEffect untuk no_folder dan kode klasifikasi terkait
  useEffect(() => {
    const currentFullKlasifikasi =
      kodeKlasifikasiMode === "manual"
        ? formData.kode_klasifikasi
        : selectedKodeDasar && kodeTambahan
        ? `${selectedKodeDasar}${kodeTambahan}`
        : selectedKodeDasar || kodeTambahan || "";

    console.log(
      `[DEBUG ArsipAktifFormUI] Perubahan Terdeteksi:
      --------------------------------------------------
      - Mode Kode Klasifikasi: ${kodeKlasifikasiMode}
      - Kode Klasifikasi (input aktual): ${currentFullKlasifikasi}
      - formData.kode_klasifikasi (manual): ${formData.kode_klasifikasi}
      - Selected Kode Dasar (otomatis): ${selectedKodeDasar}
      - Kode Tambahan (otomatis): ${kodeTambahan}
      - Calculated No. Folder: ${calculatedLocation.no_folder}
      - Full Calculated Location:`, calculatedLocation,
      `\n--------------------------------------------------`
    );
  }, [
    formData.kode_klasifikasi, selectedKodeDasar, kodeTambahan, calculatedLocation.no_folder, kodeKlasifikasiMode, calculatedLocation
  ]);

  // Dapatkan nama file PDF yang diupload
  const pdfFileName = pdfFile ? pdfFile.name : "Tidak ada file dipilih";

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto card-neon rounded-2xl overflow-hidden"> {/* Menggunakan card-neon */}
        <div className="bg-primary py-6 px-8 flex items-center justify-between rounded-lg">
          <h2 className="text-3xl font-bold text-primary-foreground flex items-center gap-2">
            <FolderOpen size={36} /> {editId ? "Edit Arsip Aktif" : "Tambah Arsip Aktif"}
          </h2>
          {/* Tombol Refresh Draft */}
          {handleRefreshDraft && <button
            type="button"
            onClick={handleRefreshDraft}
            className="flex items-center gap-2 border border-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/80 hover:text-primary-foreground transition-colors duration-200"
            title="Muat ulang draft terakhir"
          >
            <RefreshCcw size={18} /> Refresh Draft
          </button>
        }
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {/* Bagian Unggah Dokumen & Preview - Paling Atas, Lebar Penuh */}
          <div className="mb-8">
            <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md"> {/* Inner card style */}
              {/* <div className="bg-accent/20 p-5 rounded-xl border border-accent/30"> */}
                <h3 className="text-lg font-semibold text-accent-foreground mb-4">Unggah Dokumen</h3>
                <div> {/* Menghapus mb-4, spasi diatur oleh mt-4 pada blok preview di bawah jika ada */}
                  <label htmlFor="pdfUploadInput" className="block text-foreground font-medium mb-2">
                    Upload File PDF
                  </label>
                  <input
                    id="pdfUploadInput"
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                    disabled={submitting}
                  />
                </div>
                {pdfFile && ( 
                  <div className="mt-4 flex flex-col items-center bg-background p-4 rounded-lg border border-border"> {/* Latar belakang berbeda untuk preview */}
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center gap-2">
                        <FileText size={24} className="text-muted-foreground" />
                        <span className="font-medium text-sm truncate max-w-[200px]">{pdfFileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPdfPreview(!showPdfPreview)}
                        className="text-sm text-primary hover:text-primary/80"
                      >
                        {showPdfPreview ? "Tutup Preview" : "Lihat PDF"}
                      </button>
                    </div>
                    
                    {showPdfPreview && pdfPreviewUrl && (
                      <div className="w-full mb-4 border border-border rounded-lg overflow-hidden">
                        <iframe
                          src={pdfPreviewUrl}
                          className="w-full h-64"
                          title="PDF Preview"
                        />
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={handleExtractPdf}
                      disabled={ocrLoading || submitting}
                      className="mt-2 bg-secondary text-secondary-foreground py-2 px-5 rounded-lg hover:bg-secondary/80 transition font-medium flex items-center gap-2 disabled:bg-muted"
                    >
                      {ocrLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-secondary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <ScanSearch size={18} /> Ekstrak Data
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Kolom Kiri */}
            <div className="space-y-6">
              
              {/* Add this as the first field in the left column */}
              <div>
                <label htmlFor="nomorBerkasInput" className="block text-foreground font-medium mb-2">Nomor Berkas</label>
                <input
                  type="number"
                  id="nomorBerkasInput"
                  name="nomor_berkas"
                  value={formData.nomor_berkas}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  placeholder="Nomor berkas auto-generated"
                  required
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nomor berkas otomatis berdasarkan jumlah arsip di bidang Anda.
                </p>
              </div>

              {/* Kode Klasifikasi Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-foreground font-medium" id="kodeKlasifikasiLabel">Kode Klasifikasi</label> {/* ID untuk aria-labelledby jika diperlukan untuk grup */}
                  {/* Modern Switch Button Group */}
                  <div className="flex items-center rounded-lg bg-muted p-0.5">
                    <button
                      type="button"
                      onClick={() => setKodeKlasifikasiMode('otomatis')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out
                                  ${kodeKlasifikasiMode === 'otomatis' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
                    >
                      Otomatis
                    </button>
                    <button
                      type="button"
                      onClick={() => setKodeKlasifikasiMode('manual')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out
                                  ${kodeKlasifikasiMode === 'manual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {kodeKlasifikasiMode === 'otomatis' ? (
                  <>
                    <select
                      id="selectedKodeDasarInput"
                      value={selectedKodeDasar}
                      aria-labelledby="kodeKlasifikasiLabel"
                      onChange={handleKodeDasarChange}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                      required
                      disabled={submitting}
                    >
                      <option value="">Pilih Kode Klasifikasi Dasar</option>
                      {klasifikasiList.map((item) => (
                        <option key={item.kode_klasifikasi} value={item.kode_klasifikasi}>
                          {item.kode_klasifikasi} - {item.label}
                        </option>
                      ))}
                    </select>
                    <input
                      id="kodeTambahanInput"
                      type="text"
                      aria-label="Kode Klasifikasi Tambahan"
                      value={kodeTambahan}
                      onChange={handleKodeTambahanChange}
                      placeholder="Tambahan Kode (Contoh: Dis.Kearsipan-IV/2025)" // Adjusted placeholder
                      className="mt-2 w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                      disabled={submitting}
                    />
                  </>
                ) : (
                  <input
                    id="kodeKlasifikasiManualInput"
                    type="text"
                    aria-labelledby="kodeKlasifikasiLabel"
                    name="kode_klasifikasi"
                    value={formData.kode_klasifikasi}
                    onChange={handleChange}
                      placeholder="Contoh: 045Dis.Kearsipan-IV/2025" // Adjusted placeholder
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                    required
                    disabled={submitting}
                  />
                )}
              </div>

              <div>
                <label htmlFor="uraianInformasiInput" className="block text-foreground font-medium mb-2">Uraian Informasi</label>
                <textarea
                  id="uraianInformasiInput"
                  name="uraian_informasi"
                  value={formData.uraian_informasi}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground h-32"
                  placeholder="Deskripsi arsip..."
                  required
                  disabled={submitting}
                />
              </div>
              <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Kurun Waktu Penciptaan Arsip</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tanggalPenciptaanMulaiInput" className="block text-foreground font-medium mb-2">Kurun Waktu Mulai</label>
                    <input id="tanggalPenciptaanMulaiInput" type="date" name="tanggal_penciptaan_mulai" value={formData.tanggal_penciptaan_mulai} onChange={handleChange} className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground" required disabled={submitting} />
                  </div>
                  <div>
                    <label htmlFor="tanggalPenciptaanBerakhirInput" className="block text-foreground font-medium mb-2">Kurun Waktu Selesai</label>
                    <input id="tanggalPenciptaanBerakhirInput" type="date" name="tanggal_penciptaan_berakhir" value={formData.tanggal_penciptaan_berakhir} onChange={handleChange} className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground" disabled={submitting} />
                  </div>
                </div>
              </div>
              {/* Jangka Waktu Aktif Arsip - KEMBALI KE KIRI */}
              <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md"> 
                <h3 className="text-lg font-semibold text-foreground mb-4">Jangka Waktu Aktif Arsip</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="masaRetensiInput" className="block text-foreground font-medium mb-2">Retensi Aktif (Tahun)</label>
                    <input 
                      id="masaRetensiInput"
                      type="number" 
                      name="masa_retensi" 
                      value={formData.masa_retensi} 
                      onChange={handleChange} 
                      min="0"
                      className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground" 
                      placeholder="Contoh: 1, 2, 5" 
                      required 
                      disabled={submitting} 
                      title={
                        kodeKlasifikasiMode === 'otomatis' && selectedKodeDasar 
                          ? `Disarankan dari kode ${selectedKodeDasar}, bisa diubah manual` 
                          : "Masukkan masa retensi aktif (dalam tahun)"
                      } 
                    />
                  </div>
                  <div>
                    <label htmlFor="jangkaSimpanInput" className="block text-foreground font-medium mb-2">Jangka Simpan</label>
                    <input id="jangkaSimpanInput" type="text" name="jangka_simpan" value={formData.jangka_simpan} className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-muted text-muted-foreground" disabled title="Otomatis berdasarkan Tanggal Mulai dan Berakhir Jangka Aktif" />
                  </div>
                </div>
              </div>
              
            </div>

            {/* Kolom Kanan */}
            <div className="space-y-6">
              {/* Kurun Waktu Penciptaan Arsip - DIPINDAHKAN KE KANAN */}
              
              <div>
                <label htmlFor="keteranganInput" className="block text-foreground font-medium mb-2">Keterangan</label>
                <input
                  id="keteranganInput"
                  name="keterangan" value={formData.keterangan} onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  required disabled={submitting} />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-2">Tingkat Perkembangan</label>
                <input name="tingkat_perkembangan" value={formData.tingkat_perkembangan} onChange={handleChange} className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground" required disabled={submitting} />
              </div>

              <div>
                <label htmlFor="mediaSimpanInput" className="block text-foreground font-medium mb-2">Media Simpan</label>
                <select id="mediaSimpanInput" name="media_simpan" value={formData.media_simpan} onChange={handleChange} className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground" required disabled={submitting}>
                  <option value="">Pilih Media Penyimpanan</option>
                  <option value="Filing Cabinet">Filing Cabinet</option>
                  <option value="Digital">Srikandi</option>
                </select>
               </div>

              <div>
                <label htmlFor="jumlahInput" className="block text-foreground font-medium mb-2">Jumlah</label>
                <input id="jumlahInput" type="number" name="jumlah" value={formData.jumlah} onChange={handleChange} className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground" placeholder="Jumlah arsip" required disabled={submitting} />
              </div>

              <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md"> {/* Inner card style */}
                <h3 className="text-lg font-semibold text-foreground mb-4">Lokasi Penyimpanan</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col"> {/* Menggunakan flex-col untuk kontrol tinggi */}
                    <label htmlFor="noFilingCabinetInput" className="text-foreground font-medium mb-2 h-10 flex items-center">No. F. Cabinet</label> {/* Diperpendek & tinggi konsisten */}
                    <input id="noFilingCabinetInput" type="text" name="no_filing_cabinet" value={calculatedLocation.no_filing_cabinet} className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground" placeholder="Otomatis" readOnly disabled={submitting} title="Otomatis berdasarkan bidang pengguna" />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="noLaciInput" className="text-foreground font-medium mb-2 h-10 flex items-center">No. Laci</label> {/* Tinggi konsisten */}
                    <input id="noLaciInput" type="text" name="no_laci" value={calculatedLocation.no_laci} className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground" placeholder="Otomatis" readOnly disabled={submitting} title="Otomatis berdasarkan ketersediaan laci" />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="noFolderInput" className="text-foreground font-medium mb-2 h-10 flex items-center">No. Folder</label> {/* Tinggi konsisten */}
                    <input id="noFolderInput" type="text" name="no_folder" value={calculatedLocation.no_folder} className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground" placeholder="Otomatis" readOnly disabled={submitting} title="Otomatis berdasarkan kode klasifikasi" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-10 flex justify-end space-x-3"> {/* Menambah margin atas dan spasi antar tombol */}
            {!submitting ? (
              <button
                type="button"
                onClick={() => router.back()}
                className="mr-4 bg-muted text-muted-foreground py-3 px-6 rounded-lg hover:bg-muted/80 transition font-medium"
              >
                Batal
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelSubmit}
                className="bg-destructive text-destructive-foreground py-3 px-6 rounded-lg hover:bg-destructive/90 transition-colors font-medium"
              >
                Batalkan Proses
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={18} /> {editId ? "Simpan Perubahan" : "Simpan Arsip"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}