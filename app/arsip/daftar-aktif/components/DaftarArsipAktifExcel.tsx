import ExcelJS, { BorderStyle } from 'exceljs';
import { ArsipRow } from '../page';
import { createClient } from '@/utils/supabase/client';

interface LokasiPenyimpananExcel {
    no_filing_cabinet?: string | null;
    no_laci: string | null;
    no_folder: string | null;
}

function getLokasiObjExcel(lokasi: ArsipRow["lokasi_penyimpanan"]): LokasiPenyimpananExcel | null {
    if (!lokasi) return null;
    if (Array.isArray(lokasi)) return lokasi[0] || null;
    return lokasi;
}

interface ExportToExcelProps {
    data: ArsipRow[];
    namaBidang?: string | null;
    userBidangId?: number | null;
}

// --- Constants for Styling ---
const FONT_ARIAL = 'Arial';
const KOP_FONT_SIZE = 12;
const TITLE_FONT_SIZE = 14;
const SUB_TITLE_FONT_SIZE = 12;
const UNIT_PENGOLAH_FONT_SIZE = 10;
const TABLE_HEADER_FONT_SIZE = 9;
const TABLE_DATA_FONT_SIZE = 9;
const HEADER_FILL_COLOR = 'FFE6E6E6'; // Light Gray

const BORDER_THIN_STYLE: Partial<ExcelJS.Border> = { style: 'thin' as BorderStyle };
const BORDER_MEDIUM_STYLE: Partial<ExcelJS.Border> = { style: 'medium' as BorderStyle };

interface KepalaBidangInfo {
    nama: string;
    nip: string;
    pangkat?: string | null;
    jabatan: string; // Akan berisi "KEPALA BIDANG [NAMA BIDANG]"
}

