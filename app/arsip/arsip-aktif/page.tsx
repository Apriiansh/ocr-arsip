"use client";

import { Suspense } from "react";
import { useArsipAktifForm } from "./useArsipAktifForm";
import ArsipAktifFormUI from "./components/ArsipAktifFormUI";

// Loading Skeleton Component
const FormLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-muted/30 p-4 mb-6 rounded-lg">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mx-auto text-center"></div>
          </div>

          {/* Main Form Card */}
          <div className="bg-card rounded-lg shadow-lg">
            {/* Upload Section */}
            <div className="p-6 border-b border-border">
              <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4"></div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="h-10 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="w-32">
                  <div className="h-10 bg-muted rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* No Berkas */}
                  <div>
                    <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>

                  {/* Kode Klasifikasi */}
                  <div>
                    <div className="h-5 w-32 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>

                  {/* Detail Kode */}
                  <div>
                    <div className="h-5 w-28 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>

                  {/* Uraian Informasi */}
                  <div>
                    <div className="h-5 w-32 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-24 bg-muted rounded animate-pulse"></div>
                  </div>

                  {/* Periode Arsip */}
                  <div className="bg-muted/10 p-4 rounded-lg">
                    <div className="h-5 w-28 bg-muted rounded animate-pulse mb-4"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div>
                        <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div>
                        <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div>
                        <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Jumlah */}
                  <div>
                    <div className="h-5 w-16 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>

                  {/* Keterangan */}
                  <div>
                    <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>

                  {/* Tingkat Perkembangan */}
                  <div>
                    <div className="h-5 w-40 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>

                  {/* Media Simpan */}
                  <div>
                    <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>

                  {/* Lokasi Penyimpanan */}
                  <div className="bg-muted/10 p-4 rounded-lg">
                    <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4"></div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div>
                        <div className="h-5 w-20 bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div>
                        <div className="h-5 w-20 bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-6">
                <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
                <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Komponen ini akan memanggil hook yang menggunakan useSearchParams
// dan akan dirender di dalam Suspense
function ArsipAktifContent() {
  const formLogic = useArsipAktifForm();

  if (formLogic.ocrLoading) {
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