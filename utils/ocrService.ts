// utils/ocrService.ts
import * as pdfjs from 'pdfjs-dist';
import { toast } from "react-toastify";

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface ExtractedData {
  kode_klasifikasi: string;
  uraian_informasi: string;
  tanggal_dokumen?: string;
  tanggal_mulai_suggested?: string;
}

const pdfCache = new Map<string, ExtractedData>(); // Cache hasil ekstraksi PDF

/**
 * Membersihkan teks uraian informasi (Perihal/Hal).
 * @param text Teks mentah yang diekstrak.
 * @returns Teks yang sudah dibersihkan.
 */
const cleanUraianInformasi = (text: string): string => {
  // 1. Hapus spasi berlebih di awal dan akhir
  let cleanedText = text.trim();

  // 2. Hapus titik-titik di akhir jika ada (sering muncul dari OCR)
  cleanedText = cleanedText.replace(/\.+$/, "").trim();

  // 3. Contoh: Hapus kata "Lampiran" atau "Sifat" jika muncul di akhir perihal
  //    Ini mungkin perlu disesuaikan berdasarkan pola dokumen Anda.
  // cleanedText = cleanedText.replace(/\s*Lampiran\s*:.*$/i, "").trim();
  // cleanedText = cleanedText.replace(/\s*Sifat\s*:.*$/i, "").trim();

  return cleanedText;
};

/**
 * Membersihkan kode klasifikasi dengan menghapus bagian setelah slash pertama
 * @param kode Kode klasifikasi yang akan dibersihkan
 * @returns Kode klasifikasi yang sudah dibersihkan
 */
const cleanKodeKlasifikasi = (kode: string): string => {
  // Hapus spasi berlebih
  let cleanedKode = kode.trim();
  
  // Cari posisi slash pertama
  const firstSlashIndex = cleanedKode.indexOf('/');
  
  // Jika ada slash, potong sebelum slash pertama
  if (firstSlashIndex !== -1) {
    cleanedKode = cleanedKode.substring(0, firstSlashIndex);
  }
  
  return cleanedKode.trim();
};

/** 
 * Ekstrak data dari teks PDF dengan regex yang lebih akurat
 * Memperbaiki pengambilan kode klasifikasi dan menambahkan ekstraksi tanggal
 */