export const exportArsipAktifToExcel = async ({ data, namaBidang, userBidangId }: ExportToExcelProps) => {
    // 'data' di sini adalah filteredArsip dari halaman daftar-aktif
    if (!data.length) {
        // Menggunakan alert kustom jika tersedia, atau alert standar
        typeof showCustomAlert === 'function' ? showCustomAlert("Tidak ada data arsip yang ditampilkan untuk diekspor.") : alert("Tidak ada data arsip yang ditampilkan untuk diekspor.");
        return;
    }

    // Filter data untuk hanya menyertakan arsip yang disetujui
    const approvedArsip = data.filter(arsip => arsip.status_persetujuan === "Disetujui");

    if (!approvedArsip.length) {
        typeof showCustomAlert === 'function' ? showCustomAlert("Tidak ada arsip dengan status 'Disetujui' dalam daftar yang dipilih untuk diekspor.") : alert("Tidak ada arsip dengan status 'Disetujui' dalam daftar yang dipilih untuk diekspor.");
        return;
    }

    if (approvedArsip.length < data.length) {
        typeof showCustomAlert === 'function' ? showCustomAlert(`Hanya arsip yang berstatus 'Disetujui' yang akan diekspor. ${approvedArsip.length} dari ${data.length} arsip dalam daftar yang dipilih akan diproses.`) : alert(`Hanya arsip yang berstatus 'Disetujui' yang akan diekspor. ${approvedArsip.length} dari ${data.length} arsip dalam daftar yang dipilih akan diproses.`);
    }

    // Mulai dari sini, gunakan 'approvedArsip' bukan 'data' untuk proses pembuatan Excel

    const supabase = createClient();
    let finalNamaBidang = namaBidang;

    if (!finalNamaBidang && userBidangId) {
        const { data: bidangData, error } = await supabase
            .from("daftar_bidang")
            .select("nama_bidang")
            .eq("id_bidang", userBidangId)
            .single();
        if (bidangData) {
            finalNamaBidang = bidangData.nama_bidang;
        } else {
            console.error("Gagal mengambil nama bidang:", error);
            finalNamaBidang = "Bidang Tidak Diketahui";
        }
    } else if (!finalNamaBidang) {
        finalNamaBidang = "Bidang Tidak Ditentukan";
    }

    // Ambil data Kepala Bidang
    let kepalaBidangInfo: KepalaBidangInfo | null = null;
    if (userBidangId) {
        try {
            const { data: kbData, error: kbError } = await supabase
                .from('users')
                .select('nama, nip, pangkat')
                .eq('role', 'Kepala_Bidang')
                .eq('id_bidang_fkey', userBidangId)
                .single();

            if (kbError) throw kbError;

            if (kbData) {
                kepalaBidangInfo = {
                    nama: kbData.nama || 'Nama Kepala Bidang Tidak Ditemukan',
                    nip: kbData.nip || 'NIP Tidak Ditemukan',
                    pangkat: kbData.pangkat,
                    jabatan: `KEPALA BIDANG ${finalNamaBidang?.toUpperCase() || ''}`.trim()
                };
            }
        } catch (error) {
            console.error("Gagal mengambil data Kepala Bidang:", error);
        }
    }

    // Create workbook dan worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daftar Arsip Aktif');

    const currentYear = new Date().getFullYear();

    // === HEADER KOP SURAT ===
    const KOP_MERGE_RANGE = 'A1:K5'; // Total 11 kolom (A-K)
    worksheet.mergeCells(KOP_MERGE_RANGE);

    // Set row heights for Kop
    worksheet.getRow(1).height = 25;
    worksheet.getRow(2).height = 25;
    worksheet.getRow(3).height = 20;
    worksheet.getRow(4).height = 15;
    worksheet.getRow(5).height = 15;

    // Styling untuk seluruh area Kop (A1:K5)
    const kopCell = worksheet.getCell('A1');
    kopCell.value = 'PEMERINTAH PROVINSI SUMATERA SELATAN\nDINAS KEARSIPAN\nJalan Demang Lebar Daun Nomor 4863 Palembang 30137\nTelepon/ Faxsimile : (0711) 364843 / (0711) 364843  Kode Pos 30137\nlaman   ban.arsip@yahoo.co.id , website: www.arsip.sumselprov.go.id';
    kopCell.font = { name: FONT_ARIAL, size: KOP_FONT_SIZE, bold: true };
    kopCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
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
        const logoResponse = await fetch('/logosumsel.png');
        if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const imageId = workbook.addImage({
                buffer: logoBuffer,
                extension: 'png',
            });
            // Posisikan logo di sisi kiri area kop yang sudah di-merge
            // Kolom A adalah 0, K adalah 10.
            // tl: { col: 0.2, row: 0.3 } -> sedikit offset dari A1
            worksheet.addImage(imageId, {
                tl: { col: 2.46, row: 0.87 }, // Disesuaikan agar pas di kiri dalam merge A1:K5
                ext: { width: 100, height: 86 }, // Ukuran logo disesuaikan
                editAs: 'absolute'
            });
        }
    } catch (error) {
        console.warn('Logo tidak dapat dimuat:', error);
    }
    // === JUDUL UTAMA ===
    worksheet.mergeCells('A7:K7');
    const title1 = worksheet.getCell('A7');
    title1.value = 'DAFTAR BERKAS ARSIP AKTIF';
    title1.font = { name: FONT_ARIAL, size: TITLE_FONT_SIZE, bold: true };
    title1.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A8:K8');
    const title2 = worksheet.getCell('A8');
    title2.value = `TAHUN ${currentYear}`;
    title2.font = { name: FONT_ARIAL, size: SUB_TITLE_FONT_SIZE, bold: true };
    title2.alignment = { vertical: 'middle', horizontal: 'center' };

    // === UNIT PENGOLAH (dipindah ke atas tabel dengan ukuran kecil) ===
    worksheet.mergeCells('A10:K10');
    const unitPengolah = worksheet.getCell('A10');
    unitPengolah.value = `UNIT PENGOLAH : ${finalNamaBidang?.toUpperCase()}`;
    unitPengolah.font = { name: FONT_ARIAL, size: UNIT_PENGOLAH_FONT_SIZE, bold: true };
    unitPengolah.alignment = { vertical: 'middle', horizontal: 'left' }; // Rata kiri
    worksheet.getRow(10).height = 18;

    // === HEADER TABEL ===
    const startRow = 11;

    // Header utama (tanpa kolom keamanan)
    const headers1 = ['NO\nBERKAS', 'Kode\nKlasifikasi', 'URAIAN INFORMASI ARSIP', 'KURUN\nWAKTU/TANGGAL', 'JUMLAH', 'TINGKAT\nPERKEMBANGAN', 'LOKASI SIMPAN', '', '', 'JANGKA SIMPAN', 'KET'];
    const headers2 = ['', '', '', '', '', '', 'NO FILLING\nKABINET', 'NO LACI', 'NO\nFOLDER', '', ''];

    // Set header row 1
    worksheet.getRow(startRow).values = headers1;
    // Set header row 2  
    worksheet.getRow(startRow + 1).values = headers2;

    // Merge cells untuk header
    const mergeRanges = [
        'A11:A12', 'B11:B12', 'C11:C12', 'D11:D12', 'E11:E12', 'F11:F12', // Single cells
        'G11:I11', // LOKASI SIMPAN
        'J11:J12', 'K11:K12' // Rest
    ];

    mergeRanges.forEach(range => {
        worksheet.mergeCells(range);
    });

    // Style header tabel
    for (let row = startRow; row <= startRow + 2; row++) {
        for (let col = 1; col <= 11; col++) { // Hanya sampai kolom K (11)
            const cell = worksheet.getCell(row, col);
            cell.font = { name: FONT_ARIAL, size: TABLE_HEADER_FONT_SIZE, bold: true };
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true
            };
            cell.border = {
                top: BORDER_THIN_STYLE,
                left: BORDER_THIN_STYLE,
                bottom: BORDER_THIN_STYLE,
                right: BORDER_THIN_STYLE
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: HEADER_FILL_COLOR }
            };
        }
    }

    // === DATA ROWS ===
    let currentRow = startRow + 2;
    approvedArsip.forEach((arsip, index) => { // Menggunakan approvedArsip
        const lokasi = getLokasiObjExcel(arsip.lokasi_penyimpanan);

        // Format jumlah untuk menyertakan "berkas"
        const jumlahText = arsip.jumlah ? `${arsip.jumlah} berkas` : '';
        // Data tanpa kolom keamanan
        const rowData = [
            arsip.nomor_berkas, // Menggunakan nomor berkas dari data
            arsip.kode_klasifikasi || '',
            arsip.uraian_informasi || '',
            arsip.kurun_waktu || '',
            jumlahText, // Menggunakan jumlahText yang sudah diformat
            arsip.tingkat_perkembangan || '',
            lokasi?.no_filing_cabinet || '',
            lokasi?.no_laci || '',
            lokasi?.no_folder || '',
            arsip.jangka_simpan || '', // Tambahkan jangka_simpan di sini
            arsip.keterangan || ''
        ];

        worksheet.getRow(currentRow).values = rowData;

        // Style data cells
        for (let col = 1; col <= 11; col++) { // Hanya sampai kolom K (11)
            const cell = worksheet.getCell(currentRow, col);
            cell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
            cell.alignment = {
                vertical: 'middle',
                // Kolom yang di-center: NO BERKAS (1), JUMLAH (5), TINGKAT PERKEMBANGAN (6), LOKASI SIMPAN (7,8,9), KET (11)
                horizontal: (col === 1 || col === 5 || col === 6 || col === 7 || col === 8 || col === 9 || col === 11 || col === 10) // Tambahkan col 10 (Jangka Simpan) untuk center jika diinginkan, atau left
                    ? 'center'
                    : 'left',
                wrapText: true
            };
            cell.border = {
                top: BORDER_THIN_STYLE,
                left: BORDER_THIN_STYLE,
                bottom: BORDER_THIN_STYLE,
                right: BORDER_THIN_STYLE
            };
        }

        currentRow++;
    });

    // === TANDA TANGAN KEPALA BIDANG ===
    currentRow += 2; // Misal, 2 baris kosong

    // Posisi tanda tangan (misalnya di kolom I, J, K)
    const ttdStartCol = 9; // Kolom I (index 8)

    // Tanggal (Palembang, [Tanggal Sekarang])
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2); // Merge 3 kolom
    const tanggalCell = worksheet.getCell(currentRow, ttdStartCol);
    const today = new Date();
    const formattedDate = `${today.getDate()} ${today.toLocaleString('id-ID', { month: 'long' })} ${today.getFullYear()}`;
    tanggalCell.value = `Palembang, ${formattedDate}`;
    tanggalCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
    tanggalCell.alignment = { horizontal: 'center' };
    currentRow++;

    // Jabatan Kepala Bidang
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const jabatanCell = worksheet.getCell(currentRow, ttdStartCol);
    jabatanCell.value = kepalaBidangInfo ? kepalaBidangInfo.jabatan : "KEPALA BIDANG";
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
            const imageId = workbook.addImage({
                buffer: signatureBuffer,
                extension: 'png',
            });
            worksheet.addImage(imageId, {
                tl: { col: (ttdStartCol -1) + 1.95, row: ttdImageRow -1 + 0.1 }, // Disesuaikan untuk tengah area merge
                ext: { width: 80, height: 80 }
            });
        }
    } catch (error) {
        console.warn('Gambar tanda tangan tidak dapat dimuat:', error);
    }
    currentRow += 4; // Lewati baris yang dimerge untuk TTD

    // Nama Kepala Bidang
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const namaCell = worksheet.getCell(currentRow, ttdStartCol);
    namaCell.value = kepalaBidangInfo ? kepalaBidangInfo.nama.toUpperCase() : "NAMA KEPALA BIDANG";
    namaCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true, underline: true };
    namaCell.alignment = { horizontal: 'center' };
    currentRow++;

    // NIP Kepala Bidang
    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const nipCell = worksheet.getCell(currentRow, ttdStartCol);
    nipCell.value = kepalaBidangInfo ? `NIP. ${kepalaBidangInfo.nip}` : "NIP. KEPALA BIDANG";
    nipCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
    nipCell.alignment = { horizontal: 'center' };

    // === COLUMN WIDTHS ===
    worksheet.columns = [
        { width: 6 },   // NO BERKAS
        { width: 18 },  // Kode Klasifikasi
        { width: 40 },  // URAIAN INFORMASI
        { width: 18 },  // KURUN WAKTU
        { width: 10 },  // JUMLAH
        { width: 17 },  // TINGKAT PERKEMBANGAN
        { width: 12 },  // NO FILLING KABINET
        { width: 10 },  // NO LACI
        { width: 10 },  // NO FOLDER
        { width: 25 },  // JANGKA SIMPAN
        { width: 16 }   // KET
    ];

    // === ROW HEIGHTS ===
    // Row heights for Kop (1-5) already set
    worksheet.getRow(startRow).height = 40; // Header
    worksheet.getRow(startRow + 1).height = 30;
    // worksheet.getRow(startRow + 2).height = 20;

    // === DOWNLOAD ===
    const fileName = `Daftar_Arsip_Aktif_${finalNamaBidang?.replace(/\s+/g, '_')}_${currentYear}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
};

// Fungsi untuk menampilkan modal kustom sebagai pengganti alert (opsional, jika ingin konsisten)
function showCustomAlert(message: string) {
    const modalId = 'customAlertModalExcelAktif'; // ID unik untuk modal ini
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
            z-index: 10000; /* Pastikan di atas elemen lain */
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
    }

    modal.innerHTML = `
        <p style="margin: 0; font-size: 16px;">${message}</p>
        <button id="${modalId}CloseButton" style="
            background-color: #007bff; color: white; border: none;
            padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;
        ">OK</button>
    `;

    document.getElementById(`${modalId}CloseButton`)?.addEventListener('click', () => modal?.remove());
}