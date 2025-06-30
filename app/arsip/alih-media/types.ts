export interface SuratAlihMediaData {
  // KOP (static/manual, tidak hasil scan)
  logoUrl?: string;
  instansi1: string;
  instansi2: string;
  alamat: string;
  kontak: string;
  emailWeb: string;

  // Metadata surat
  tanggal: string;
  nomor: string;
  sifat: string;
  lampiran: string;
  hal: string;

  // Tujuan
  kepada: string;
  di: string;

  // Isi surat (bisa banyak paragraf)
  isi: string[];


  // Penutup
  penutup: string;

  // Tanda tangan
  ttdJabatan: string;
  ttdNama: string;
  ttdPangkat: string;
  ttdNip: string;
  qrUrl?: string;
}