import { useState } from "react";
import { toast } from "react-toastify";
import * as pdfjs from "pdfjs-dist";

if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export function usePdfUpload() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Hanya file PDF yang diizinkan.");
      setPdfFile(null);
      setPdfPreviewUrl(null);
      setPageCount(null);
      return;
    }

    setPdfFile(file);
    const fileUrl = URL.createObjectURL(file);
    setPdfPreviewUrl(fileUrl);

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const loadingTask = pdfjs.getDocument({ data: event.target.result as ArrayBuffer });
          const pdfDoc = await loadingTask.promise;
          setPageCount(pdfDoc.numPages);
          toast.info(`Jumlah halaman PDF terdeteksi: ${pdfDoc.numPages} halaman.`);
        } catch (err) {
          toast.error("Gagal membaca jumlah halaman PDF. Harap isi manual.");
          setPageCount(null);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return {
    pdfFile,
    pdfPreviewUrl,
    pageCount,
    handlePdfUpload,
    setPdfFile,
    setPdfPreviewUrl,
    setPageCount, 
  };
}