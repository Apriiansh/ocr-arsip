export enum UserRole {
    PEGAWAI = "Pegawai",
    KEPALA_BIDANG = "Kepala_Bidang",
    SEKRETARIS = "Sekretaris",
    KEPALA_DINAS = "Kepala_Dinas",
    ADMIN = "Admin",
}

export enum Jabatan {
    ARSIPARIS_AHLI_PERTAMA = "Arsiparis Ahli Pertama",
    ARSIPARIS_AHLI_MUDA = "Arsiparis Ahli Muda",
    ARSIPARIS_AHLI_MADYA = "Arsiparis Ahli Madya",
    ARSIPARIS_AHLI_UTAMA = "Arsiparis Ahli Utama",
    KEPALA_BIDANG = "Kepala Bidang",
    SEKRETARIS = "Sekretaris",
    KEPALA_DINAS = "Kepala Dinas",
}

export interface UserProfile {
    user_id: string;
    nama: string;
    email: string;
    nip?: string | null;
    pangkat?: string | null;
    jabatan: Jabatan;
    role: UserRole;
    id_bidang_fkey: number;
    daftar_bidang?: {
        nama_bidang: string;
    } | null;
}

export interface DaftarBidang {
    id_bidang: number;
    nama_bidang: string;
}