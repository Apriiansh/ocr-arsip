import { ArsipAktif } from "./types";

export const ALLOWED_ROLES = ["Pegawai"];
export const APPROVAL_ROLES = ["Kepala_Bidang", "Sekretaris"];
export const SIGN_IN_PATH = "/sign-in";
export const DEFAULT_HOME_PATH = "/";

interface KlasifikasiData {
    aktif: number;
    inaktif: number;
    nasib_akhir: string;
}

// Helper function to format date
export const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

// Helper function to get YYYY-MM-DD format
export const getISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export function calculateRetentionExpired(arsip: ArsipAktif, klasifikasiData: KlasifikasiData): boolean {
    // arsip.jangka_simpan memiliki format "DD-MM-YYYY s.d. DD-MM-YYYY" atau "DD-MM-YYYY"
    // Ini merepresentasikan periode aktif arsip.
    // Kita perlu mengambil tanggal akhir dari string ini.
    if (!arsip.jangka_simpan) {
        return false;
    }

    const parts = arsip.jangka_simpan.split(" s.d. ");
    const endDateStringDMY = parts.length > 1 ? parts[1] : parts[0]; // Format DD-MM-YYYY

    if (!endDateStringDMY) {
        return false;
    }

    const dateParts = endDateStringDMY.split("-");
    if (dateParts.length !== 3) {
        console.warn(`Format tanggal akhir tidak valid di jangka_simpan: ${endDateStringDMY}`);
        return false; // Format tidak valid
    }

    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // Bulan di JavaScript adalah 0-indexed
    const year = parseInt(dateParts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
        console.warn(`Gagal mem-parsing tanggal akhir dari jangka_simpan: ${endDateStringDMY}`);
        return false;
    }

    const endDate = new Date(year, month, day);
    // Set ke akhir hari untuk perbandingan yang adil
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(endDate.getTime())) {
        console.warn(`Objek tanggal akhir tidak valid dari jangka_simpan: ${endDateStringDMY}`);
        return false; // Objek tanggal tidak valid
    }

    const currentDate = new Date();
    // Arsip dianggap kedaluwarsa (retensi aktifnya berakhir) jika tanggal saat ini telah melewati tanggal akhir periode aktif.
    return currentDate > endDate;
} 

export function kodeKlasifikasiCompare(a: string, b: string) {
    const segA = a.split('.').map(Number);
    const segB = b.split('.').map(Number);
    const len = Math.max(segA.length, segB.length);
    for (let i = 0; i < len; i++) {
        const numA = segA[i] ?? 0;
        const numB = segB[i] ?? 0;
        if (numA !== numB) return numA - numB;
    }
    return 0;
}