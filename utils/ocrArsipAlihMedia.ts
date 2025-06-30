import * as pdfjs from "pdfjs-dist";
import Tesseract from "tesseract.js";
import { SuratAlihMediaData } from "@/app/arsip/alih-media/types";

if (typeof window !== "undefined" && pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

// Utility untuk membersihkan teks hasil OCR dengan lebih baik
function cleanOcrText(text: string): string {
  let cleaned = text;

  // Normalisasi encoding dan karakter khusus
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Perbaiki karakter yang sering salah dibaca OCR
  cleaned = cleaned.replace(/\|/g, "I");
  cleaned = cleaned.replace(/[""]/g, '"');
  cleaned = cleaned.replace(/['']/g, "'");
  cleaned = cleaned.replace(/–/g, "-");
  cleaned = cleaned.replace(/—/g, "-");

  // Normalisasi spasi dan baris baru
  cleaned = cleaned.replace(/[ \t]+/g, " "); // Multiple spaces ke single space
  cleaned = cleaned.replace(/\n[ \t]+/g, "\n"); // Hapus leading spaces di awal baris
  cleaned = cleaned.replace(/[ \t]+\n/g, "\n"); // Hapus trailing spaces di akhir baris
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n"); // Multiple newlines ke double newline

  // Perbaiki pemisahan kata yang terpotong
  cleaned = cleaned.replace(/(\w)-\s*\n\s*(\w)/g, "$1$2");

  return cleaned.trim();
}

// Utility untuk mencari pola dengan multiple variasi dan scoring
function findBestPattern(
  text: string,
  patterns: RegExp[]
): RegExpMatchArray | null {
  let bestMatch: RegExpMatchArray | null = null;
  let bestScore = 0;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      if (value.length > 0) {
        // Score berdasarkan panjang dan kelengkapan
        const score = value.length + (value.includes(" ") ? 5 : 0);
        if (score > bestScore) {
          bestMatch = match;
          bestScore = score;
        }
      }
    }
  }

  return bestMatch;
}

// Format field dengan pembersihan lebih baik
const formatField = (match: RegExpMatchArray | null, index = 1): string => {
  if (!match || !match[index]) return "";

  let value = match[index].trim();

  // Hapus karakter noise umum
  value = value.replace(/^[:\-\s]+/, ""); // Hapus prefix noise
  value = value.replace(/[:\-\s]+$/, ""); // Hapus suffix noise
  value = value.replace(/\s+/g, " "); // Normalisasi spasi

  return value;
};

// Deteksi apakah baris adalah bagian dari kop surat
function isKopSuratLine(line: string): boolean {
  const kopKeywords = [
    /PEMERINTAH/i,
    /DINAS/i,
    /BADAN/i,
    /KANTOR/i,
    /KEMENTERIAN/i,
    /Jalan|Jl\./i,
    /Telepon|Telp|Faximile|Fax/i,
    /e-mail|email|website/i,
    /Kode\s+Pos/i,
  ];

  return (
    kopKeywords.some((pattern) => pattern.test(line)) ||
    (line.length > 10 && /^[A-Z\s]+$/.test(line) && line.split(" ").length <= 6)
  );
}

