"use client";

import { Suspense } from "react";
import { useArsipAktifForm } from "./useArsipAktifForm";
import ArsipAktifFormUI from "./components/ArsipAktifFormUI";
import FormLoadingSkeleton from "./components/FormLoadingSkeleton"; // Impor skeleton yang konsisten

// Komponen ini akan memanggil hook yang menggunakan useSearchParams
// dan akan dirender di dalam Suspense
function ArsipAktifContent() {
  const formLogic = useArsipAktifForm();

  // Tampilkan skeleton jika authLoading (data awal) atau ocrLoading (proses OCR) sedang true
  if (formLogic.authLoading || formLogic.ocrLoading) {
    return <FormLoadingSkeleton />;
  } 

  return <ArsipAktifFormUI {...formLogic} />;
}

export default function FormArsipAktifPage() {
  return (
    // Suspense ini akan menggunakan FormLoadingSkeleton dari components
    // karena loading.tsx juga menggunakan komponen yang sama.
    // Next.js secara otomatis akan menggunakan loading.tsx sebagai fallback untuk Suspense di level rute.
    // Jadi, fallback di sini berfungsi jika ArsipAktifContent sendiri membutuhkan waktu untuk load (misal, code-splitting).
    <Suspense fallback={<FormLoadingSkeleton />}>
      <ArsipAktifContent />
    </Suspense>
  );
}