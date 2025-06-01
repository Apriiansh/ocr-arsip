import ExcelJS, { BorderStyle } from 'exceljs';
import { ArsipAktifLaporanRow } from '../page';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';

interface LokasiPenyimpananExcel {
    no_filing_cabinet?: string | null;
    no_laci: string | null;
    no_folder: string | null;
}

function getLokasiObjExcel(lokasi: ArsipAktifLaporanRow["lokasi_penyimpanan"]): LokasiPenyimpananExcel | null {
    if (!lokasi) return null;
    return lokasi;
}

interface ExportToExcelProps {
    data: ArsipAktifLaporanRow[];
    periodeLaporan: string;
}

// Interface untuk data bidang
interface BidangInfo {
    id_bidang: number;
    nama_bidang: string;
}

// Interface untuk data summary per bulan
interface MonthlySummary {
    month: number;
    monthName: string;
    year: number;
    count: number;
}

// Interface untuk summary per bidang
interface BidangSummary {
    nama_bidang: string;
    total_arsip: number;
    monthly_breakdown: MonthlySummary[];
}

// Constants for Styling
const FONT_ARIAL = 'Arial';
const KOP_FONT_SIZE = 12;
const TITLE_FONT_SIZE = 14;
const SUB_TITLE_FONT_SIZE = 12;
const UNIT_PENGOLAH_FONT_SIZE = 10;
const TABLE_HEADER_FONT_SIZE = 9;
const TABLE_DATA_FONT_SIZE = 9;
const HEADER_FILL_COLOR = 'FFE6E6E6';
const SUMMARY_HEADER_FILL_COLOR = 'FFE6E6E6';

const BORDER_THIN_STYLE: Partial<ExcelJS.Border> = { style: 'thin' as BorderStyle };
const BORDER_MEDIUM_STYLE: Partial<ExcelJS.Border> = { style: 'medium' as BorderStyle };

interface KepalaDinasInfo {
    nama: string;
    nip: string;
    pangkat?: string | null;
    jabatan: string; // Akan selalu "KEPALA DINAS"
}

// Helper function untuk nama bulan dalam Bahasa Indonesia
const getMonthName = (month: number): string => {
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return monthNames[month - 1] || '';
};

const analyzeMonthlySummary = async (
    data: ArsipAktifLaporanRow[],
    periodeLaporan: string,
    supabase: any // Tambahkan parameter supabase
): Promise<BidangSummary[]> => {
    // Determine period range
    const currentYear = new Date().getFullYear();
    let startMonth: number, endMonth: number;

    if (periodeLaporan.toLowerCase().includes('januari')) {
        startMonth = 1;
        endMonth = 6;
    } else {
        startMonth = 7;
        endMonth = 12;
    }

    // Fetch SEMUA bidang dari database (kecuali Sekretariat)
    const { data: semuaBidang, error: bidangError } = await supabase
        .from('daftar_bidang')
        .select('id_bidang, nama_bidang')
        .neq('nama_bidang', 'Sekretariat')
        .order('nama_bidang');

    if (bidangError) {
        console.error('Error fetching bidang for summary:', bidangError);
        // Fallback ke bidang yang ada di data
        const bidangFromData = Array.from(new Set(data.map(arsip =>
            arsip.lokasi_penyimpanan?.daftar_bidang?.nama_bidang || "Bidang Tidak Diketahui"
        )));

        return bidangFromData.map(namaBidang => ({
            nama_bidang: namaBidang,
            total_arsip: 0,
            monthly_breakdown: []
        }));
    }

    // Group existing data by bidang
    const bidangGroups: { [key: string]: ArsipAktifLaporanRow[] } = {};
    data.forEach(arsip => {
        const namaBidang = arsip.lokasi_penyimpanan?.daftar_bidang?.nama_bidang || "Bidang Tidak Diketahui";
        if (!bidangGroups[namaBidang]) {
            bidangGroups[namaBidang] = [];
        }
        bidangGroups[namaBidang].push(arsip);
    });

    // Create summary for ALL bidang (including empty ones)
    const bidangSummaries: BidangSummary[] = [];

    semuaBidang.forEach((bidang: BidangInfo) => {
        const namaBidang = bidang.nama_bidang;
        const bidangData = bidangGroups[namaBidang] || []; // Kosong jika tidak ada data

        // Create monthly breakdown
        const monthlyBreakdown: MonthlySummary[] = [];

        for (let month = startMonth; month <= endMonth; month++) {
            const monthlyCount = bidangData.filter(arsip => {
                const createdDate = new Date(arsip.created_at);
                return createdDate.getMonth() + 1 === month && createdDate.getFullYear() === currentYear;
            }).length;

            monthlyBreakdown.push({
                month,
                monthName: getMonthName(month),
                year: currentYear,
                count: monthlyCount
            });
        }

        bidangSummaries.push({
            nama_bidang: namaBidang,
            total_arsip: bidangData.length,
            monthly_breakdown: monthlyBreakdown
        });
    });

    return bidangSummaries.sort((a, b) => a.nama_bidang.localeCompare(b.nama_bidang));
};