// Parse hasil OCR ke struktur SuratAlihMediaData yang lebih akurat
export function parseSuratAlihMedia(text: string): Partial<SuratAlihMediaData> {
  const cleanText = cleanOcrText(text);
  // const lines = cleanText
  //   .split("\n")
  //   .map((l) => l.trim())
  //   .filter((l) => l.length > 0);
  const linesArr = cleanText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Temukan akhir kop surat untuk menghindari pembacaan kop sebagai nomor
  let kopEndIndex = 0;
  for (let i = 0; i < Math.min(15, linesArr.length); i++) {
    if (isKopSuratLine(linesArr[i])) {
      kopEndIndex = i + 1;
    } else {
      break;
    }
  }

  // Ambil teks setelah kop untuk parsing field-field surat
  const contentText = linesArr.slice(kopEndIndex).join("\n");

  // --- Improved Regex Patterns (hanya untuk content, bukan kop) ---

  // Pola tanggal yang lebih komprehensif
  const datePatterns = [
    /(?:Palembang|Jakarta|Bandung|Medan|Surabaya|Semarang|Makassar|Yogyakarta|Denpasar),?\s*(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i,
    /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i,
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/,
  ];

  // Pola nomor surat yang lebih spesifik dan menghindari kop
  const nomorPatterns = [
    /Nomor\s*[:=]?\s*([^\n\r]+?)(?:\n|Sifat|Lampiran|Hal)/i,
    /No\.\s*[:=]?\s*([^\n\r]+?)(?:\n|Sifat|Lampiran|Hal)/i,
    /Number\s*[:=]?\s*([^\n\r]+?)(?:\n|Sifat|Lampiran|Hal)/i,
  ];

  const sifatPatterns = [
    /Sifat\s*[:=]?\s*([^\n\r]+?)(?:\n|Lampiran|Hal|Kepada)/i,
    /Klasifikasi\s*[:=]?\s*([^\n\r]+?)(?:\n|Lampiran|Hal|Kepada)/i,
  ];

  const lampiranPatterns = [
    /Lampiran\s*[:=]?\s*([^\n\r]+?)(?:\n|Hal|Kepada)/i,
    /Attachment\s*[:=]?\s*([^\n\r]+?)(?:\n|Hal|Kepada)/i,
  ];

  const halPatterns = [
    /(?:Hal|Perihal)\s*[:=]?\s*([^\n\r]+?)(?:\n|Kepada)/i,
    /Subject\s*[:=]?\s*([^\n\r]+?)(?:\n|Kepada)/i,
    /Re\s*[:=]?\s*([^\n\r]+?)(?:\n|Kepada)/i,
  ];

  const kepadaPatterns = [
    /Kepada\s+(?:Yth\.?|Yang\s+Terhormat)\s*([^\n\r]+?)(?:\n|di\s)/i,
    /Kepada\s*[:=]?\s*([^\n\r]+?)(?:\n|di\s)/i,
    /To\s*[:=]?\s*([^\n\r]+?)(?:\n|di\s)/i,
  ];

  // Pola alamat tujuan dan tempat
  // const alamatTujuanPatterns = [
  //   /Kepada[^\n]*\n\s*([^\n]+?)(?:\n|di\s)/i,
  // ];

  // Perbaikan pola "di" - ambil satu kata saja (nama kota)
  const diPatterns = [
    /\bdi\s*\n?\s*([A-Za-z]+)(?:\s|$|\n)/i,
    /(?:di|at)\s+([A-Za-z]+)(?:\s|$|\n)/i,
  ];

  // --- Ekstraksi dengan pola yang diperbaiki ---
  const tanggalMatch = findBestPattern(contentText, datePatterns);
  const nomorMatch = findBestPattern(contentText, nomorPatterns);
  const sifatMatch = findBestPattern(contentText, sifatPatterns);
  const lampiranMatch = findBestPattern(contentText, lampiranPatterns);
  const halMatch = findBestPattern(contentText, halPatterns);
  const kepadaMatch = findBestPattern(contentText, kepadaPatterns);
  // const alamatTujuanMatch = findBestPattern(contentText, alamatTujuanPatterns);
  const diMatch = findBestPattern(contentText, diPatterns);

  // --- Parsing Isi Surat dengan Algoritma yang Diperbaiki ---
  let bodyText = contentText;

  // Cari titik mulai isi surat (setelah header)
  const headerEndMarkers = [
    halMatch ? halMatch[0] : null,
    kepadaMatch ? kepadaMatch[0] : null,
    diMatch ? diMatch[0] : null,
  ].filter((marker): marker is string => marker !== null);

  let bodyStartIndex = 0;
  if (headerEndMarkers.length > 0) {
    for (const marker of headerEndMarkers) {
      const index = contentText.indexOf(marker);
      if (index !== -1) {
        bodyStartIndex = Math.max(bodyStartIndex, index + marker.length);
      }
    }
  }

  if (bodyStartIndex > 0) {
    bodyText = contentText.substring(bodyStartIndex).trim();
  }

  // PERBAIKAN: Identifikasi blok tanda tangan dengan pola yang lebih spesifik dan konservatif
  const signatureKeywords = [
    /(?:Plt\.?\s+|Plh\.?\s+)?(?:Kepala\s+Dinas|Kepala\s+Bidang|Sekretaris|Kepala\s+Bagian)\s+[A-Za-z\s]+/i,
    /(?:a\.n\.?\s+|atas\s+nama\s+)?(?:Kepala\s+Dinas|Sekretaris)/i,

    // Salam penutup yang jelas menandakan tanda tangan
    /Wassalam|Wassalamu'alaikum/i,
    /Hormat\s+(?:kami|saya)/i,

    // Jabatan yang menandakan tanda tangan (lebih spesifik)
    /(?:Plt\.?\s+|Plh\.?\s+)?(?:Kepala\s+Dinas|Kepala\s+Bidang|Sekretaris|Kepala\s+Bagian)\s+[A-Za-z\s]+/i,
    /(?:a\.n\.?\s+|atas\s+nama\s+)?(?:Kepala\s+Dinas|Sekretaris)/i,

    // Salam penutup
    /Wassalam|Wassalamu'alaikum/i,
    /Hormat\s+(?:kami|saya)/i,
  ];

  let signatureStartIndex = -1;
  for (const keyword of signatureKeywords) {
    const match = bodyText.search(keyword);
    if (match !== -1) {
      // Untuk kata penutup, ambil dari awal kalimat tersebut
      if (
        keyword.source.includes(
          "Demikian|Sekian|terima kasih|Atas|Wassalam|Hormat"
        )
      ) {
        const lastLineStart = bodyText.lastIndexOf("\n", match);
        signatureStartIndex = lastLineStart > 0 ? lastLineStart : match;
      } else {
        signatureStartIndex = match;
      }
      break;
    }
  }

  let mainContentText = bodyText;
  let signatureBlock = "";

  if (signatureStartIndex !== -1) {
    mainContentText = bodyText.substring(0, signatureStartIndex).trim();
    signatureBlock = bodyText.substring(signatureStartIndex).trim();
  }

  // PERBAIKAN: Ekstraksi isi surat dengan deteksi paragraf yang lebih baik
  let isi: string[] = [];
  let penutup = "";

  // Gabungkan baris-baris pendek menjadi paragraf utuh
  const rawLines = mainContentText.split("\n");
  let paragraphs: string[] = [];
  let currentParagraph = "";
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    // Baris kosong = pemisah paragraf
    if (trimmed === "") {
      if (currentParagraph.trim().length > 0) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = "";
      }
      continue;
    }
    // Baris diawali tab atau >=2 spasi = awal paragraf baru
    if (/^(\t|  )/.test(line)) {
      if (currentParagraph.trim().length > 0) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = "";
      }
      currentParagraph = trimmed;
      continue;
    }
    // Heuristik: baris sebelumnya diakhiri tanda baca (termasuk koma) dan baris ini diawali huruf kapital
    if (i > 0) {
      const prev = rawLines[i - 1].trim();
      if (prev && /[\.,:;!?…]$/.test(prev) && /^[A-Z]/.test(trimmed)) {
        if (currentParagraph.trim().length > 0) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = "";
        }
      }
    }
    // Gabung ke paragraf berjalan
    if (currentParagraph) currentParagraph += " ";
    currentParagraph += trimmed;
  }
  if (currentParagraph.trim().length > 0)
    paragraphs.push(currentParagraph.trim());
  // Filter paragraf yang terlalu pendek (tapi lebih permisif)
  paragraphs = paragraphs.filter((p) => p.length > 15);

  const penutupRegex =
    /\b(demikian\s+(?:disampaikan|yang\s+dapat\s+(?:kami\s+)?sampaikan)|sekian\s+(?:disampaikan|yang\s+dapat\s+(?:kami\s+)?sampaikan)|atas\s+perhatian(?:\s+(?:dan\s+)?kerja\s+sama)?.*?terima\s+kasih|terima\s+kasih\s+atas\s+(?:perhatian|kerja\s+sama)|hormat\s+kami|salam|wassalam|wassalamu'alaikum)\b/i;

  const lastIdx = paragraphs.length - 1;
  let penutupIdx = -1;

  for (let i = lastIdx; i >= 0; i--) {
    if (penutupRegex.test(paragraphs[i])) {
      penutupIdx = i;
      break;
    }
  }

  if (penutupIdx === -1 && signatureBlock) {
    // Cek apakah ada kalimat penutup di awal signature block
    const signatureLines = signatureBlock
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let penutupInSignature = "";

    for (let i = 0; i < Math.min(3, signatureLines.length); i++) {
      const line = signatureLines[i];
      if (penutupRegex.test(line)) {
        // Ambil kalimat penutup dan pindahkan dari signature ke penutup
        penutupInSignature = line;
        // Update signature block tanpa kalimat penutup
        signatureBlock = signatureLines.slice(i + 1).join("\n");
        break;
      }
    }

    if (penutupInSignature) {
      isi = paragraphs;
      penutup = penutupInSignature;
    } else {
      // Fallback: jika masih tidak ada, ambil paragraf terakhir sebagai penutup jika mengandung kata kunci lemah
      const lastParagraph = paragraphs[lastIdx];
      if (
        lastParagraph &&
        /\b(terima\s+kasih|hormat|salam)\b/i.test(lastParagraph)
      ) {
        isi = paragraphs.slice(0, lastIdx);
        penutup = lastParagraph;
      } else {
        isi = paragraphs;
        penutup = "";
      }
    }
  } else if (penutupIdx >= 0) {
    // Jika penutup ditemukan di paragraf
    isi = paragraphs.slice(0, penutupIdx);
    penutup = paragraphs.slice(penutupIdx).join("\n\n");
    if (isi.length === 0 && paragraphs.length > 1) {
      isi = [paragraphs[0]];
      penutup = paragraphs.slice(1).join("\n\n");
    }
  } else {
    isi = paragraphs;
    penutup = "";
  }

  // Format tanggal dengan lebih baik
  let formattedTanggal = "";
  if (tanggalMatch) {
    if (tanggalMatch.length >= 4) {
      // Format: Kota, DD MM YYYY
      const kota =
        contentText.match(
          /(?:Palembang|Jakarta|Bandung|Medan|Surabaya|Semarang|Makassar|Yogyakarta|Denpasar)/i
        )?.[0] || "";
      formattedTanggal = kota
        ? `${kota}, ${tanggalMatch[1]} ${tanggalMatch[2]} ${tanggalMatch[3]}`
        : `${tanggalMatch[1]} ${tanggalMatch[2]} ${tanggalMatch[3]}`;
    } else {
      formattedTanggal = tanggalMatch[0];
    }
  }

  // === PARSING BLOK TANDA TANGAN DENGAN STRATEGI BARIS ===
  let ttdJabatan = "";
  let ttdNama = "";
  let ttdPangkat = "";
  let ttdNip = "";
  // Gabungan jabatan dan instansi
  if (signatureBlock) {
    const sigLines = signatureBlock
      .split(/\n|\r/)
      .map((l) => l.trim())
      .filter(Boolean);
    // Cari baris NIP
    let nipIdx = sigLines.findIndex((l) =>
      /NIP\.?\s*[:.]?\s*\d{8,20}/i.test(l)
    );
    if (nipIdx === -1) nipIdx = sigLines.findIndex((l) => /\d{8,20}/.test(l));
    if (nipIdx !== -1) {
      ttdNip = sigLines[nipIdx].replace(/.*?(\d{8,20}).*/, "$1");
      // Pangkat biasanya di atas NIP
      if (nipIdx > 0) {
        const pangkatLine = sigLines[nipIdx - 1];
        if (
          /pangkat|golongan|iv|iii|ii|i|penata|pembina|pengatur/i.test(
            pangkatLine
          )
        ) {
          ttdPangkat = pangkatLine
            .replace(/^(Pangkat|Golongan|:|\s)+/i, "")
            .trim();
        }
      }
      // Nama biasanya di atas pangkat
      if (nipIdx > 1) {
        ttdNama = sigLines[nipIdx - 2];
      } else if (nipIdx > 0) {
        ttdNama = sigLines[nipIdx - 1];
      }
    }
    // Gabungan jabatan dan instansi: dua baris pertama jika mengandung kata jabatan
    if (sigLines.length > 0) {
      // Cari baris yang mengandung kata jabatan (Plt, Plh, Kepala, Sekretaris, dst)
      const jabatanIdx = sigLines.findIndex((l) =>
        /\b(plt|pih|plh|kepala|sekretaris|kabid|bagian|dinas|unit|bidang)\b/i.test(
          l
        )
      );
      if (jabatanIdx !== -1) {
        let jabatanLine = sigLines[jabatanIdx];
        // Koreksi OCR: Pit -> Plt, dst
        jabatanLine = jabatanLine
          .replace(/\bPit\b/i, "Plt")
          .replace(/\bPIt\b/i, "Plt")
          .replace(/\bPLT\b/i, "Plt");
        // Gabungkan dengan baris berikutnya jika mengandung nama instansi/daerah
        const nextLine = sigLines[jabatanIdx + 1] || "";
        if (
          nextLine &&
          /provinsi|kabupaten|kota|dinas|bidang|bagian|sekretariat|sumatera|palembang|pusat|daerah/i.test(
            nextLine
          )
        ) {
          ttdJabatan = `${jabatanLine} ${nextLine}`
            .replace(/\s{2,}/g, " ")
            .trim();
        } else {
          ttdJabatan = jabatanLine;
        }
      }
    }
    // Jika nama masih kosong, cari baris huruf kapital di tengah signature
    if (!ttdNama) {
      const namaIdx = sigLines.findIndex(
        (l) => /^[A-Z][A-Z\s.'-]+$/.test(l) && l.length > 3
      );
      if (namaIdx !== -1) ttdNama = sigLines[namaIdx];
    }
  }

  // Return extracted fields (tanpa kop karena sudah ada default)
  return {
    tanggal: formattedTanggal,
    nomor: formatField(nomorMatch),
    sifat: formatField(sifatMatch),
    lampiran: formatField(lampiranMatch),
    hal: formatField(halMatch),
    kepada: formatField(kepadaMatch),
    di: formatField(diMatch),
    isi: isi.length > 0 ? isi : [""],
    penutup: penutup,
    ttdJabatan: ttdJabatan,
    ttdNama: ttdNama,
    ttdPangkat: ttdPangkat,
    ttdNip: ttdNip,
    qrUrl: "",
  };
}

export async function ocrPdfToText(pdfFile: File): Promise<string> {
  // Inisialisasi workerSrc jika belum
  if (
    typeof window !== "undefined" &&
    pdfjs.GlobalWorkerOptions &&
    !pdfjs.GlobalWorkerOptions.workerSrc
  ) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    disableFontFace: true,
    useSystemFonts: false,
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    try {
      // Coba ekstraksi teks dari PDF terlebih dahulu
      const textContent = await page.getTextContent();
      const textItems = textContent.items as { str: string }[];
      let pageText = textItems.map((item) => item.str).join(" ");

      // Jika teks yang diekstrak terlalu sedikit, gunakan OCR
      if (pageText.trim().length < 100) {
        console.log(
          `Page ${pageNum}: Text extraction insufficient, using OCR...`
        );

        // Render ke canvas dengan resolusi tinggi untuk OCR yang lebih baik
        const viewport = page.getViewport({ scale: 3.0 }); // Tingkatkan skala untuk akurasi OCR
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Konfigurasi Tesseract yang dioptimalkan untuk bahasa Indonesia dan Inggris
        const { data } = await Tesseract.recognize(canvas, "ind+eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(
                `OCR Progress Page ${pageNum}: ${Math.round(m.progress * 100)}%`
              );
            }
          },
        });

        // Cleanup canvas
        canvas.width = 0;
        canvas.height = 0;

        pageText = data.text;
      } else {
        console.log(`Page ${pageNum}: Using extracted text from PDF`);
      }

      fullText += pageText + "\n\n";
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
    }
  }

  return fullText;
}

