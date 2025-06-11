"use client";

// Skeleton Component dipindahkan ke sini
const TableLoadingSkeleton = () => {
    return (
      <>
        {/* Header Skeleton (mimicking the one inside card-neon) */}
        <div className="bg-primary/10 px-6 py-4 flex justify-between items-center">
          <div className="h-8 w-48 bg-primary/20 rounded animate-pulse"></div> {/* Skeleton untuk Judul "Daftar Arsip Aktif" */}
          <div className="flex gap-2"> {/* Kontainer untuk skeleton tombol */}
            <div className="h-9 w-32 bg-primary/20 rounded animate-pulse"></div> {/* Skeleton untuk tombol Export Excel */}
            <div className="h-9 w-36 bg-primary/20 rounded animate-pulse"></div> {/* Skeleton untuk tombol Visualisasi Filing */}
          </div>
        </div>
  
        {/* Search Bar Skeleton */}
        <div className="p-6 border-b border-border/50">
          <div className="h-12 bg-input rounded-lg animate-pulse"></div>
        </div>
  
        {/* Filter/Action Skeleton */}
        <div className="px-6 py-3 border-b border-border/50 flex justify-between items-center">
          <div className="h-10 w-48 bg-input rounded-lg animate-pulse"></div> {/* For filter select */}
          <div className="h-10 w-32 bg-accent/50 rounded-lg animate-pulse"></div> {/* For reorder button */}
        </div>
  
        {/* Table Skeleton */}
        <div className="p-6 flex-grow flex flex-col overflow-auto">
          <div className="overflow-x-auto rounded-lg border border-border animate-pulse">
            <div className="h-10 bg-muted/50 w-full rounded-t-lg"></div> {/* Header row */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 border-t border-border bg-card flex items-center px-3">
                <div className="h-4 bg-muted/30 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
  
        {/* Pagination Skeleton */}
        <div className="flex justify-between items-center p-4 border-t border-border/50 mt-auto">
          <div className="h-10 w-28 bg-muted/50 rounded animate-pulse"></div>
          <div className="h-6 w-32 bg-muted/50 rounded animate-pulse"></div>
          <div className="h-10 w-28 bg-muted/50 rounded animate-pulse"></div>
        </div>
      </>
    );
  };

export default function Loading() {
  // Wrapper untuk skeleton agar konsisten dengan halaman lain
  return (
    <div className="w-full h-full p-6">
        <div className="max-w-10xl mx-auto w-full h-full flex flex-col">
            <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                <TableLoadingSkeleton />
            </div>
        </div>
    </div>
  );
}