import ExcelJS, { BorderStyle } from 'exceljs';
import { ArsipInaktifLaporanRow } from '../page'; // Path ke interface di page.tsx
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';

interface ExportToExcelProps {
    data: ArsipInaktifLaporanRow[];
    periodeLaporan: string;
}

// --- Constants for Styling ---
const FONT_ARIAL = 'Arial';
const KOP_FONT_SIZE = 12;
const TITLE_FONT_SIZE = 14;
const SUB_TITLE_FONT_SIZE = 12;
const TABLE_HEADER_FONT_SIZE = 9;
const TABLE_DATA_FONT_SIZE = 9;
const HEADER_FILL_COLOR = 'FFE6E6E6'; 

const BORDER_THIN_STYLE: Partial<ExcelJS.Border> = { style: 'thin' as BorderStyle };
const BORDER_MEDIUM_STYLE: Partial<ExcelJS.Border> = { style: 'medium' as BorderStyle };

interface KepalaDinasInfo {
    nama: string;
    nip: string;
    pangkat?: string | null;
    jabatan: string; // Akan selalu "KEPALA DINAS"
}

export const exportLaporanArsipInaktifKepalaDinasToExcel = async ({ data, periodeLaporan }: ExportToExcelProps) => {
    if (!data.length) {
        toast.info("Tidak ada data arsip inaktif yang disetujui untuk diekspor dalam periode ini.");
        return;
    }

    // Ambil data Kepala Dinas
    let kepalaDinasInfo: KepalaDinasInfo | null = null;
    const supabase = createClient();
    try {
        const { data: kdData, error: kdError } = await supabase
            .from('users')
            .select('nama, nip, pangkat') // Asumsi kolom ini ada di tabel users
            .eq('role', 'Kepala_Dinas') // Asumsi role 'Kepala_Dinas' unik
            .single();

        if (kdError) throw kdError;

        if (kdData) {
            kepalaDinasInfo = {
                nama: kdData.nama || 'Nama Kepala Dinas Tidak Ditemukan',
                nip: kdData.nip || 'NIP Tidak Ditemukan',
                pangkat: kdData.pangkat,
                jabatan: 'KEPALA DINAS'
            };
        }
    } catch (error) {
        console.error("Gagal mengambil data Kepala Dinas:", error);
        // Tetap lanjutkan pembuatan Excel meskipun data Kepala Dinas gagal diambil
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Arsip Inaktif');
    const currentYear = new Date().getFullYear();

    // === HEADER KOP SURAT ===
    const KOP_MERGE_RANGE = 'A1:N5'; // Disesuaikan ke 14 kolom (A-N)
    worksheet.mergeCells(KOP_MERGE_RANGE);

    worksheet.getRow(1).height = 25;
    worksheet.getRow(2).height = 25;
    worksheet.getRow(3).height = 20;
    worksheet.getRow(4).height = 15;
    worksheet.getRow(5).height = 15;

    const kopCell = worksheet.getCell('A1');
    kopCell.value = 'PEMERINTAH PROVINSI SUMATERA SELATAN\nDINAS KEARSIPAN\nJalan Demang Lebar Daun Nomor 4863 Palembang 30137\nTelepon/ Faxsimile : (0711) 364843 / (0711) 364843  Kode Pos 30137\nlaman  ban.arsip@yahoo.co.id , website: www.arsip.sumselprov.go.id';
    kopCell.font = { name: FONT_ARIAL, size: KOP_FONT_SIZE, bold: true };
    kopCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    kopCell.border = {
        top: BORDER_THIN_STYLE, left: BORDER_THIN_STYLE,
        bottom: BORDER_MEDIUM_STYLE, right: BORDER_THIN_STYLE,
    };

    try {
        const logoResponse = await fetch('/logosumsel.png');
        if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const imageId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
            worksheet.addImage(imageId, {
                tl: { col: 3.5, row: 0.98 }, // Sedikit disesuaikan karena KOP lebih lebar
                ext: { width: 100, height: 86 },
                editAs: 'absolute'
            });
        }
    } catch (error) {
        console.warn('Logo tidak dapat dimuat:', error);
    }

    // === JUDUL UTAMA ===
    worksheet.mergeCells('A7:N7');
    const title1 = worksheet.getCell('A7');
    title1.value = 'LAPORAN ARSIP INAKTIF';
    title1.font = { name: FONT_ARIAL, size: TITLE_FONT_SIZE, bold: true };
    title1.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A8:N8');
    const title2 = worksheet.getCell('A8');
    title2.value = `PERIODE ${periodeLaporan.toUpperCase()}`;
    title2.font = { name: FONT_ARIAL, size: SUB_TITLE_FONT_SIZE, bold: true };
    title2.alignment = { vertical: 'middle', horizontal: 'center' };

    // === HEADER TABEL ===
    const startRow = 10;
    const headers = [
        'NO\nBERKAS', 'KODE\nKLASIFIKASI', 'JENIS ARSIP', 'KURUN\nWAKTU', 'JUMLAH',
        'TINGKAT\nPERKEMBANGAN', 'NO. DEFINITIF\n(FOLDER & BOKS)', 'LOKASI\nSIMPAN', 'JANGKA SIMPAN\n(TAHUN)', 
        'NASIB\nAKHIR', 'KATEGORI\nARSIP', 'TANGGAL\nPINDAH', 'KET', 'BIDANG\nPENGELOLA'
    ];
    worksheet.getRow(startRow).values = headers;

    for (let col = 1; col <= headers.length; col++) {
        const cell = worksheet.getCell(startRow, col);
        cell.font = { name: FONT_ARIAL, size: TABLE_HEADER_FONT_SIZE, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: BORDER_THIN_STYLE, left: BORDER_THIN_STYLE, bottom: BORDER_THIN_STYLE, right: BORDER_THIN_STYLE };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_COLOR } };
    }
    worksheet.getRow(startRow).height = 40;

    // === DATA ROWS ===
    let currentRow = startRow + 1;

    // Urutkan data berdasarkan jenis_arsip (ascending) lalu nomor_berkas (ascending)
    const sortedData = [...data].sort((a, b) => {
        // Urutkan berdasarkan jenis_arsip
        const jenisArsipA = a.jenis_arsip || '';
        const jenisArsipB = b.jenis_arsip || '';
        if (jenisArsipA < jenisArsipB) return -1;
        if (jenisArsipA > jenisArsipB) return 1;

        // Jika jenis_arsip sama, urutkan berdasarkan nomor_berkas
        // nomor_berkas adalah number, jadi bisa langsung dikurangkan
        const nomorBerkasA = a.nomor_berkas || 0; // Default ke 0 jika null/undefined
        const nomorBerkasB = b.nomor_berkas || 0; // Default ke 0 jika null/undefined
        return nomorBerkasA - nomorBerkasB;
    });

    sortedData.forEach((arsip) => {
        const jumlahText = arsip.jumlah ? `${arsip.jumlah} berkas` : '';
        // Pastikan arsip.tanggal_pindah adalah string yang valid atau null sebelum membuat Date object
        const tanggalPindahFormatted = arsip.tanggal_pindah ? new Date(arsip.tanggal_pindah).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric'}) : '-';
        
        const rowData = [
            arsip.nomor_berkas,
            arsip.kode_klasifikasi || '',
            arsip.jenis_arsip || '',
            arsip.kurun_waktu || '',
            jumlahText,
            arsip.tingkat_perkembangan || '',
            arsip.nomor_definitif_folder_dan_boks || '',
            arsip.lokasi_simpan || '',
            arsip.jangka_simpan !== null ? arsip.jangka_simpan : '',
            arsip.nasib_akhir || '',
            arsip.kategori_arsip || '',
            tanggalPindahFormatted,
            (arsip as any).keterangan || '',
            arsip.users?.daftar_bidang?.nama_bidang?.replace(/_/g, " ") || '-',
        ];
        worksheet.getRow(currentRow).values = rowData;

        for (let col = 1; col <= headers.length; col++) {
            const cell = worksheet.getCell(currentRow, col);
            cell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
            cell.alignment = {
                vertical: 'middle',
                horizontal: (col === 1 || col === 5 || col === 6 || col === 9 || col === 12 || col === 13) ? 'center' : 'left', // Kolom 13 (Bidang) juga center
                wrapText: true
            };
            cell.border = { top: BORDER_THIN_STYLE, left: BORDER_THIN_STYLE, bottom: BORDER_THIN_STYLE, right: BORDER_THIN_STYLE };
        }
        currentRow++;
    });

    // === TANDA TANGAN KEPALA DINAS ===
    currentRow += 2; // Misal, 2 baris kosong

    // Posisi tanda tangan (misalnya di kolom L, M, N)
    const ttdStartCol = 12; // Kolom L (index 11 dari 0-13, atau kolom ke-12 dari 1-14)

    // Tanggal (Palembang, [Tanggal Sekarang])
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2); // Merge 3 kolom
    const tanggalCell = worksheet.getCell(currentRow, ttdStartCol);
    const today = new Date();
    const formattedDate = `${today.getDate()} ${today.toLocaleString('id-ID', { month: 'long' })} ${today.getFullYear()}`;
    tanggalCell.value = `Palembang, ${formattedDate}`;
    tanggalCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
    tanggalCell.alignment = { horizontal: 'center' };
    currentRow++;

    // Jabatan Kepala Dinas
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const jabatanCell = worksheet.getCell(currentRow, ttdStartCol);
    jabatanCell.value = kepalaDinasInfo ? kepalaDinasInfo.jabatan.toUpperCase() : "KEPALA DINAS";
    jabatanCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true };
    jabatanCell.alignment = { horizontal: 'center' };
    currentRow++;

    // Placeholder untuk TTD (gambar)
    const ttdImageRow = currentRow;
    worksheet.mergeCells(ttdImageRow, ttdStartCol, ttdImageRow + 3, ttdStartCol + 2); // Area untuk gambar TTD

    try {
        const signatureResponse = await fetch('/signature.png'); // Asumsi nama file signature.png
        if (signatureResponse.ok) {
            const signatureBuffer = await signatureResponse.arrayBuffer();
            const imageId = workbook.addImage({ buffer: signatureBuffer, extension: 'png' });
            worksheet.addImage(imageId, {
                tl: { col: (ttdStartCol - 1) + 1.8, row: ttdImageRow -1 + 0.1 }, // Disesuaikan untuk tengah area merge L,M,N
                ext: { width: 80, height: 80 }
            });
        }
    } catch (error) {
        console.warn('Gambar tanda tangan Kepala Dinas tidak dapat dimuat:', error);
    }
    currentRow += 4; // Lewati baris yang dimerge untuk TTD

    // Nama Kepala Dinas
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const namaCell = worksheet.getCell(currentRow, ttdStartCol);
    namaCell.value = kepalaDinasInfo ? kepalaDinasInfo.nama.toUpperCase() : "NAMA KEPALA DINAS";
    namaCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true, underline: true };
    namaCell.alignment = { horizontal: 'center' };
    currentRow++;

    // NIP Kepala Dinas
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const nipCell = worksheet.getCell(currentRow, ttdStartCol);
    nipCell.value = kepalaDinasInfo ? `NIP. ${kepalaDinasInfo.nip}` : "NIP. KEPALA DINAS";
    nipCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
    nipCell.alignment = { horizontal: 'center' };

    // Tambahkan Waktu Unduh di kiri bawah, sejajar dengan NIP
    const downloadTime = new Date();
    // Format tanggal dan waktu yang lebih lengkap
    const formattedDateForTimestamp = downloadTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const formattedTimeForTimestamp = downloadTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const downloadTimestampText = `Waktu Unduh: ${formattedDateForTimestamp}, ${formattedTimeForTimestamp} WIB`;

    // Merge kolom A, B, C untuk ruang yang cukup (kolom 1, 2, 3)
    worksheet.mergeCells(currentRow, 1, currentRow, 3); 
    const downloadTimeCell = worksheet.getCell(currentRow, 1); // Ambil sel A di baris NIP
    downloadTimeCell.value = downloadTimestampText;
    downloadTimeCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE - 1, italic: true }; // Sedikit lebih kecil dan miring
    downloadTimeCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // === COLUMN WIDTHS ===
    worksheet.columns = [
        { width: 8 },   // NO BERKAS
        { width: 15 },  // KODE KLASIFIKASI
        { width: 25 },  // JENIS ARSIP
        { width: 15 },  // KURUN WAKTU
        { width: 10 },  // JUMLAH
        { width: 15 },  // TINGKAT PERKEMBANGAN
        { width: 20 },  // NO. DEFINITIF
        { width: 20 },  // LOKASI SIMPAN
        { width: 12 },  // JANGKA SIMPAN
        { width: 15 },  // NASIB AKHIR
        { width: 20 },  // KATEGORI ARSIP
        { width: 18 },  // TANGGAL PINDAH        
        { width: 25 },   // KET
        { width: 20 },  // BIDANG PENGELOLA
    ];

    // === DOWNLOAD ===
    const periodeFileName = periodeLaporan.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Laporan_Arsip_Inaktif_Periode_${periodeFileName}_${currentYear}.xlsx`;

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);

    } catch (error: any) {
        console.error("Error writing or downloading Excel file:", error);
        toast.error("Gagal membuat atau mengunduh file Excel: " + error.message);
    }
};