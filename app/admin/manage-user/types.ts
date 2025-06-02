// Re-define or import these from a shared types file
export enum UserRole {
    ADMIN = "Admin",
    PEGAWAI = "Pegawai",
    KEPALA_BIDANG = "Kepala_Bidang",
    KEPALA_DINAS = "Kepala_Dinas",
    SEKRETARIS = "Sekretaris",
}

export enum Jabatan {
    ARSIPARIS_AHLI_PERTAMA = "Arsiparis Ahli Pertama",
    ARSIPARIS_AHLI_MUDA = "Arsiparis Ahli Muda",
    ARSIPARIS_PENYELIA = "Arsiparis Penyelia",
    PENGADMINISTRASI_UMUM = "Pengadministrasi Umum",
    KEPALA_DINAS = "Kepala Dinas",
    SEKRETARIS = "Sekretaris",
    KEPALA_BIDANG = "Kepala Bidang",
    STAFF_ADMINISTRASI = "Staff Administrasi",
    ANALIS_KEBIJAKAN = "Analis Kebijakan",
}

export interface DaftarBidang {
    id_bidang: number;
    nama_bidang: string;
}

export interface UserProfile {
    user_id: string;
    nama: string;
    email: string;
    jabatan: Jabatan | string | null;
    role: UserRole | string;
    nip: string | null;
    id_bidang_fkey: number | null;
    pangkat: string | null;
    created_at: string;
    daftar_bidang?: { nama_bidang: string } | null;
}
// End of type definitions