export const exportLaporanArsipAktifKepalaDinasToExcel = async ({ data, periodeLaporan }: ExportToExcelProps) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const currentYear = new Date().getFullYear();
        const supabase = createClient();

        // Fetch semua bidang dari database KECUALI Sekretariat
        // Ambil data Kepala Dinas
        let kepalaDinasInfo: KepalaDinasInfo | null = null;
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
        }

        console.log('Fetching all bidang (excluding Sekretariat)...');
        const { data: semuaBidang, error: bidangError } = await supabase
            .from('daftar_bidang')
            .select('id_bidang, nama_bidang')
            .neq('nama_bidang', 'Sekretariat') // Exclude Sekretariat
            .order('nama_bidang');

        if (bidangError) {
            console.error('Error fetching bidang:', bidangError);
            toast.error("Gagal mengambil data bidang");
            return;
        }

        if (!semuaBidang || semuaBidang.length === 0) {
            toast.info("Tidak ada data bidang ditemukan");
            return;
        }

        // Filter data untuk mengecualikan Sekretariat
        const filteredData = data.filter(arsip =>
            arsip.lokasi_penyimpanan?.daftar_bidang?.nama_bidang !== 'Sekretariat'
        );

        console.log(`Data filtered: ${data.length} -> ${filteredData.length} (excluded Sekretariat)`);

        // Fetch logo untuk workbook ini
        let logoImageId: number | null = null;
        try {
            console.log('Fetching logo...');
            const logoResponse = await fetch('/logosumsel.png');
            if (logoResponse.ok) {
                const logoBuffer = await logoResponse.arrayBuffer();
                logoImageId = workbook.addImage({
                    buffer: logoBuffer,
                    extension: 'png'
                });
                console.log('Logo loaded successfully');
            }
        } catch (error) {
            console.warn('Logo tidak dapat dimuat:', error);
        }

        // Analyze monthly summary - PASS SUPABASE CLIENT
        console.log('Analyzing monthly summary...');
        const bidangSummaries = await analyzeMonthlySummary(filteredData, periodeLaporan, supabase);

        // CREATE SUMMARY SHEET FIRST
        console.log('Creating summary sheet...');
        await createSummarySheet(workbook, logoImageId, bidangSummaries, periodeLaporan, kepalaDinasInfo);

        // Group data arsip berdasarkan bidang (hanya yang ada arsipnya dan bukan Sekretariat)
        console.log('Grouping data by bidang...');
        const dataByBidang: { [key: string]: ArsipAktifLaporanRow[] } = filteredData.reduce((acc, arsip) => {
            const namaBidang = arsip.lokasi_penyimpanan?.daftar_bidang?.nama_bidang || "Bidang Tidak Diketahui";
            if (!acc[namaBidang]) {
                acc[namaBidang] = [];
            }
            acc[namaBidang].push(arsip);
            return acc;
        }, {} as { [key: string]: ArsipAktifLaporanRow[] });

        console.log(`Creating sheets for ${semuaBidang.length} bidang...`);

        // Buat sheet untuk SEMUA bidang (termasuk yang kosong, kecuali Sekretariat)
        let sheetCount = 0;
        const totalSheets = semuaBidang.length;

        for (const bidang of semuaBidang) {
            sheetCount++;
            const namaBidang = bidang.nama_bidang;
            const arsipBidang = dataByBidang[namaBidang] || []; // Kosong jika tidak ada data

            console.log(`Creating sheet ${sheetCount}/${totalSheets}: ${namaBidang} (${arsipBidang.length} arsip)`);

            const worksheet = workbook.addWorksheet(`Bidang ${namaBidang.replace(/_/g, " ")}`);

            // Header KOP SURAT
            await createHeaderSection(worksheet, logoImageId);

            // Judul dan periode
            createTitleSection(worksheet, periodeLaporan, namaBidang);

            // Table header
            createTableHeader(worksheet);

            // Data rows - bahkan jika kosong, tetap buat struktur tabel
            if (arsipBidang.length > 0) {
                await createDataRows(worksheet, arsipBidang);
            } else {
                // Buat baris kosong untuk menunjukkan tidak ada data
                await createEmptyDataRow(worksheet);
            }

            // Set column widths
            setColumnWidths(worksheet);

            // Yield control to browser untuk mencegah freeze
            if (sheetCount % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        console.log('Generating Excel file...');

        // Generate file
        const periodeFileName = periodeLaporan.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Laporan_Arsip_Aktif_Periode_${periodeFileName}_${currentYear}.xlsx`;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Download file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);

        console.log('Export completed successfully');
        toast.success(`Export berhasil! ${semuaBidang.length} bidang diproses (termasuk yang kosong, mengecualikan Sekretariat)`);

    } catch (error) {
        console.error('Export error:', error);
        toast.error("Gagal melakukan export");
        throw error;
    }
};

async function createSummarySheet(
    workbook: ExcelJS.Workbook,
    imageId: number | null,
    bidangSummaries: BidangSummary[],
    periodeLaporan: string,
    kepalaDinasInfo: KepalaDinasInfo | null
) {
    const worksheet = workbook.addWorksheet('RINGKASAN LAPORAN');

    // Header KOP SURAT
    await createHeaderSection(worksheet, imageId);

    // Title - Tetap menggunakan range A7:K7 untuk konsistensi dengan kop
    worksheet.mergeCells('A7:K7');
    const title1 = worksheet.getCell('A7');
    title1.value = 'RINGKASAN LAPORAN ARSIP AKTIF PER BIDANG';
    title1.font = { name: FONT_ARIAL, size: TITLE_FONT_SIZE, bold: true };
    title1.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A8:K8');
    const title2 = worksheet.getCell('A8');
    title2.value = `PERIODE ${periodeLaporan.toUpperCase()}`;
    title2.font = { name: FONT_ARIAL, size: SUB_TITLE_FONT_SIZE, bold: true };
    title2.alignment = { vertical: 'middle', horizontal: 'center' };

    // Calculate total
    const grandTotal = bidangSummaries.reduce((sum, bidang) => sum + bidang.total_arsip, 0);

    // Summary table header - MULAI DARI KOLOM B (kolom ke-2)
    let currentRow = 11;

    // Create dynamic header based on period
    const monthColumns = bidangSummaries[0]?.monthly_breakdown || [];

    // Header dimulai dari kolom B (index 2)
    const headerRow1 = ['', 'NO', 'NAMA BIDANG', 'RINCIAN PER BULAN', ...Array(monthColumns.length - 1).fill(''), 'TOTAL'];
    const headerRow2 = ['', '', '', ...monthColumns.map(m => m.monthName), ''];

    worksheet.getRow(currentRow).values = headerRow1;
    worksheet.getRow(currentRow + 1).values = headerRow2;

    // Merge cells for headers - ADJUSTED untuk mulai dari kolom B
    worksheet.mergeCells(`B${currentRow}:B${currentRow + 1}`); // NO
    worksheet.mergeCells(`C${currentRow}:C${currentRow + 1}`); // NAMA BIDANG
    worksheet.mergeCells(`D${currentRow}:${String.fromCharCode(68 + monthColumns.length - 1)}${currentRow}`); // RINCIAN PER BULAN
    worksheet.mergeCells(`${String.fromCharCode(68 + monthColumns.length)}${currentRow}:${String.fromCharCode(68 + monthColumns.length)}${currentRow + 1}`); // TOTAL

    // Style headers - ADJUSTED untuk mulai dari kolom B (kolom 2-11)
    for (let row = currentRow; row <= currentRow + 1; row++) {
        for (let col = 2; col <= 2 + monthColumns.length + 2; col++) { // Mulai dari kolom 2 (B)
            const cell = worksheet.getCell(row, col);
            cell.font = { name: FONT_ARIAL, size: TABLE_HEADER_FONT_SIZE, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: BORDER_THIN_STYLE,
                left: BORDER_THIN_STYLE,
                bottom: BORDER_THIN_STYLE,
                right: BORDER_THIN_STYLE
            };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_HEADER_FILL_COLOR } };
        }
    }

    worksheet.getRow(currentRow).height = 25;
    worksheet.getRow(currentRow + 1).height = 20;

    // Data rows - ADJUSTED untuk mulai dari kolom B
    currentRow += 2;
    bidangSummaries.forEach((bidang, index) => {
        const rowData = [
            '', // Kolom A kosong
            index + 1, // Kolom B - NO
            bidang.nama_bidang.replace(/_/g, ' '), // Kolom C - NAMA BIDANG
            ...bidang.monthly_breakdown.map(m => m.count), // Kolom D dst - Monthly data
            bidang.total_arsip // Kolom terakhir - TOTAL
        ];

        worksheet.getRow(currentRow).values = rowData;

        // Style data rows - ADJUSTED untuk mulai dari kolom B
        for (let col = 2; col <= 2 + monthColumns.length + 2; col++) { // Mulai dari kolom 2 (B)
            const cell = worksheet.getCell(currentRow, col);
            cell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
            cell.alignment = {
                vertical: 'middle',
                horizontal: col === 3 ? 'left' : 'center' // Kolom 3 (C) untuk nama bidang align left
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

    // Grand total row - ADJUSTED untuk mulai dari kolom B
    const totalRowData = [
        '', // Kolom A kosong
        '', // Kolom B kosong untuk total
        'TOTAL KESELURUHAN', // Kolom C
        ...monthColumns.map(month =>
            bidangSummaries.reduce((sum, bidang) =>
                sum + (bidang.monthly_breakdown.find(m => m.month === month.month)?.count || 0), 0
            )
        ), // Kolom D dst - Monthly totals
        grandTotal // Kolom terakhir - Grand Total
    ];

    worksheet.getRow(currentRow).values = totalRowData;

    // Style total row - ADJUSTED untuk mulai dari kolom B
    for (let col = 2; col <= 2 + monthColumns.length + 2; col++) { // Mulai dari kolom 2 (B)
        const cell = worksheet.getCell(currentRow, col);
        cell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true };
        cell.alignment = {
            vertical: 'middle',
            horizontal: col === 3 ? 'left' : 'center' // Kolom 3 (C) untuk label total align left
        };
        cell.border = {
            top: BORDER_MEDIUM_STYLE,
            left: BORDER_THIN_STYLE,
            bottom: BORDER_MEDIUM_STYLE,
            right: BORDER_THIN_STYLE
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
    }

    // Set column widths for summary - ADJUSTED
    const summaryColumns = [
        { width: 5 },   // A - Kosong (spacer)
        { width: 5 },   // B - NO
        { width: 30 },  // C - NAMA BIDANG
        ...monthColumns.map(() => ({ width: 10 })), // D dst - Month columns
        { width: 10 }   // Kolom terakhir - TOTAL
    ];

    // === TANDA TANGAN KEPALA DINAS (HANYA DI SHEET RINGKASAN) ===
    currentRow += 2; // 2 baris kosong setelah tabel ringkasan

    // Posisi tanda tangan - ADJUSTED untuk tabel yang dimulai dari kolom B
    // Karena tabel sekarang dimulai dari kolom B dan memiliki lebar yang sama,
    // kita tetap bisa menggunakan 3 kolom terakhir dari area tabel
    const ttdStartCol = Math.max(2, summaryColumns.length - 2); // Minimal kolom B, maksimal 3 kolom dari kanan

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
        const signatureResponse = await fetch('/signature.png');
        if (signatureResponse.ok) {
            const signatureBuffer = await signatureResponse.arrayBuffer();
            const imageIdSignature = workbook.addImage({ buffer: signatureBuffer, extension: 'png' });
            worksheet.addImage(imageIdSignature, {
                tl: { col: (ttdStartCol - 1) + 0.95, row: ttdImageRow - 1 + 0.1 },
                ext: { width: 80, height: 80 }
            });
        }
    } catch (error) {
        console.warn('Gambar tanda tangan Kepala Dinas tidak dapat dimuat:', error);
    }
    currentRow += 4; // Lewati baris yang dimerge untuk TTD

    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const namaCell = worksheet.getCell(currentRow, ttdStartCol);
    namaCell.value = kepalaDinasInfo ? kepalaDinasInfo.nama.toUpperCase() : "NAMA KEPALA DINAS";
    namaCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE, bold: true, underline: true };
    namaCell.alignment = { horizontal: 'center' };
    currentRow++;

    worksheet.mergeCells(currentRow, ttdStartCol, currentRow, ttdStartCol + 2);
    const nipCell = worksheet.getCell(currentRow, ttdStartCol);
    nipCell.value = kepalaDinasInfo ? `NIP. ${kepalaDinasInfo.nip}` : "NIP. KEPALA DINAS";
    nipCell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
    nipCell.alignment = { horizontal: 'center' };

    worksheet.columns = summaryColumns;
}

// Helper functions (unchanged but ensuring Sekretariat exclusion where needed)
async function createHeaderSection(worksheet: ExcelJS.Worksheet, imageId: number | null) {
    const KOP_MERGE_RANGE = 'A1:K5';
    worksheet.mergeCells(KOP_MERGE_RANGE);

    // Set row heights
    [1, 2, 3, 4, 5].forEach(row => {
        worksheet.getRow(row).height = row <= 2 ? 25 : row === 3 ? 20 : 15;
    });

    const kopCell = worksheet.getCell('A1');
    kopCell.value = 'PEMERINTAH PROVINSI SUMATERA SELATAN\nDINAS KEARSIPAN\nJalan Demang Lebar Daun Nomor 4863 Palembang 30137\nTelepon/ Faxsimile : (0711) 364843 / (0711) 364843  Kode Pos 30137\nlaman   ban.arsip@yahoo.co.id , website: www.arsip.sumselprov.go.id';
    kopCell.font = { name: FONT_ARIAL, size: KOP_FONT_SIZE, bold: true };
    kopCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    kopCell.border = {
        top: BORDER_THIN_STYLE,
        left: BORDER_THIN_STYLE,
        bottom: BORDER_MEDIUM_STYLE,
        right: BORDER_THIN_STYLE
    };

    // Add logo jika tersedia
    if (imageId !== null) {
        worksheet.addImage(imageId, {
            tl: { col: 1.2, row: 0.87 },
            ext: { width: 100, height: 86 },
            editAs: 'absolute'
        });
    }
}

function createTitleSection(worksheet: ExcelJS.Worksheet, periodeLaporan: string, namaBidang: string) {
    // Title 1
    worksheet.mergeCells('A7:K7');
    const title1 = worksheet.getCell('A7');
    title1.value = 'DAFTAR BERKAS ARSIP AKTIF';
    title1.font = { name: FONT_ARIAL, size: TITLE_FONT_SIZE, bold: true };
    title1.alignment = { vertical: 'middle', horizontal: 'center' };

    // Title 2
    worksheet.mergeCells('A8:K8');
    const title2 = worksheet.getCell('A8');
    title2.value = `PERIODE ${periodeLaporan.toUpperCase()}`;
    title2.font = { name: FONT_ARIAL, size: SUB_TITLE_FONT_SIZE, bold: true };
    title2.alignment = { vertical: 'middle', horizontal: 'center' };

    // Unit Pengolah
    worksheet.mergeCells('A10:K10');
    const unitPengolah = worksheet.getCell('A10');
    unitPengolah.value = `UNIT PENGOLAH : ${namaBidang.replace(/_/g, " ").toUpperCase()}`;
    unitPengolah.font = { name: FONT_ARIAL, size: UNIT_PENGOLAH_FONT_SIZE, bold: true };
    unitPengolah.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(10).height = 18;
}

function createTableHeader(worksheet: ExcelJS.Worksheet) {
    const startRow = 11;
    const headers1 = ['NO\nBERKAS', 'Kode\nKlasifikasi', 'URAIAN INFORMASI ARSIP', 'KURUN\nWAKTU/TANGGAL', 'JUMLAH', 'TINGKAT\nPERKEMBANGAN', 'LOKASI SIMPAN', '', '', 'JANGKA SIMPAN', 'KET'];
    const headers2 = ['', '', '', '', '', '', 'NO FILLING\nKABINET', 'NO LACI', 'NO\nFOLDER', '', ''];

    worksheet.getRow(startRow).values = headers1;
    worksheet.getRow(startRow + 1).values = headers2;

    // Merge cells
    const mergeRanges = ['A11:A12', 'B11:B12', 'C11:C12', 'D11:D12', 'E11:E12', 'F11:F12', 'G11:I11', 'J11:J12', 'K11:K12'];
    mergeRanges.forEach(range => worksheet.mergeCells(range));

    // Style header
    for (let row = startRow; row <= startRow + 1; row++) {
        for (let col = 1; col <= 11; col++) {
            const cell = worksheet.getCell(row, col);
            cell.font = { name: FONT_ARIAL, size: TABLE_HEADER_FONT_SIZE, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: BORDER_THIN_STYLE,
                left: BORDER_THIN_STYLE,
                bottom: BORDER_THIN_STYLE,
                right: BORDER_THIN_STYLE
            };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_COLOR } };
        }
    }

    worksheet.getRow(startRow).height = 40;
    worksheet.getRow(startRow + 1).height = 30;
}

async function createDataRows(worksheet: ExcelJS.Worksheet, arsipBidang: ArsipAktifLaporanRow[]) {
    let currentRow = 13; // startRow + 2
    const batchSize = 100;

    for (let i = 0; i < arsipBidang.length; i += batchSize) {
        const batch = arsipBidang.slice(i, i + batchSize);

        batch.forEach((arsip) => {
            const lokasi = getLokasiObjExcel(arsip.lokasi_penyimpanan);
            const jumlahText = arsip.jumlah ? `${arsip.jumlah} berkas` : '';
            const jangkaSimpanDisplay = arsip.jangka_simpan || '-';

            const rowData = [
                arsip.nomor_berkas,
                arsip.kode_klasifikasi || '',
                arsip.uraian_informasi || '',
                arsip.kurun_waktu || '',
                jumlahText,
                arsip.tingkat_perkembangan || '',
                lokasi?.no_filing_cabinet || '',
                lokasi?.no_laci || '',
                lokasi?.no_folder || '',
                jangkaSimpanDisplay,
                (arsip as any).keterangan || ''
            ];

            worksheet.getRow(currentRow).values = rowData;

            // Style data rows
            for (let col = 1; col <= 11; col++) {
                const cell = worksheet.getCell(currentRow, col);
                cell.font = { name: FONT_ARIAL, size: TABLE_DATA_FONT_SIZE };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: ([1, 5, 6, 7, 8, 9, 10, 11].includes(col)) ? 'center' : 'left',
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

        // Yield control setiap batch
        if (i + batchSize < arsipBidang.length) {
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }
}

// Fungsi baru untuk membuat baris kosong ketika tidak ada data
async function createEmptyDataRow(worksheet: ExcelJS.Worksheet) {
    const currentRow = 13; // startRow + 2

    // Merge semua kolom untuk pesan "Tidak ada data"
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);

    const emptyCell = worksheet.getCell(`A${currentRow}`);
    emptyCell.value = 'Tidak ada data arsip aktif untuk bidang ini';
    emptyCell.font = {
        name: FONT_ARIAL,
        size: TABLE_DATA_FONT_SIZE,
        italic: true,
        color: { argb: 'FF999999' }
    };
    emptyCell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
    };
    emptyCell.border = {
        top: BORDER_THIN_STYLE,
        left: BORDER_THIN_STYLE,
        bottom: BORDER_THIN_STYLE,
        right: BORDER_THIN_STYLE
    };
    emptyCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9F9F9' }
    };

    // Set tinggi baris
    worksheet.getRow(currentRow).height = 25;
}

function setColumnWidths(worksheet: ExcelJS.Worksheet) {
    worksheet.columns = [
        { width: 7 },   // NO BERKAS (A)
        { width: 15 },  // Kode Klasifikasi (B)
        { width: 35 },  // URAIAN INFORMASI ARSIP (C)
        { width: 15 },  // KURUN WAKTU/TANGGAL (D)
        { width: 10 },  // JUMLAH (E)
        { width: 15 },  // TINGKAT PERKEMBANGAN (F)
        { width: 13 },  // NO FILLING KABINET (G)
        { width: 10 },  // NO LACI (H)
        { width: 10 },  // NO FOLDER (I)
        { width: 15 },  // JANGKA SIMPAN (J)
        { width: 25 }   // KET (K)
    ];
}