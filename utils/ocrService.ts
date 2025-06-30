import * as pdfjs from "pdfjs-dist";
import Tesseract from "tesseract.js";
import { toast } from "react-toastify";

// Inisialisasi PDF.js worker
if (typeof window !== "undefined" && pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface ExtractedData {
  uraian_informasi: string;
  tanggal_mulai_suggested?: string;
}

const pdfCache = new Map<string, ExtractedData>();

const MONTH_MAP: { [key: string]: string } = {
  januari: "01", februari: "02", maret: "03", april: "04",
  mei: "05", juni: "06", juli: "07", agustus: "08",
  september: "09", oktober: "10", november: "11", desember: "12"
};

function cleanUraianInformasi(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/\.+$/, "").trim();
  return cleaned;
}

// OCR satu halaman PDF ke teks
async function ocrPdfPageToText(pdfPage: pdfjs.PDFPageProxy): Promise<string> {
  const viewport = pdfPage.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d")!;
  await pdfPage.render({ canvasContext: context, viewport }).promise;
  const { data } = await Tesseract.recognize(canvas, "ind");
  // Bersihkan canvas jika perlu
  canvas.width = 0; canvas.height = 0;
  return data.text;
}

export const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const pageText = await ocrPdfPageToText(page);
    fullText += pageText + "\n";
  }
  return fullText;
};

// Regex parsing hanya uraian informasi (Hal/Perihal) & tanggal surat
export const extractDataFromPDF = (text: string): ExtractedData => {
  // Uraian informasi (Hal/Perihal)
  const uraianRegex = /(?:Hal|Perihal)\s*:\s*([^\n\r]+?)(?=\s*\n|\s*\r|\s*Kepada Yth\.|$)/i;
  const uraianMatch = text.match(uraianRegex);
  const uraian_informasi = uraianMatch && uraianMatch[1] ? cleanUraianInformasi(uraianMatch[1]) : "";

  // Tanggal dokumen (format: Kota, DD Bulan YYYY)
  const tanggalHeaderMatch = text.match(/(?:[\w]+),\s+(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i);
  let tanggal_mulai_suggested = "";
  if (tanggalHeaderMatch) {
    const tanggal = tanggalHeaderMatch[1].padStart(2, "0");
    const bulan = tanggalHeaderMatch[2].toLowerCase();
    const tahun = tanggalHeaderMatch[3];
    const bulanNum = MONTH_MAP[bulan];
    if (bulanNum) tanggal_mulai_suggested = `${tahun}-${bulanNum}-${tanggal}`;
  }

  return {
    uraian_informasi,
    tanggal_mulai_suggested: tanggal_mulai_suggested || undefined,
  };
};

export const processPDF = async (
  pdfFile: File,
  onStartLoading?: () => void,
  onFinishLoading?: () => void
): Promise<ExtractedData> => {
  if (!pdfFile) {
    toast.error("File PDF tidak ditemukan.");
    return { uraian_informasi: "", tanggal_mulai_suggested: undefined };
  }

  const cacheKey = `${pdfFile.name}-${pdfFile.size}`;
  if (pdfCache.has(cacheKey)) {
    return pdfCache.get(cacheKey)!;
  }

  onStartLoading?.();

  try {
    const extractedText = await extractTextFromPDF(pdfFile);
    if (!extractedText.trim()) {
      toast.warning("⚠️ Tidak ada teks yang terdeteksi dari PDF.");
      return { uraian_informasi: "", tanggal_mulai_suggested: undefined };
    }
    const extractedData = extractDataFromPDF(extractedText);
    pdfCache.set(cacheKey, extractedData);
    toast.success("✅ OCR PDF selesai!");
    return extractedData;
  } catch (error) {
    console.error("❌ OCR PDF Error:", error);
    toast.error("Terjadi kesalahan dalam OCR PDF.");
    return { uraian_informasi: "", tanggal_mulai_suggested: undefined };
  } finally {
    onFinishLoading?.();
  }
};