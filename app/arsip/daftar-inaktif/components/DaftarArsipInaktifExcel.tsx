import ExcelJS, { BorderStyle } from 'exceljs';
import { ArsipInaktifRow } from '../page'; 
import { createClient } from '@/utils/supabase/client';

interface ExportToExcelProps {
    data: ArsipInaktifRow[];
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

interface SekretarisInfo {
    nama: string;
    nip: string;
    pangkat?: string | null;
    jabatan: string; // Akan selalu "Sekretaris"
}


export const exportArsipInaktifToExcel = async ({ data }: ExportToExcelProps) => {
    if (!data.length) {
        // Menggunakan modal kustom sebagai pengganti alert
        showCustomAlert("Tidak ada data arsip inaktif yang ditampilkan untuk diekspor.");
        return;
    }

    // Filter data untuk hanya menyertakan arsip inaktif yang disetujui
    const approvedArsipInaktif = data.filter(arsip => arsip.status_persetujuan === "Disetujui");

    if (!approvedArsipInaktif.length) {
        // Menggunakan modal kustom sebagai pengganti alert
        showCustomAlert("Tidak ada arsip inaktif dengan status 'Disetujui' dalam daftar yang dipilih untuk diekspor.");
        return;
    }

    if (approvedArsipInaktif.length < data.length) {
        // Menggunakan modal kustom sebagai pengganti alert
        showCustomAlert(`Hanya arsip inaktif yang berstatus 'Disetujui' yang akan diekspor. ${approvedArsipInaktif.length} dari ${data.length} arsip dalam daftar yang dipilih akan diproses.`);
    }
    // Mulai dari sini, gunakan 'approvedArsipInaktif' bukan 'data' untuk proses pembuatan Excel

    // Ambil data Sekretaris
    let sekretarisInfo: SekretarisInfo | null = null;
    const supabase = createClient();
    try {
        const { data: sekretarisData, error: sekretarisError } = await supabase
            .from('users')
            .select('nama, nip, pangkat, jabatan') // Menggunakan kolom dari tabel users: nama, nip, pangkat, jabatan
            .eq('role', 'Sekretaris') // Asumsi role 'Sekretaris' unik
            .single();

        if (sekretarisError) throw sekretarisError;

        if (sekretarisData) {
            sekretarisInfo = {
                nama: sekretarisData.nama || 'Nama Sekretaris Tidak Ditemukan',
                nip: sekretarisData.nip || 'NIP Tidak Ditemukan',
                pangkat: sekretarisData.pangkat, // Menggunakan kolom 'pangkat'
                jabatan: 'Sekretaris'
            };
        }
    } catch (error) {
        console.error("Gagal mengambil data Sekretaris:", error);
        // Tetap lanjutkan pembuatan Excel meskipun data Sekretaris gagal diambil
    }

    // Create workbook dan worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daftar Arsip Inaktif Disetujui'); // Nama sheet bisa disesuaikan

    const currentYear = new Date().getFullYear();

    // === HEADER KOP SURAT ===
    // Menggabungkan seluruh area kop dari A1 hingga L5
    const KOP_MERGE_RANGE = 'A1:L5';
    worksheet.mergeCells(KOP_MERGE_RANGE);

    // Set row heights for Kop
    worksheet.getRow(1).height = 25;
    worksheet.getRow(2).height = 25;
    worksheet.getRow(3).height = 20;
    worksheet.getRow(4).height = 15;
    worksheet.getRow(5).height = 15;

    // Styling untuk seluruh area Kop (A1:L5)
    const kopCell = worksheet.getCell('A1'); // Sel kiri atas dari area yang di-merge
    kopCell.value = 'PEMERINTAH PROVINSI SUMATERA SELATAN\nDINAS KEARSIPAN\nJalan Demang Lebar Daun Nomor 4863 Palembang 30137\nTelepon/ Faxsimile : (0711) 364843 / (0711) 364843  Kode Pos 30137\nlaman  ban.arsip@yahoo.co.id , website: www.arsip.sumselprov.go.id';
    kopCell.font = { name: FONT_ARIAL, size: KOP_FONT_SIZE, bold: true };
    kopCell.alignment = {
        vertical: 'middle',
        horizontal: 'center', // Teks akan di tengah area merge
        wrapText: true,
    };
    kopCell.border = {
        top: BORDER_THIN_STYLE,
        left: BORDER_THIN_STYLE,
        bottom: BORDER_MEDIUM_STYLE,
        right: BORDER_THIN_STYLE,
    };

    // Add logo image
    try {
        const logoResponse = await fetch('/logosumsel.png'); // Pastikan path logo benar
        if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const imageId = workbook.addImage({
                buffer: logoBuffer,
                extension: 'png',
            });
            worksheet.addImage(imageId, {
                // Posisikan logo di sisi kiri area kop yang sudah di-merge
                tl: { col: 2.95, row: 1 }, // Sedikit offset dari sudut kiri atas A1
                ext: { width: 100, height: 86 }, // Ukuran logo
                editAs: 'absolute'
            });
        } else {
            console.warn('Gagal memuat logo, status:', logoResponse.status);
        }
    } catch (error) {
        console.warn('Logo tidak dapat dimuat:', error);
    }

