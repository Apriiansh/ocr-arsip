export interface BerkasArsipAktifFormData {
  nomor_berkas: number;
  kode_klasifikasi: string;
  uraian_informasi: string;
  tanggal_penciptaan_mulai: string;
  tanggal_penciptaan_berakhir: string;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  masa_retensi: string;
  kurun_waktu: string;
  jangka_simpan: string;
  jumlah: string;
  keterangan: string;
  tingkat_perkembangan: string;
  media_simpan: string;
  akses: string;
}

export interface KlasifikasiItem {
  kode_klasifikasi: string;
  label: string;
  aktif: number;
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export interface CalculatedLocationState {
  no_filing_cabinet: string;
  no_laci: string;
  no_folder: string;
}

export interface IsiArsipFormData {
  id_berkas_induk_fkey: string | null;
  nomor_item: string;
  file_url: string | null;
  kode_klasifikasi: string;
  uraian_informasi: string;
  tanggal_penciptaan_mulai: string;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  masa_retensi: string;
  kurun_waktu: string;
  jangka_simpan: string;
  jumlah: string;
  keterangan: string;
  tingkat_perkembangan: string;
  media_simpan: string;
}

export interface BerkasIndukItem {
  id_arsip_aktif: string;
  kode_klasifikasi: string;
  uraian_informasi: string;
  nomor_berkas: number;
  masa_retensi: string | null;
  kurun_waktu: string | null;
  jangka_simpan: string | null;
  media_simpan: string | null; 
}

export interface KlasifikasiArsipInfo {
  kode_klasifikasi: string;
  aktif: number | string | null;
  //   inaktif: number | string | null; // Jika nanti dibutuhkan
  //   nasib_akhir: string | null; // Jika nanti dibutuhkan
}