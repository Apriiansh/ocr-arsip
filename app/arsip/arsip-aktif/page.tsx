"use client";

import { Suspense } from "react";
import { useArsipAktifForm } from "./hooks/useArsipAktifForm";
import ArsipAktifFormUI from "./components/ArsipAktifFormUI";
import FormLoadingSkeleton from "./components/FormLoadingSkeleton"; 

function ArsipAktifContent() {
  const formLogic = useArsipAktifForm();

  if (formLogic.authLoading || formLogic.ocrLoading) {
    return <FormLoadingSkeleton />;
  } 

  return <ArsipAktifFormUI {...formLogic} />;
}

export default function FormArsipAktifPage() {
  return (
    <Suspense fallback={<FormLoadingSkeleton />}>
      <ArsipAktifContent />
    </Suspense>
  );
}