    // === JUDUL UTAMA ===
    worksheet.mergeCells('A7:L7');
    const title1 = worksheet.getCell('A7');
    title1.value = 'DAFTAR BERKAS ARSIP INAKTIF';
    title1.font = { name: FONT_ARIAL, size: TITLE_FONT_SIZE, bold: true };
    title1.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A8:L8');
    const title2 = worksheet.getCell('A8');
    title2.value = `TAHUN ${currentYear}`;
    title2.font = { name: FONT_ARIAL, size: SUB_TITLE_FONT_SIZE, bold: true };
    title2.alignment = { vertical: 'middle', horizontal: 'center' };

    // Tidak ada UNIT PENGOLAH untuk arsip inaktif

    // === HEADER TABEL ===
    const startRow = 10; // Mulai tabel dari baris 10 (setelah judul)

    const headers = [
        'NO\nBERKAS', 'KODE\nKLASIFIKASI', 'JENIS ARSIP', 'KURUN\nWAKTU', 'JUMLAH',
        'TINGKAT\nPERKEMBANGAN', 'NO. DEFINITIF\n(FOLDER & BOKS)', 'LOKASI\nSIMPAN',
        'JANGKA SIMPAN\n(TAHUN)', 'NASIB\nAKHIR', 'KATEGORI\nARSIP', 'KET'
    ];

    worksheet.getRow(startRow).values = headers;

