"use client";

import { Suspense } from "react";
import { useArsipAktifForm } from "./hooks/useArsipAktifForm";
import ArsipAktifFormUI from "./components/ArsipAktifFormUI";
import Loading from "./loading";

function ArsipAktifContent() {
  const formLogic = useArsipAktifForm();

  if (formLogic.isAuthLoading || formLogic.ocrLoading) {
    return <Loading />;
  }

  if (formLogic.authError) {
    return <div className="flex items-center justify-center h-full text-red-500">Error Autentikasi: {formLogic.authError}</div>;
  }

  return <ArsipAktifFormUI {...formLogic} />;
}

export default function FormArsipAktifPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ArsipAktifContent />
    </Suspense>
  );
}