export async function fetchPdfFromUrl(url: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Gagal mengambil file PDF dari URL");
  const blob = await response.blob();
  const fileName = url.split("/").pop()?.split("?")[0] || "arsip.pdf";
  return new File([blob], fileName, { type: blob.type || "application/pdf" });
}

// Fungsi utama dengan error handling dan progress yang lebih baik
export async function processSuratAlihMedia(
  pdfFile: File,
  onProgress?: (progress: number, message?: string) => void
): Promise<Partial<SuratAlihMediaData>> {
  try {
    onProgress?.(0, "Memulai proses...");

    // Validasi file
    if (!pdfFile.type.includes("pdf")) {
      throw new Error("File harus berformat PDF");
    }

    if (pdfFile.size > 10 * 1024 * 1024) {
      // 10MB limit
      throw new Error("Ukuran file maksimal 10MB");
    }

    onProgress?.(10, "Validasi file berhasil...");

    const text = await ocrPdfToText(pdfFile);

    onProgress?.(70, "Ekstraksi teks selesai, memulai parsing...");

    if (text.trim().length < 50) {
      throw new Error(
        "Tidak dapat mengekstrak teks yang memadai dari PDF. Pastikan file PDF tidak rusak atau kosong."
      );
    }

    const parsed = parseSuratAlihMedia(text);

    onProgress?.(90, "Parsing selesai, finalisasi data...");

    // Validasi hasil parsing
    if (!parsed.nomor && !parsed.hal && !parsed.tanggal) {
      console.warn(
        "Warning: Tidak ada field header yang terdeteksi, kemungkinan format surat tidak standar"
      );
    }

    onProgress?.(100, "Proses selesai!");

    return parsed;
  } catch (error) {
    console.error("Error in processSuratAlihMedia:", error);
    onProgress?.(
      0,
      `Error: ${error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal"}`
    );
    throw error;
  }
}
