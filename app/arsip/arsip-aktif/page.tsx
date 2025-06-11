"use client";

import { Suspense } from "react";
import { useArsipAktifForm } from "./hooks/useArsipAktifForm";
import ArsipAktifFormUI from "./components/ArsipAktifFormUI";
import Loading from "./loading";

function ArsipAktifContent() {
  const formLogic = useArsipAktifForm();

  if (formLogic.authLoading || formLogic.ocrLoading) {
    return <Loading />;
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