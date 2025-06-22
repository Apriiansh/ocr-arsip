export interface ArsipAktif {
    id_arsip_aktif: string;
    nomor_berkas: number; // Diubah menjadi number untuk konsistensi
    kode_klasifikasi: string;
    uraian_informasi: string;
    kurun_waktu: string;
    jumlah: number;
    masa_retensi: number;
    jangka_simpan: string; // String periode aktif "DD-MM-YYYY s.d. DD-MM-YYYY"
    tingkat_perkembangan: string;
    media_simpan: string;
    keterangan: string;
    is_retention_expired?: boolean;
    retensi_data?: {
        label: string;
        inaktif: number;
        nasib_akhir: string;
    };
    lokasi_penyimpanan: {
        id_bidang_fkey: number;
        no_filing_cabinet: string;
        no_laci: string;
        no_folder: string;
    };
}

export interface IsiArsipAktif {
    id_isi_arsip: string;
    id_berkas_induk_fkey: string;
    nomor_item: string;
    kode_klasifikasi: string;
    uraian_informasi: string;
    tanggal_mulai?: string;
    tanggal_berakhir?: string;
    masa_retensi?: number;
    kurun_waktu?: string;
    jangka_simpan?: string;
    jumlah: number;
    keterangan: string;
    tingkat_perkembangan?: string;
    media_simpan?: string;
    file_url?: string;
    user_id?: string;
    created_at?: string;
    akses?: string;
}

export interface PemindahanIsiBerkas {
    id_pemindahan_isi: number;
    id_isi_arsip: string;
    id_arsip_inaktif: string;
    id_pemindahan_process: string;
    tanggal_pindah?: string;
}

export interface ArsipInaktif {
    id_arsip_inaktif: string;
    nomor_berkas: number;
    kode_klasifikasi: string;
    jenis_arsip: string ;
    kurun_waktu: string ;
    tingkat_perkembangan: string;
    jumlah: number;
    keterangan: string;
    nomor_definitif_folder_dan_boks: string;
    lokasi_simpan: string;
    nasib_akhir: string;
    jangka_simpan: string; 
    durasi_retensi_inaktif: number; 
    kategori_arsip: string;
    id_arsip_aktif: string;
    tanggal_pindah: string;
    user_id: string;
    created_at: string;
    status_persetujuan: "Menunggu" | "Disetujui" | "Ditolak";
    id_berita_acara: string;
}

export interface BeritaAcara {
    nomor_berita_acara: string;
    tanggal_berita_acara: string;
    keterangan: string;
    dasar: string;
}

// untuk input isi arsip inaktif
export interface PemindahanInfo {
    lokasi_simpan: string;
    // nomor_boks: string; // Dipindahkan ke ArsipEdit
    jenis: string; // cek kode klasifikasi dari table klasifikasi arsip memiliki kolom "label", "inaktif", dan "nasib_akhir" bisa digunakan untuk otomatisasi input
    jangka_simpan_inaktif: number; // Durasi retensi INAKTIF dalam tahun
    nasib_akhir: string; // nasib_akhir: string;
    kategori_arsip: string; // kategori_arsip: string;
    keterangan: string; // keterangan: string;
}

export interface ArsipEdit {
    id_arsip_aktif: string;
    jenis_arsip_edited?: string;
    masa_retensi_inaktif_edited?: string | number; // Bisa string dari input, lalu di-parse
    nasib_akhir_edited?: string;
    nomor_boks_edited?: string;    tingkat_perkembangan_edited?: string;
}

export interface ApprovalStatus {
    kepala_bidang: {
        status: "Menunggu" | "Disetujui" | "Ditolak";
        verified_by: string | null;
        verified_at: string | null;
    };
    sekretaris: {
        status: "Menunggu" | "Disetujui" | "Ditolak";
        verified_by: string | null;
        verified_at: string | null;
    };
}

export interface ProcessStatus {    status: 'idle' | 'processing' | 'completed' | 'error';    message?: string;}

export interface PemindahanProcess {
    id: string;
    user_id: string;
    current_step: number;
    selected_arsip_ids: string[] | null;
    berita_acara: BeritaAcara | null;
    pemindahan_info: Record<string, PemindahanInfo> | null; 
    approval_status: ApprovalStatus | null;
    process_status: ProcessStatus | null;
    created_at: string | null;
    updated_at: string | null;
    is_completed: boolean | null;
}