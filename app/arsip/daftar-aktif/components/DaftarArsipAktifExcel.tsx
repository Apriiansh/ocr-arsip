import ExcelJS, { BorderStyle } from 'exceljs';
import { ArsipRow, IsiBerkasRow } from '../page'; // Import IsiBerkasRow
import { createClient } from '@/utils/supabase/client'; // Import createClient
import { toast } from 'react-toastify';

interface LokasiPenyimpananExcel {
    no_filing_cabinet?: string | null;
    no_laci: string | null;
    no_folder: string | null;
}
// type ViewModeExcel = "berkas" | "isiBerkas"; // Removed

function getLokasiObjExcel(lokasi: ArsipRow["lokasi_penyimpanan"]): LokasiPenyimpananExcel | null {
    if (!lokasi) return null;
    if (Array.isArray(lokasi)) return lokasi[0] || null;
    return lokasi;
}
interface ExportToExcelProps {
    berkasData: ArsipRow[];
    isiBerkasData: IsiBerkasRow[];
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
const BERKAS_INDUK_FILL_COLOR = 'FFD9EAD3'; // Light Blue/Greenish for parent row

const BORDER_THIN_STYLE: Partial<ExcelJS.Border> = { style: 'thin' as BorderStyle };
const BORDER_MEDIUM_STYLE: Partial<ExcelJS.Border> = { style: 'medium' as BorderStyle };

interface KepalaBidangInfo {
    nama: string;
    nip: string;
    pangkat?: string | null;
    jabatan: string; // Akan berisi "KEPALA BIDANG [NAMA BIDANG]"
}

async function addSignatureBlock(
    worksheet: ExcelJS.Worksheet,
    currentRow: number,
    numCols: number,
    kepalaBidangInfo: KepalaBidangInfo | null,
    workbook: ExcelJS.Workbook
) {
    let newCurrentRow = currentRow + 2; // Misal, 2 baris kosong

    // Posisi tanda tangan (kanan)
    const ttdStartCol = Math.max(1, numCols - 2);

    // --- Bagian Kanan: Tanda Tangan ---
    // Tanggal (Palembang, [Tanggal Sekarang])
    worksheet.mergeCells(newCurrentRow, ttdStartCol, newCurrentRow, ttdStartCol + 2);
    const tanggalCell = worksheet.getCell(newCurrentRow, ttdStartCol);
    const today = new Date();
    const formattedDate = `${today.getDate()} ${today.toLocaleString('id-ID', { month: 'long' })} ${today.getFullYear()}`;
    tanggalCell.value = `Palembang, ${formattedDate}`;
    tanggalCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
    tanggalCell.alignment = { horizontal: 'center' };
    newCurrentRow++;

    // Jabatan Kepala Bidang
    worksheet.mergeCells(newCurrentRow, ttdStartCol, newCurrentRow, ttdStartCol + 2);
    const jabatanCell = worksheet.getCell(newCurrentRow, ttdStartCol);
    jabatanCell.value = kepalaBidangInfo ? kepalaBidangInfo.jabatan : "KEPALA BIDANG";
    jabatanCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true };
    jabatanCell.alignment = { horizontal: 'center' };
    newCurrentRow++;

    // Placeholder untuk TTD (gambar)
    const ttdImageRow = newCurrentRow;
    worksheet.mergeCells(ttdImageRow, ttdStartCol, ttdImageRow + 3, ttdStartCol + 2);

    try {
        const signatureResponse = await fetch('/signature.png');
        if (signatureResponse.ok) {
            const signatureBuffer = await signatureResponse.arrayBuffer();
            const imageId = workbook.addImage({ buffer: signatureBuffer, extension: 'png' });
            worksheet.addImage(imageId, {
                tl: { col: ttdStartCol, row: ttdImageRow - 1 + 0.1 },
                ext: { width: 80, height: 80 }
            });
        }
    } catch (error) {
        console.warn('Gambar tanda tangan tidak dapat dimuat:', error);
    }
    newCurrentRow += 4;