    // Style header tabel
    for (let col = 1; col <= headers.length; col++) {
        const cell = worksheet.getCell(startRow, col);
        cell.font = { name: FONT_ARIAL, size: TABLE_HEADER_FONT_SIZE, bold: true };
        cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
        };
        cell.border = {
            top: BORDER_THIN_STYLE, left: BORDER_THIN_STYLE,
            bottom: BORDER_THIN_STYLE, right: BORDER_THIN_STYLE
        };
        cell.fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: HEADER_FILL_COLOR }
        };
    }
    worksheet.getRow(startRow).height = 40; // Tinggi baris header

    // === DATA ROWS ===
    let currentRow = startRow + 1;
    approvedArsipInaktif.forEach((arsip) => { // Menggunakan approvedArsipInaktif
        const jumlahText = arsip.jumlah ? `${arsip.jumlah} berkas` : '';
        const rowData = [
            arsip.nomor_berkas,
            arsip.kode_klasifikasi || '',
            arsip.jenis_arsip || '',
            arsip.kurun_waktu || '',
            jumlahText,
            arsip.tingkat_perkembangan || '',
            arsip.nomor_definitif_folder_dan_boks || '',
            arsip.lokasi_simpan || '',
            arsip.jangka_simpan !== null ? arsip.jangka_simpan : '', // Menampilkan string kosong jika null
            arsip.nasib_akhir || '',
            arsip.kategori_arsip || '',
            arsip.keterangan || ''
        ];

        worksheet.getRow(currentRow).values = rowData;

        // Style data cells
        for (let col = 1; col <= headers.length; col++) {
            const cell = worksheet.getCell(currentRow, col);
            cell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
            cell.alignment = {
                vertical: 'middle',
                // Kolom yang di-center: NO BERKAS (1), JUMLAH (5), TINGKAT PERKEMBANGAN (6), JANGKA SIMPAN (9)
                horizontal: (col === 1 || col === 5 || col === 6 || col === 9)
                    ? 'center'
                    : 'left',
                wrapText: true
            };
            cell.border = {
                top: BORDER_THIN_STYLE, left: BORDER_THIN_STYLE,
                bottom: BORDER_THIN_STYLE, right: BORDER_THIN_STYLE
            };
        }
        currentRow++;
    });

    // === TANDA TANGAN SEKRETARIS ===
    // Tambahkan beberapa baris kosong setelah data
    currentRow += 2; // Misal, 2 baris kosong

    // Posisi tanda tangan (misalnya di kolom J, K, L)
    const ttdStartCol = 10; // Kolom J (index 9)

    // Tanggal (Palembang, [Tanggal Sekarang])
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2); // Merge 3 kolom untuk tanggal
    const tanggalCell = worksheet.getCell(currentRow, ttdStartCol);
    const today = new Date();
    const formattedDate = `${today.getDate()} ${today.toLocaleString('id-ID', { month: 'long' })} ${today.getFullYear()}`;
    tanggalCell.value = `Palembang, ${formattedDate}`;
    tanggalCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
    tanggalCell.alignment = { horizontal: 'center' };
    currentRow++;

    // Jabatan Sekretaris
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const jabatanCell = worksheet.getCell(currentRow, ttdStartCol);
    jabatanCell.value = sekretarisInfo ? sekretarisInfo.jabatan.toUpperCase() : "SEKRETARIS";
    jabatanCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true };
    jabatanCell.alignment = { horizontal: 'center' };
    currentRow++;

    // Placeholder untuk TTD (gambar)
    // Tambahkan tinggi baris untuk area tanda tangan
    const ttdImageRow = currentRow;
    // Merge cells for the signature image area
    worksheet.mergeCells(ttdImageRow, ttdStartCol, ttdImageRow + 3, ttdStartCol + 2);

    try {
        const signatureResponse = await fetch('/signature.png'); // Menggunakan nama file yang diunggah
        if (signatureResponse.ok) {
            const signatureBuffer = await signatureResponse.arrayBuffer();
            const imageId = workbook.addImage({
                buffer: signatureBuffer,
                extension: 'png',
            });
            worksheet.addImage(imageId, {
                // Posisikan di tengah area merge (J,K,L)
                // ttdStartCol adalah 10 (kolom J). Area merge adalah J, K, L.
                // Untuk menengahkan di 3 kolom, kita targetkan tengah kolom K.
                // Kolom J = ttdStartCol - 1, Kolom K = ttdStartCol, Kolom L = ttdStartCol + 1
                tl: { col: (ttdStartCol -1) + 1.99, row: ttdImageRow - 1 + 0.1 }, // (ttdStartCol - 1) adalah index kolom J. +1.1 agar sedikit ke kanan dari awal kolom K.
                ext: { width: 80, height: 80 } // Sesuaikan ukuran TTD
            });
        }
    } catch (error) {
        console.warn('Gambar tanda tangan tidak dapat dimuat:', error);
    }
    currentRow += 4; // Lewati baris yang dimerge untuk TTD

    // Nama Sekretaris
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const namaCell = worksheet.getCell(currentRow, ttdStartCol);
    namaCell.value = sekretarisInfo ? sekretarisInfo.nama.toUpperCase() : "NAMA SEKRETARIS";
    namaCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true, underline: true };
    namaCell.alignment = { horizontal: 'center' };
    currentRow++;

    // NIP Sekretaris
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const nipCell = worksheet.getCell(currentRow, ttdStartCol);
    nipCell.value = sekretarisInfo ? `NIP. ${sekretarisInfo.nip}` : "NIP. SEKRETARIS";
    nipCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
    nipCell.alignment = { horizontal: 'center' };

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
        { width: 25 }   // KET
    ];

    // === DOWNLOAD ===
    const fileName = `Daftar_Arsip_Inaktif_${currentYear}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
};

// Fungsi untuk menampilkan modal kustom sebagai pengganti alert
function showCustomAlert(message: string) {
    const modalId = 'customAlertModal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            font-family: 'Arial', sans-serif;
            color: #333;
            max-width: 80%;
            text-align: center;
        `;
        document.body.appendChild(modal);

        const overlay = document.createElement('div');
        overlay.id = 'customAlertOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 999;
        `;
        document.body.appendChild(overlay);

        overlay.onclick = () => {
            modal?.remove();
            overlay.remove();
        };
    }

    modal.innerHTML = `
        <p style="margin: 0; font-size: 16px;">${message}</p>
        <button id="customAlertCloseButton" style="
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s ease;
        ">OK</button>
    `;

    const closeButton = document.getElementById('customAlertCloseButton');
    closeButton?.addEventListener('click', () => {
        modal?.remove();
        document.getElementById('customAlertOverlay')?.remove();
    });
}
