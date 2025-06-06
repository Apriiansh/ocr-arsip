"use client";

// Skeleton Loader Component for Verifikasi Kepala Bidang Page
const VerifikasiLoadingSkeleton = () => {
    return (
      <div className="w-full h-full p-6">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
          <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
            {/* Header Skeleton */}
            <div className="bg-primary/10 px-6 py-4 rounded-lg"> {/* Added rounded-lg here */}
              <div className="h-7 w-1/2 bg-primary/20 rounded animate-pulse"></div>
              <div className="h-4 w-3/4 bg-primary/20 rounded mt-2 animate-pulse"></div>
            </div>
  
            {/* Content Area Skeleton */}
            <div className="p-6 flex-grow overflow-y-auto animate-pulse">
              {/* Permintaan Baru Section Skeleton */}
              <div className="mb-10">
                <div className="h-6 w-1/3 bg-muted/50 rounded mb-4"></div> {/* Section Title */}
                <div className="space-y-6">
                  {[...Array(2)].map((_, index) => (
                    <div key={`pending-${index}`} className="bg-card border border-border rounded-lg p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <div className="h-6 w-3/5 bg-muted/40 rounded mb-1 sm:mb-0"></div>
                        <div className="h-6 w-24 bg-muted/40 rounded"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-5">
                        {[...Array(4)].map((_, fieldIndex) => (
                          <div key={fieldIndex} className="h-4 w-full bg-muted/40 rounded"></div>
                        ))}
                      </div>
                      <div className="h-4 w-1/2 bg-muted/40 rounded mb-5"></div> {/* Status Persetujuan Lain */}
                      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-border">
                        <div className="h-9 w-full sm:w-24 bg-muted/40 rounded-lg"></div>
                        <div className="h-9 w-full sm:w-24 bg-muted/40 rounded-lg"></div>
                        <div className="h-9 w-full sm:w-24 bg-muted/40 rounded-lg"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
  
              {/* Riwayat Verifikasi Section Skeleton (Optional, can be simpler) */}
              <div className="mt-10">
                <div className="h-6 w-1/3 bg-muted/50 rounded mb-4"></div> {/* Section Title */}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default function Loading() {
  return <VerifikasiLoadingSkeleton />;
}