export const extractDataFromPDF = (text: string): ExtractedData => {
  let kode_klasifikasi = "";
  let uraian_informasi = "";
  let tanggal_dokumen = "";
  let tanggal_mulai_suggested = "";

  // Cari tanggal dokumen (format: "Kota, DD Bulan YYYY")
  const tanggalHeaderMatch = text.match(/(?:[\w]+),\s+(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i);
  
  if (tanggalHeaderMatch) {
    const tanggal = tanggalHeaderMatch[1].padStart(2, '0');
    const bulan = tanggalHeaderMatch[2];
    const tahun = parseInt(tanggalHeaderMatch[3]);
    
    // Konversi nama bulan ke angka
    const bulanMap: {[key: string]: string} = {
      'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
      'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
      'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
    };
    
    const bulanNum = bulanMap[bulan.toLowerCase()];
    tanggal_dokumen = `${tahun}-${bulanNum}-${tanggal}`;
    
    // Set tanggal mulai suggested sama dengan tanggal dokumen
    tanggal_mulai_suggested = tanggal_dokumen;
  }

  // Regex untuk kode klasifikasi:
  // 1. (?:\d{1,3}(?:\.\d{1,3})+) : Mencocokkan pola seperti 045.4 (pola kode lama) atau 000.1.1.1 (pola kode baru)
  //    (?:\/[\w\.-]+)* : Bagian dengan garis miring setelahnya bersifat opsional untuk pola ini.
  // 2. | (?:\d+)(?:\/[\w\.-]+)+ : ATAU mencocokkan pola seperti 4/xxxxx/2025 (angka diikuti satu atau lebih bagian dengan garis miring).
  // Lookahead (?=\s*(?:\n|\r|Sifat|$)) : Memastikan kode diakhiri oleh baris baru, kata "Sifat", atau akhir teks.
  const kodeRegex = /Nomor\s*:\s*((?:\d{1,3}(?:\.\d{1,3})+)(?:\/[\w\.-]+)*|(?:\d+)(?:\/[\w\.-]+)+)(?=\s*(?:\n|\r|Sifat|$))/i;

  const kodeMatch = text.match(kodeRegex);
  
  if (kodeMatch && kodeMatch[1]) {
    // Ambil kode yang cocok dan bersihkan dari spasi
    const rawKode = kodeMatch[1].replace(/\s+/g, "").trim();
    // Bersihkan kode dengan menghapus bagian setelah slash pertama
    kode_klasifikasi = cleanKodeKlasifikasi(rawKode);
  } else {
    // Cara alternatif jika regex di atas gagal
    const fallbackMatch = text.match(/Nomor\s*:\s*([^\n\r]+)/i);
    if (fallbackMatch) {
      let extractedText = fallbackMatch[1].trim();
      
      // Jika ada kata "Sifat", potong sebelum kata tersebut
      const sifatIndex = extractedText.indexOf("Sifat");
      if (sifatIndex > 0) {
        extractedText = extractedText.substring(0, sifatIndex).trim();
      }
      
      // Coba ekstrak dengan pola yang lebih sederhana
      const simpleKodeMatch = extractedText.match(/(\d+(?:\/[\w\.-]+)+)/);
      if (simpleKodeMatch) {
        const rawKode = simpleKodeMatch[0].replace(/\s+/g, "").trim();
        kode_klasifikasi = cleanKodeKlasifikasi(rawKode);
      } else {
        const rawKode = extractedText.replace(/\s+/g, "").trim();
        kode_klasifikasi = cleanKodeKlasifikasi(rawKode);
      }
    }
  }
  
  // Jika masih ada kata "Sifat" di akhir, hapus
  if (kode_klasifikasi.includes("Sifat")) {
    kode_klasifikasi = kode_klasifikasi.substring(0, kode_klasifikasi.indexOf("Sifat")).trim();
  }

  // Tangkap "Hal" atau "Perihal"
  // Regex ini mencoba mengambil teks hingga akhir baris ATAU hingga menemukan pola seperti "Kepada Yth."
  // yang sering menandakan awal bagian baru dari surat.
  // ([^\n\r]+?) - Grup penangkap yang mengambil karakter apa pun kecuali baris baru, secara non-greedy (malas).
  // (?=...) - Positive lookahead, memastikan pola berikutnya ada, tetapi tidak mengonsumsinya.
  //    \s*\n|\s*\r - Spasi diikuti baris baru (akhir baris).
  //    |\s*Kepada Yth\. - Atau spasi diikuti "Kepada Yth." (awal bagian alamat).
  const uraianRegex = /(?:Hal|Perihal)\s*:\s*([^\n\r]+?)(?=\s*\n|\s*\r|\s*Kepada Yth\.|\s*Nomor\s*:|\s*Lampiran\s*:|\s*Sifat\s*:|$)/i;
  const uraianMatch = text.match(uraianRegex);
  if (uraianMatch && uraianMatch[1]) {
    // Gunakan fungsi pembersihan untuk mendapatkan perihal yang tepat
    uraian_informasi = cleanUraianInformasi(uraianMatch[1]);
  }

  console.log("Extracted data:", { kode_klasifikasi, uraian_informasi, tanggal_dokumen, tanggal_mulai_suggested });

  return { 
    kode_klasifikasi, 
    uraian_informasi,
    tanggal_dokumen,
    tanggal_mulai_suggested 
  };
};

/** Ekstrak teks dari PDF */
export const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
  try {
    // Baca file sebagai ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Load PDF dokumen
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Ekstrak teks dari setiap halaman
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => ('str' in item) ? item.str : '')
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Gagal mengekstrak teks dari PDF');
  }
};

/** Proses PDF dengan caching & loading handler */
export const processPDF = async (
  pdfFile: File,
  onStartLoading?: () => void,
  onFinishLoading?: () => void
): Promise<ExtractedData> => {
  if (!pdfFile) {
    toast.error("File PDF tidak ditemukan.");
    return { kode_klasifikasi: "", uraian_informasi: "" };
  }

  // Buat kunci cache unik berdasarkan nama file dan ukuran
  const cacheKey = `${pdfFile.name}-${pdfFile.size}`;

  // Cek di cache agar tidak proses ulang PDF yang sama
  if (pdfCache.has(cacheKey)) {
    console.log("🔄 Menggunakan hasil ekstraksi PDF dari cache");
    return pdfCache.get(cacheKey) as ExtractedData;
  }

  onStartLoading?.(); // Panggil fungsi loading jika ada

  try {
    // Ekstrak teks dari PDF
    const extractedText = await extractTextFromPDF(pdfFile);

    // Pastikan teks hasil ekstraksi tidak kosong
    if (!extractedText.trim()) {
      toast.warning("⚠️ Tidak ada teks yang terdeteksi dari PDF.");
      return { kode_klasifikasi: "", uraian_informasi: "" };
    }

    // Ekstrak data dari teks PDF
    const extractedData = extractDataFromPDF(extractedText);

    // Log ekstraksi untuk debugging
    console.log("📄 Hasil ekstraksi PDF:", {
      teks: extractedText.substring(0, 500) + '...',
      data: extractedData
    });

    // Simpan hasil ekstraksi ke cache
    pdfCache.set(cacheKey, extractedData);

    toast.success("✅ Ekstraksi PDF berhasil!");
    
    return extractedData;
  } catch (error) {
    console.error("❌ PDF Processing Error:", error);
    toast.error("Terjadi kesalahan dalam pemrosesan PDF.");
    return { kode_klasifikasi: "", uraian_informasi: "" };
  } finally {
    onFinishLoading?.(); // Panggil fungsi loading selesai jika ada
  }
};