    // Nama Kepala Bidang
    worksheet.mergeCells(newCurrentRow, ttdStartCol, newCurrentRow, ttdStartCol + 2);
    const namaCell = worksheet.getCell(newCurrentRow, ttdStartCol);
    namaCell.value = kepalaBidangInfo ? kepalaBidangInfo.nama.toUpperCase() : "NAMA KEPALA BIDANG";
    namaCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true, underline: true };
    namaCell.alignment = { horizontal: 'center' };
    newCurrentRow++;

    // NIP Kepala Bidang
    worksheet.mergeCells(newCurrentRow, ttdStartCol, newCurrentRow, ttdStartCol + 2);
    const nipCell = worksheet.getCell(newCurrentRow, ttdStartCol);
    nipCell.value = kepalaBidangInfo ? `NIP. ${kepalaBidangInfo.nip}` : "NIP. KEPALA BIDANG";
    nipCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
    nipCell.alignment = { horizontal: 'center' };

    // --- Bagian Kiri: Tanggal Unduh (Sejajar dengan NIP) ---
    const downloadDate = new Date();
    const formattedDownloadTimestamp =
        `${downloadDate.getDate().toString().padStart(2, '0')}/` +
        `${(downloadDate.getMonth() + 1).toString().padStart(2, '0')}/` +
        `${downloadDate.getFullYear()} ` +
        `${downloadDate.getHours().toString().padStart(2, '0')}:` +
        `${downloadDate.getMinutes().toString().padStart(2, '0')}:` +
        `${downloadDate.getSeconds().toString().padStart(2, '0')}`;

    worksheet.mergeCells(newCurrentRow, 1, newCurrentRow, 4); // Merge A-D di baris NIP
    const downloadTimestampCell = worksheet.getCell(newCurrentRow, 1); // Kolom A di baris NIP
    downloadTimestampCell.value = `Diunduh pada: ${formattedDownloadTimestamp}`;
    downloadTimestampCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE - 1, italic: true };
    downloadTimestampCell.alignment = { horizontal: 'left', vertical: 'middle' };

    return newCurrentRow;
}

