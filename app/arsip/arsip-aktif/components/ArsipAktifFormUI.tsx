"use client";
import { FileText, FolderOpen, Save, ScanSearch, RefreshCcw } from "lucide-react";
import React, { useState } from "react"; // useEffect tidak digunakan lagi
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { IsiArsipFormData, BerkasIndukItem } from "../types"; // Import shared types

interface ArsipAktifFormUIProps {
  editId: string | null;
  formData: IsiArsipFormData;
  pdfFile: File | null;
  pdfPreviewUrl: string | null;
  ocrLoading: boolean;
  submitting: boolean;
  berkasIndukList: BerkasIndukItem[];
  selectedBerkasIndukId: string | null;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSelectBerkasInduk: (berkasId: string | null) => void;
  handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExtractPdf: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancelSubmit: () => void;
  router: AppRouterInstance;
  handleRefreshDraft?: () => void;
}

export default function ArsipAktifFormUI({
  editId,
  formData,
  pdfFile,
  pdfPreviewUrl,
  ocrLoading,
  submitting,
  berkasIndukList,
  selectedBerkasIndukId,
  handleChange,
  handleSelectBerkasInduk,
  handlePdfUpload,
  handleExtractPdf,
  handleSubmit,
  handleCancelSubmit,
  router,
  handleRefreshDraft,
}: ArsipAktifFormUIProps) {
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const pdfFileName = pdfFile ? pdfFile.name : "Tidak ada file dipilih";

  // Urutkan berkasIndukList berdasarkan nomor_berkas secara numerik
  const sortedBerkasIndukList = React.useMemo(() => {
    if (!Array.isArray(berkasIndukList)) {
      return [];
    }
    return [...berkasIndukList].sort((a, b) => a.nomor_berkas - b.nomor_berkas);
  }, [berkasIndukList]);

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto card-neon rounded-2xl overflow-hidden">
        <div className="bg-primary py-6 px-8 flex items-center justify-between rounded-lg">
          <h2 className="text-3xl font-bold text-primary-foreground flex items-center gap-2">
            <FileText size={36} /> {editId ? "Edit Isi Arsip" : "Tambah Isi Arsip"}
          </h2>
          {handleRefreshDraft && (
            <button
              type="button"
              onClick={handleRefreshDraft}
              className="flex items-center gap-2 border border-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/80 hover:text-primary-foreground transition-colors duration-200"
              title="Muat ulang draft terakhir"
            >
              <RefreshCcw size={18} /> Refresh Draft
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {/* Bagian Unggah Dokumen & Preview */}
          <div className="mb-8">
            <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
              <h3 className="text-lg font-semibold text-accent-foreground mb-4">Unggah Dokumen</h3>
              <div>
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
                <div className="mt-4 flex flex-col items-center bg-background p-4 rounded-lg border border-border">
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
              {/* Berkas Induk Selection */}
              <div>
                <label htmlFor="berkasIndukSelect" className="block text-foreground font-medium mb-2">Pilih Berkas</label>
                <select
                  id="berkasIndukSelect"
                  value={selectedBerkasIndukId || ""}
                  onChange={(e) => handleSelectBerkasInduk(e.target.value || null)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  required={!editId}
                  disabled={submitting || !!editId}
                >
                  <option value="">-- Pilih Berkas --</option>
                  {sortedBerkasIndukList.map((berkas) => (
                    <option key={berkas.id_arsip_aktif} value={berkas.id_arsip_aktif}> {/* Gunakan sortedBerkasIndukList */}
                      {berkas.nomor_berkas} - {berkas.uraian_informasi}
                    </option>
                  ))}
                </select>
                {editId && <p className="text-xs text-muted-foreground mt-1">Berkas Induk tidak dapat diubah saat mode edit.</p>}
              </div>

              {/* Nomor Item dan Kode Klasifikasi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nomorItemInput" className="block text-foreground font-medium mb-2">Nomor Item</label>
                  <input
                    type="text"
                    id="nomorItemInput"
                    name="nomor_item"
                    value={formData.nomor_item || ""} // Fixed: ensure always a string
                    className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground"
                    placeholder="Auto-generated"
                    readOnly
                    disabled
                    title="Nomor item di-generate otomatis"
                  />
                </div>

                <div>
                  <label htmlFor="kodeKlasifikasiDisplay" className="block text-foreground font-medium mb-2">Kode Klasifikasi</label>
                  <input
                    id="kodeKlasifikasiDisplay"
                    type="text"
                    name="kode_klasifikasi"
                    value={formData.kode_klasifikasi || ""} // Fixed: ensure always a string
                    className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground"
                    readOnly
                    disabled
                    title="Dari Berkas Induk yang dipilih"
                  />
                </div>
              </div>

              {/* Uraian Informasi */}
              <div>
                <label htmlFor="uraianInformasiInput" className="block text-foreground font-medium mb-2">Uraian Informasi</label>
                <textarea
                  id="uraianInformasiInput"
                  name="uraian_informasi"
                  value={formData.uraian_informasi || ""} // Fixed: ensure always a string
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground h-32"
                  placeholder="Deskripsi arsip..."
                  required
                  disabled={submitting}
                />
              </div>

              {/* Tanggal Penciptaan */}
              <div>
                <label htmlFor="tanggalPenciptaanMulaiInput" className="block text-foreground font-medium mb-2">Kurun Waktu</label>
                <div>
                  <input
                    id="tanggalPenciptaanMulaiInput"
                    type="date"
                    name="tanggal_penciptaan_mulai"
                    value={formData.tanggal_penciptaan_mulai || ""} // Fixed: ensure always a string
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Kolom Kanan */}
            <div className="space-y-6">
              {/* Keterangan */}
              <div>
                <label htmlFor="keteranganInput" className="block text-foreground font-medium mb-2">Keterangan</label>
                <input
                  id="keteranganInput"
                  name="keterangan"
                  value={formData.keterangan || ""} // Fixed: ensure always a string
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  placeholder="Keterangan tambahan..."
                  required
                  disabled={submitting}
                />
              </div>

              {/* Tingkat Perkembangan */}
              <div>
                <label htmlFor="tingkatPerkembanganInput" className="block text-foreground font-medium mb-2">Tingkat Perkembangan</label>
                <input
                  id="tingkatPerkembanganInput"
                  name="tingkat_perkembangan"
                  value={formData.tingkat_perkembangan || ""} // Fixed: ensure always a string
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  placeholder="Tingkat perkembangan arsip..."
                  required
                  disabled={submitting}
                />
              </div>

              {/* Jumlah */}
              <div>
                <label htmlFor="jumlahInput" className="block text-foreground font-medium mb-2">Jumlah Lembar</label>
                <input
                  id="jumlahInput"
                  type="number"
                  name="jumlah"
                  value={formData.jumlah || ""} // Fixed: ensure always a string
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  placeholder="Jumlah lembar"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Masa Retensi dan Jangka Simpan */}
              <div className="bg-muted/40 dark:bg-muted/20 p-4 rounded-xl border border-border/40">
                <h4 className="text-md font-semibold text-foreground mb-3">Retensi & Jangka Simpan</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="masaRetensiInput" className="block text-foreground font-medium mb-2">Retensi Aktif (Tahun)</label>
                    <input
                      id="masaRetensiInput"
                      type="number"
                      name="masa_retensi"
                      value={formData.masa_retensi || ""} // Fixed: ensure always a string
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                      placeholder="Contoh: 1, 2, 5"
                      required
                      disabled={submitting || (!!selectedBerkasIndukId && !editId)}
                      title="Masukkan masa retensi aktif (dalam tahun)"
                    />
                  </div>
                  <div>
                    <label htmlFor="jangkaSimpanDisplay" className="block text-foreground font-medium mb-2">Jangka Simpan</label>
                    <input
                      id="jangkaSimpanDisplay"
                      type="text"
                      name="jangka_simpan"
                      value={formData.jangka_simpan || ""} // Fixed: ensure always a string
                      className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground"
                      readOnly
                      disabled
                      title="Auto-generated atau dari Berkas Induk"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex justify-end space-x-3">
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
                  <Save size={18} /> {editId ? "Simpan Perubahan Isi Arsip" : "Simpan Isi Arsip"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}