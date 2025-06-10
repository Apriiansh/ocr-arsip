export interface FormDataState {
  nomor_berkas: number;
  file_url: string | null;
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
}

export interface KlasifikasiItem {
  kode_klasifikasi: string;
  label: string;
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}