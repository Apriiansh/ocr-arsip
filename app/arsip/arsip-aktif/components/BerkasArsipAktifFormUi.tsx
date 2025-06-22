"use client";
import { FolderOpen, Save, RefreshCcw } from "lucide-react";
import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  BerkasArsipAktifFormData,
  CalculatedLocationState,
  KlasifikasiItem,
} from "../types"; 
import { kodeKlasifikasiCompare } from "@/app/arsip/pemindahan/utils";

interface BerkasArsipAktifFormUIProps {
  editId: string | null;
  formData: BerkasArsipAktifFormData;
  submitting: boolean;
  klasifikasiList: KlasifikasiItem[];
  selectedKodeKlasifikasi: string;
  calculatedLocation: CalculatedLocationState;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleKodeKlasifikasiChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancelSubmit: () => void;
  router: AppRouterInstance;
  handleRefreshDraft?: () => void;
  kodeKlasifikasiMode: 'otomatis' | 'manual';
  setKodeKlasifikasiMode: (mode: 'otomatis' | 'manual') => void;
  handleManualKodeKlasifikasiBlur: () => Promise<void>;
}

export default function BerkasArsipAktifFormUI({
  editId,
  formData,
  submitting,
  klasifikasiList,
  selectedKodeKlasifikasi, 
  calculatedLocation,
  handleChange,
  handleKodeKlasifikasiChange, 
  handleSubmit,
  handleCancelSubmit,
  router,
  handleRefreshDraft,
  kodeKlasifikasiMode,
  setKodeKlasifikasiMode,
  handleManualKodeKlasifikasiBlur,
}: BerkasArsipAktifFormUIProps) {
  console.log('[BerkasArsipAktifFormUI] Rendering, submitting state:', submitting);

  const sortedKlasifikasiList = React.useMemo(() => {
    return [...klasifikasiList].sort((a, b) =>
      kodeKlasifikasiCompare(a.kode_klasifikasi, b.kode_klasifikasi)
    );
  }, [klasifikasiList]);
  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto card-neon rounded-2xl overflow-hidden">
        <div className="bg-primary py-6 px-8 flex items-center justify-between rounded-lg">
          <h2 className="text-3xl font-bold text-primary-foreground flex items-center gap-2">
            <FolderOpen size={36} /> {editId ? "Edit Berkas Arsip Aktif" : "Tambah Berkas Arsip Aktif"}
          </h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Kolom Kiri */}
            <div className="space-y-6">
              {/* Nomor Berkas */}
              <div>
                <label htmlFor="nomorBerkasInput" className="block text-foreground font-medium mb-2">Nomor Berkas</label>
                <input
                  type="number"
                  id="nomorBerkasInput"
                  name="nomor_berkas"
                  value={(formData.nomor_berkas === 0 && !editId ? "" : formData.nomor_berkas) ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  placeholder="Nomor berkas auto-generated"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Kode Klasifikasi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-foreground font-medium" id="kodeKlasifikasiLabel">Kode Klasifikasi</label>
                  <div className="flex items-center rounded-lg bg-muted p-0.5">
                    <button
                      type="button"
                      onClick={() => setKodeKlasifikasiMode('otomatis')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out
                                  ${kodeKlasifikasiMode === 'otomatis' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      onClick={() => setKodeKlasifikasiMode('manual')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out
                                  ${kodeKlasifikasiMode === 'manual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
                    >
                      Input
                    </button>
                  </div>
                </div>

                {kodeKlasifikasiMode === 'otomatis' ? (
                  <select
                    id="selectedKodeKlasifikasiInput"
                    value={selectedKodeKlasifikasi ?? ''}
                    aria-labelledby="kodeKlasifikasiLabel"
                    onChange={handleKodeKlasifikasiChange}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                    required
                    disabled={submitting}
                  >
                    <option value="">Pilih Kode Klasifikasi</option>
                    {sortedKlasifikasiList.map((item) => (
                      <option key={item.kode_klasifikasi} value={item.kode_klasifikasi}>
                        {item.kode_klasifikasi} - {item.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="kodeKlasifikasiManualInput"
                    type="text"
                    aria-labelledby="kodeKlasifikasiLabel"
                    name="kode_klasifikasi"
                    value={formData.kode_klasifikasi ?? ''}
                    onChange={handleChange}
                    onBlur={handleManualKodeKlasifikasiBlur}
                    placeholder="Contoh: 000.1.1.1"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                    required
                    disabled={submitting}
                  />
                )}
              </div>

              {/* Uraian Informasi */}
              <div>
                <label htmlFor="uraianInformasiInput" className="block text-foreground font-medium mb-2">Uraian Informasi</label>
                <textarea
                  id="uraianInformasiInput"
                  name="uraian_informasi"
                  value={formData.uraian_informasi ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground h-32"
                  placeholder="Deskripsi berkas..."
                  required
                  disabled={submitting}
                />
              </div>

              {/* Keterangan */}
              <div>
                <label htmlFor="keteranganInput" className="block text-foreground font-medium mb-2">Keterangan</label>
                <input
                  id="keteranganInput"
                  name="keterangan"
                  value={formData.keterangan ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  disabled={submitting}
                />
              </div>

              {/* Tingkat Perkembangan */}
              <div>
                <label htmlFor="tingkatPerkembanganInput" className="block text-foreground font-medium mb-2">Tingkat Perkembangan</label>
                <input
                  id="tingkatPerkembanganInput"
                  name="tingkat_perkembangan"
                  value={formData.tingkat_perkembangan ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Akses */}
              <div>
                <label htmlFor="aksesInput" className="block text-foreground font-medium mb-2">Akses</label>
                <select
                  id="aksesInput"
                  name="akses" 
                  value={formData.akses ?? ''} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  required
                  disabled={submitting}
                >
                  <option value="">Pilih Tingkat Akses</option>
                  <option value="Biasa">Biasa</option>
                  <option value="Terbatas">Terbatas</option>
                  <option value="Rahasia">Rahasia</option>
                  <option value="Sangat Rahasia">Sangat Rahasia</option>
                </select>
              </div>

            </div>

            {/* Kolom Kanan */}
            <div className="space-y-6">
              {/* Media Simpan */}
              <div>
                <label htmlFor="mediaSimpanInput" className="block text-foreground font-medium mb-2">Media Simpan</label>
                <select
                  id="mediaSimpanInput"
                  name="media_simpan"
                  value={formData.media_simpan ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  required
                  disabled={submitting}
                >
                  <option value="">Pilih Media Penyimpanan</option>
                  <option value="Filing Cabinet">Filing Cabinet</option>
                  <option value="Digital">Srikandi</option>
                </select>
              </div>

              {/* Jumlah Berkas */}
              <div>
                <label htmlFor="jumlahInput" className="block text-foreground font-medium mb-2">Jumlah Berkas</label>
                <input
                  id="jumlahInput"
                  type="number"
                  name="jumlah"
                  value={formData.jumlah ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                  placeholder="Jumlah berkas (folder/item)"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Kurun Waktu Penciptaan Berkas */}
              <div className="bg-muted/40 dark:bg-muted/20 p-4 rounded-xl border border-border/40">
                <h3 className="text-md font-semibold text-foreground mb-3">Kurun Waktu</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tanggalPenciptaanMulaiInput" className="block text-foreground font-medium mb-2">Mulai</label>
                    <input
                      id="tanggalPenciptaanMulaiInput"
                      type="date"
                      name="tanggal_penciptaan_mulai"
                      value={formData.tanggal_penciptaan_mulai ?? ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="tanggalPenciptaanBerakhirInput" className="block text-foreground font-medium mb-2">Selesai</label>
                    <input
                      id="tanggalPenciptaanBerakhirInput"
                      type="date"
                      name="tanggal_penciptaan_berakhir"
                      value={formData.tanggal_penciptaan_berakhir ?? ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              {/* Jangka Waktu Aktif Berkas */}
              <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Jangka Waktu Aktif</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="masaRetensiInput" className="block text-foreground font-medium mb-2">Retensi Aktif (Tahun)</label>
                    <input
                      id="masaRetensiInput"
                      type="number"
                      name="masa_retensi"
                      value={formData.masa_retensi ?? ''}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground placeholder-muted-foreground"
                      placeholder="Contoh: 1, 2, 5"
                      required
                      disabled={submitting}
                      title={
                        kodeKlasifikasiMode === 'otomatis' && selectedKodeKlasifikasi
                          ? `Disarankan dari kode ${selectedKodeKlasifikasi}, bisa diubah manual`
                          : "Masukkan masa retensi aktif (dalam tahun)"
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="jangkaSimpanInput" className="block text-foreground font-medium mb-2">Jangka Simpan</label>
                    <input
                      id="jangkaSimpanInput"
                      type="text"
                      name="jangka_simpan"
                      value={formData.jangka_simpan ?? ''}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-muted text-muted-foreground"
                      disabled
                      title="Otomatis berdasarkan Tanggal Mulai dan Berakhir Jangka Aktif"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lokasi Penyimpanan - Full Width */}
          <div className="mt-8 bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">Lokasi Penyimpanan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="noFilingCabinetInput" className="block text-foreground font-medium mb-2">No. Filing Cabinet</label>
                <input
                  id="noFilingCabinetInput"
                  type="text"
                  name="no_filing_cabinet"
                  value={calculatedLocation.no_filing_cabinet}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground"
                  placeholder="Otomatis"
                  readOnly
                  disabled={submitting}
                  title="Otomatis berdasarkan bidang pengguna"
                />
              </div>
              <div>
                <label htmlFor="noLaciInput" className="block text-foreground font-medium mb-2">No. Laci</label>
                <input
                  id="noLaciInput"
                  type="text"
                  name="no_laci"
                  value={calculatedLocation.no_laci}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground"
                  placeholder="Otomatis"
                  readOnly
                  disabled={submitting}
                  title="Otomatis berdasarkan ketersediaan laci"
                />
              </div>
              <div>
                <label htmlFor="noFolderInput" className="block text-foreground font-medium mb-2">No. Folder</label>
                <input
                  id="noFolderInput"
                  type="text"
                  name="no_folder"
                  value={calculatedLocation.no_folder}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground"
                  placeholder="Otomatis"
                  readOnly
                  disabled={submitting}
                  title="Otomatis berdasarkan kode klasifikasi"
                />
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
                  <Save size={18} /> {editId ? "Simpan Perubahan Berkas" : "Simpan Berkas"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}