export const exportArsipAktifToExcel = async ({ berkasData, isiBerkasData, namaBidang, userBidangId }: ExportToExcelProps) => {

    const supabase = createClient();

    if (!berkasData.length) { // Cukup cek berkasData karena isi berkas akan diambil berdasarkan ini
        typeof showCustomAlert === 'function' ? showCustomAlert("Tidak ada data arsip yang ditampilkan untuk diekspor.") : alert("Tidak ada data arsip yang ditampilkan untuk diekspor.");
        return;
    }

    // --- Sheet 1: Daftar Berkas Arsip Aktif ---
    // Filter berkasData untuk hanya menyertakan arsip yang disetujui
    const approvedBerkasData = berkasData.filter(arsip => arsip.status_persetujuan === "Disetujui");

    if (!approvedBerkasData.length) {
        typeof showCustomAlert === 'function' ? showCustomAlert("Tidak ada berkas dengan status 'Disetujui' untuk diekspor.") : alert("Tidak ada berkas dengan status 'Disetujui' untuk diekspor.");
        return;
    }

    if (approvedBerkasData.length < berkasData.length) {
        const message = `Hanya berkas yang berstatus 'Disetujui' yang akan diekspor. ${approvedBerkasData.length} dari ${berkasData.length} berkas akan diproses untuk Sheet 'Daftar Berkas Arsip Aktif'.`;
        typeof showCustomAlert === 'function' ? showCustomAlert(message) : alert(message);
    }

    // --- Sheet 2: Daftar Isi Berkas Arsip ---
    // Ambil semua ID berkas yang disetujui dari Sheet 1
    const approvedBerkasIds = approvedBerkasData.map(arsip => arsip.id_arsip_aktif);

    // PERBAIKAN: Gunakan data `isiBerkasData` yang sudah di-sort dan di-pass dari page.tsx
    // Filter data tersebut untuk hanya menyertakan item yang berkas induknya ada di `approvedBerkasIds`.
    // Ini memastikan konsistensi sorting dan menghindari query database yang tidak perlu.
    const finalIsiBerkasForSheet2 = isiBerkasData.filter(item =>
        approvedBerkasIds.includes(item.id_berkas_induk_fkey)
    );

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
    const berkasSheetName = 'Daftar Berkas Arsip Aktif';
    const berkasSheet = workbook.addWorksheet(berkasSheetName);

    const currentYear = new Date().getFullYear();
    // === HEADER KOP SURAT (Sheet 1) ===
    const KOP_MERGE_RANGE = 'A1:M5'; // Total 13 kolom (A-M)
    berkasSheet.mergeCells(KOP_MERGE_RANGE);

    // Set row heights for Kop
    berkasSheet.getRow(1).height = 25;
    berkasSheet.getRow(2).height = 25;
    berkasSheet.getRow(3).height = 20;
    berkasSheet.getRow(4).height = 15;
    berkasSheet.getRow(5).height = 15;

    // Styling untuk seluruh area Kop (A1:K5)
    const kopCell = berkasSheet.getCell('A1');
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
            berkasSheet.addImage(imageId, {
                tl: { col: 2.46, row: 0.87 }, // Disesuaikan agar pas di kiri dalam merge A1:K5
                ext: { width: 100, height: 86 }, // Ukuran logo disesuaikan
                editAs: 'absolute'
            });
        }
    } catch (error) {
        console.warn('Logo tidak dapat dimuat:', error);
    }
    // === JUDUL UTAMA ===
    berkasSheet.mergeCells('A7:M7');
    const mainTitleCell = berkasSheet.getCell('A7');
    mainTitleCell.value = 'DAFTAR BERKAS ARSIP AKTIF';
    mainTitleCell.font = { name: FONT_ARIAL, size: TITLE_FONT_SIZE, bold: true };
    mainTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    berkasSheet.mergeCells('A8:M8');
    const subTitleCell = berkasSheet.getCell('A8');
    subTitleCell.value = `TAHUN ${currentYear}`;
    subTitleCell.font = { name: FONT_ARIAL, size: SUB_TITLE_FONT_SIZE, bold: true };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // === UNIT PENGOLAH (dipindah ke atas tabel dengan ukuran kecil) ===
    berkasSheet.mergeCells('A10:M10');
    const unitPengolah = berkasSheet.getCell('A10');
    unitPengolah.value = `UNIT PENGOLAH : ${finalNamaBidang?.toUpperCase()}`;
    unitPengolah.font = { name: FONT_ARIAL, size: UNIT_PENGOLAH_FONT_SIZE, bold: true };
    unitPengolah.alignment = { vertical: 'middle', horizontal: 'left' }; // Rata kiri
    berkasSheet.getRow(10).height = 18;

    // === HEADER TABEL ===
    const startRow = 11;
    const numColsBerkas = 13; // Updated to 13 columns

    const headers1Berkas = ['NO\nBERKAS', 'Kode\nKlasifikasi', 'Uraian Informasi Arsip', 'Kurun\nWaktu', 'Jumlah', 'Tingkat\nPerkembangan', 'Media\nSimpan', 'Lokasi Simpan', '', '', 'Jangka Simpan', 'Akses', 'Ket.'];
    const headers2Berkas = ['', '', '', '', '', '', '', 'NO FILING\nKABINET', 'NO LACI', 'NO\nFOLDER', '', '', '']; // Shifted for Media Simpan
    const mergeRangesBerkas = [
        'A11:A12', 'B11:B12', 'C11:C12', 'D11:D12', 'E11:E12', 'F11:F12',
        'G11:G12', // Media Simpan (New)
        'H11:J11', // Lokasi Simpan merged over H, I, J
        'K11:K12', 'L11:L12', 'M11:M12' // Jangka Simpan, Akses, Ket.
    ];

    berkasSheet.getRow(startRow).values = headers1Berkas;
    berkasSheet.getRow(startRow + 1).values = headers2Berkas;
    mergeRangesBerkas.forEach(range => berkasSheet.mergeCells(range));

    // Style header tabel
    for (let row = startRow; row <= startRow + 2; row++) {
        for (let col = 1; col <= numColsBerkas; col++) {
            const cell = berkasSheet.getCell(row, col);
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
    approvedBerkasData.forEach((arsip) => {
        const lokasi = getLokasiObjExcel(arsip.lokasi_penyimpanan);
        const jumlahText = arsip.jumlah ? `${arsip.jumlah} berkas` : '';
        const rowData = [
            arsip.nomor_berkas,
            arsip.kode_klasifikasi || '',
            arsip.uraian_informasi || '',
            arsip.kurun_waktu || '',
            jumlahText,
            arsip.tingkat_perkembangan || '',
            arsip.media_simpan || '', // Added Media Simpan
            lokasi?.no_filing_cabinet || '',
            lokasi?.no_laci || '',
            lokasi?.no_folder || '',
            arsip.jangka_simpan || '',
            arsip.akses || '',
            arsip.keterangan || ''
        ];

        berkasSheet.getRow(currentRow).values = rowData;

        // Style data cells
        for (let col = 1; col <= numColsBerkas; col++) {
            const cell = berkasSheet.getCell(currentRow, col);
            cell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'left', // Default left
                wrapText: true
            };
            // Specific horizontal alignments
            if ([1, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(col)) cell.alignment.horizontal = 'center'; // Adjusted for 13 columns

            cell.border = {
                top: BORDER_THIN_STYLE,
                left: BORDER_THIN_STYLE,
                bottom: BORDER_THIN_STYLE,
                right: BORDER_THIN_STYLE
            };
        }
        currentRow++;
    });

    // === TANDA TANGAN KEPALA BIDANG (SHEET 1) ===
    await addSignatureBlock(berkasSheet, currentRow, numColsBerkas, kepalaBidangInfo, workbook);

    // Set column widths for first sheet
    berkasSheet.columns = [
        { width: 12 }, // NO BERKAS
        { width: 18 }, // Kode Klasifikasi
        { width: 40 }, // URAIAN INFORMASI
        { width: 18 }, // KURUN WAKTU
        { width: 12 }, // JUMLAH
        { width: 17 }, // TINGKAT PERKEMBANGAN
        { width: 15, hidden: true }, // Media Simpan
        { width: 12 }, // NO FILING KABINET (Lokasi Simpan)
        { width: 10 }, // NO LACI
        { width: 10 }, // NO FOLDER
        { width: 25 }, // JANGKA SIMPAN
        { width: 15 }, // AKSES
        { width: 16 }  // KET
    ];

    // === WORKSHEET ISI BERKAS (SHEET KEDUA) ===
    const isiBerkasWorksheetName = 'Daftar Isi Berkas Arsip';
    const isiBerkasWorksheet = workbook.addWorksheet(isiBerkasWorksheetName);

    // === HEADER KOP SURAT (ISI BERKAS) ===
    // Updated to 14 columns (A-N)
    const KOP_MERGE_RANGE_ISI = 'A1:N5'; 
    isiBerkasWorksheet.mergeCells(KOP_MERGE_RANGE_ISI);

    // Set row heights untuk sheet kedua
    isiBerkasWorksheet.getRow(1).height = 25;
    isiBerkasWorksheet.getRow(2).height = 25;
    isiBerkasWorksheet.getRow(3).height = 20;
    isiBerkasWorksheet.getRow(4).height = 15; // Adjusted for 14 columns
    isiBerkasWorksheet.getRow(5).height = 15; // Adjusted for 14 columns

    const kopCellIsiBerkas = isiBerkasWorksheet.getCell('A1');
    kopCellIsiBerkas.value = 'PEMERINTAH PROVINSI SUMATERA SELATAN\nDINAS KEARSIPAN\nJalan Demang Lebar Daun Nomor 4863 Palembang 30137\nTelepon/ Faxsimile : (0711) 364843 / (0711) 364843  Kode Pos 30137\nlaman   ban.arsip@yahoo.co.id , website: www.arsip.sumselprov.go.id';
    kopCellIsiBerkas.font = { name: FONT_ARIAL, size: KOP_FONT_SIZE, bold: true };
    kopCellIsiBerkas.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true, // Adjusted for 14 columns
    };
    kopCellIsiBerkas.border = {
        top: BORDER_THIN_STYLE,
        left: BORDER_THIN_STYLE,
        bottom: BORDER_MEDIUM_STYLE,
        right: BORDER_THIN_STYLE, // Adjusted for 14 columns
    };

    // Add logo image (Isi Berkas)
    try {
        const logoResponse = await fetch('/logosumsel.png');
        if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const imageId = workbook.addImage({
                buffer: logoBuffer,
                extension: 'png',
            });
            isiBerkasWorksheet.addImage(imageId, {
                tl: { col: 2.0, row: 0.87 }, // Disesuaikan untuk 14 kolom
                ext: { width: 100, height: 86 },
                editAs: 'absolute'
            });
        }
    } catch (error) {
        console.warn('Logo tidak dapat dimuat:', error);
    } // Adjusted for 14 columns

    // === JUDUL UTAMA (ISI BERKAS) ===
    isiBerkasWorksheet.mergeCells('A7:N7'); // Updated to 14 columns
    const mainTitleCellIsiBerkas = isiBerkasWorksheet.getCell('A7');
    mainTitleCellIsiBerkas.value = 'DAFTAR ISI BERKAS ARSIP AKTIF';
    mainTitleCellIsiBerkas.font = { name: FONT_ARIAL, size: TITLE_FONT_SIZE, bold: true };
    mainTitleCellIsiBerkas.alignment = { vertical: 'middle', horizontal: 'center' };
    isiBerkasWorksheet.mergeCells('A8:N8'); // Updated to 14 columns
    const subTitleCellIsiBerkas = isiBerkasWorksheet.getCell('A8');
    subTitleCellIsiBerkas.value = `TAHUN ${currentYear}`;
    subTitleCellIsiBerkas.font = { name: FONT_ARIAL, size: SUB_TITLE_FONT_SIZE, bold: true };
    subTitleCellIsiBerkas.alignment = { vertical: 'middle', horizontal: 'center' };

    // === UNIT PENGOLAH (ISI BERKAS) ===
    isiBerkasWorksheet.mergeCells('A10:N10'); // Updated to 14 columns
    const unitPengolahIsiBerkas = isiBerkasWorksheet.getCell('A10');
    unitPengolahIsiBerkas.value = `UNIT PENGOLAH : ${finalNamaBidang?.toUpperCase()}`;
    unitPengolahIsiBerkas.font = { name: FONT_ARIAL, size: UNIT_PENGOLAH_FONT_SIZE, bold: true };
    unitPengolahIsiBerkas.alignment = { vertical: 'middle', horizontal: 'left' };
    isiBerkasWorksheet.getRow(10).height = 18;

    // === HEADER TABEL (ISI BERKAS) ===
    const startRowIsiBerkas = 11;
    const numColsIsiBerkas = 14; // Now 14 columns

    // Added "NO BERKAS INDUK" column
    const headers1IsiBerkas = [
        'NO\nBERKAS\nINDUK', 'NO\nITEM', 'Kode\nKlasifikasi', 'Uraian Informasi Arsip', 'Kurun\nWaktu', 'Jumlah',
        'Tingkat\nPerkembangan', 'Media\nSimpan', 'Lokasi Simpan', '', '',
        'Jangka Simpan', 'Akses', 'Ket.'
    ];

    const headers2IsiBerkas = [
        '', '', '', '', '', '', '', '',
        'NO FILING\nKABINET', 'NO LACI', 'NO\nFOLDER',
        '', '', ''
    ];

    const mergeRangesIsiBerkas = [
        'A11:A12', 'B11:B12', 'C11:C12', 'D11:D12', 'E11:E12', 'F11:F12',
        'G11:G12', // Tingkat Perkembangan
        'H11:H12', // Media Simpan
        'I11:K11', // Lokasi Simpan merged over I, J, K
        'L11:L12', // Jangka Simpan
        'M11:M12', // Akses
        'N11:N12'  // Ket.
    ];

    isiBerkasWorksheet.getRow(startRowIsiBerkas).values = headers1IsiBerkas;
    isiBerkasWorksheet.getRow(startRowIsiBerkas + 1).values = headers2IsiBerkas;
    mergeRangesIsiBerkas.forEach(range => isiBerkasWorksheet.mergeCells(range));

    // Style header tabel (Isi Berkas)
    for (let row = startRowIsiBerkas; row <= startRowIsiBerkas + 1; row++) {
        for (let col = 1; col <= numColsIsiBerkas; col++) {
            const cell = isiBerkasWorksheet.getCell(row, col);
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
                pattern: 'solid', // Adjusted for 14 columns
                fgColor: { argb: HEADER_FILL_COLOR }
            };
        }
    }

    // === DATA ROWS (ISI BERKAS) ===
    let currentRowIsiBerkas = startRowIsiBerkas + 2;

    // Group isi berkas by their parent berkas
    const groupedByBerkasInduk = finalIsiBerkasForSheet2.reduce((acc, item) => {
        const berkasIndukId = item.id_berkas_induk_fkey;
        if (!acc[berkasIndukId]) {
            acc[berkasIndukId] = [];
        }
        acc[berkasIndukId].push(item);
        return acc;
    }, {} as Record<string, IsiBerkasRow[]>);

    // Iterate over the parent berkas (approved ones) to maintain the sort order from sheet 1
    approvedBerkasData.forEach(berkasInduk => {
        const items = groupedByBerkasInduk[berkasInduk.id_arsip_aktif];
        if (!items || items.length === 0) return; // Skip if no items for this parent

        // --- Add Parent Berkas Row (BERKAS INDUK) ---
        const parentLokasiObj = getLokasiObjExcel(berkasInduk.lokasi_penyimpanan);
        const parentJumlahText = berkasInduk.jumlah ? `${berkasInduk.jumlah} berkas` : '';

        const parentRowData = [
            berkasInduk.nomor_berkas, // NO BERKAS INDUK
            '', // NO ITEM (empty for parent row)
            berkasInduk.kode_klasifikasi || '',
            berkasInduk.uraian_informasi || '',
            berkasInduk.kurun_waktu || '',
            parentJumlahText,
            berkasInduk.tingkat_perkembangan || '',
            berkasInduk.media_simpan || '',
            parentLokasiObj?.no_filing_cabinet || '',
            parentLokasiObj?.no_laci || '',
            parentLokasiObj?.no_folder || '',
            berkasInduk.jangka_simpan || '', // Adjusted for 14 columns
            berkasInduk.akses || '', // Adjusted for 14 columns
            berkasInduk.keterangan || ''
        ];

        const parentRow = isiBerkasWorksheet.getRow(currentRowIsiBerkas);
        parentRow.values = parentRowData;

        // Style the parent row (warna biru/hijau muda untuk berkas induk)
        for (let col = 1; col <= numColsIsiBerkas; col++) {
            const cell = parentRow.getCell(col);
            cell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: BERKAS_INDUK_FILL_COLOR } // Warna biru muda untuk berkas induk
            };
            cell.border = {
                top: BORDER_THIN_STYLE,
                left: BORDER_THIN_STYLE,
                bottom: BORDER_THIN_STYLE,
                right: BORDER_THIN_STYLE
            };
            cell.alignment = {
                vertical: 'middle',
                horizontal: [1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(col) ? 'center' : 'left', // Adjusted for 14 columns
                wrapText: true
            };
        } // Adjusted for 14 columns
        currentRowIsiBerkas++;

        // --- Add Children Item Rows (ISI BERKAS) ---
        items.forEach(isi => {
            const jumlahLembarText = isi.jumlah ? `${isi.jumlah} lembar` : '';

            // Gunakan lokasi dari berkas induk untuk isi berkas
            const isiLokasiObj = getLokasiObjExcel(isi.berkas_arsip_aktif?.lokasi_penyimpanan ?? null) || parentLokasiObj;
            
            const itemRowData = [
                '', // NO BERKAS INDUK (empty for item row)
                isi.nomor_item || '', // NO ITEM
                isi.kode_klasifikasi || '',
                isi.uraian_informasi || '',
                isi.kurun_waktu || '',
                jumlahLembarText,
                isi.tingkat_perkembangan || '',
                isi.media_simpan || '',
                isiLokasiObj?.no_filing_cabinet || '', // Lokasi Simpan
                isiLokasiObj?.no_laci || '', // Lokasi Simpan
                isiLokasiObj?.no_folder || '', // Lokasi Simpan
                isi.jangka_simpan || '',
                '', // Akses kosong untuk item isi berkas
                isi.keterangan || ''
            ];

            const itemRow = isiBerkasWorksheet.getRow(currentRowIsiBerkas);
            itemRow.values = itemRowData;

            // Style data cells untuk isi berkas (warna putih/normal)
            for (let col = 1; col <= numColsIsiBerkas; col++) {
                const cell = itemRow.getCell(col);
                cell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(col) ? 'center' : 'left', // Adjusted for 14 columns
                    wrapText: true
                };
                cell.border = { // Adjusted for 14 columns
                    top: BORDER_THIN_STYLE,
                    left: BORDER_THIN_STYLE,
                    bottom: BORDER_THIN_STYLE,
                    right: BORDER_THIN_STYLE
                };
            }
            currentRowIsiBerkas++;
        });
    });

    // === TANDA TANGAN KEPALA BIDANG (SHEET 2) ===
    await addSignatureBlock(isiBerkasWorksheet, currentRowIsiBerkas, numColsIsiBerkas, kepalaBidangInfo, workbook);

    // === COLUMN WIDTHS UNTUK ISI BERKAS ===
    isiBerkasWorksheet.columns = [
        { width: 12 }, // NO BERKAS
        { width: 12 }, // NO ITEM
        { width: 18 }, // Kode Klasifikasi
        { width: 40 }, // URAIAN INFORMASI
        { width: 18 }, // KURUN WAKTU
        { width: 12 }, // JUMLAH
        { width: 17 }, // TINGKAT PERKEMBANGAN
        { width: 15, hidden: true }, // Media Simpan
        { width: 12 }, // NO FILING KABINET (Lokasi Simpan)
        { width: 10 }, // NO LACI
        { width: 10 }, // NO FOLDER
        { width: 25 }, // JANGKA SIMPAN
        { width: 15 }, // AKSES
        { width: 16 }  // KET
    ];

    // === DOWNLOAD ===
    const filePrefix = 'Daftar_Arsip_Aktif';
    const fileName = `${filePrefix}_${finalNamaBidang?.replace(/\s+/g, '_')}_${currentYear}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
};

function showCustomAlert(message: string) {
    const modalId = 'customAlertModalExcelAktif'; 
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