"use client";

const TableLoadingSkeleton = () => {
    return (
        <>
            <div className="bg-primary/10 px-6 py-4 flex justify-between items-center  rounded-lg">
                <div className="h-8 w-1/2 bg-primary/20 rounded animate-pulse"></div>
            </div>
            <div className="p-6 border-b border-border/50 flex flex-col md:flex-row gap-4">
                <div className="h-10 flex-grow bg-input rounded-lg animate-pulse"></div>
                <div className="h-10 w-full md:w-1/3 bg-input rounded-lg animate-pulse"></div>
            </div>
            <div className="p-6 flex-grow flex flex-col overflow-auto">
                <div className="overflow-x-auto rounded-lg border border-border animate-pulse">
                    <div className="h-10 bg-muted/50 w-full rounded-t-lg"></div>
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-12 border-t border-border bg-card flex items-center px-3">
                            <div className="h-4 bg-muted/30 rounded w-full"></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-between items-center p-4 border-t border-border/50 mt-auto">
                <div className="h-10 w-28 bg-muted/50 rounded animate-pulse"></div>
                <div className="h-6 w-32 bg-muted/50 rounded animate-pulse"></div>
                <div className="h-10 w-28 bg-muted/50 rounded animate-pulse"></div>
            </div>
        </>
    );
};

export default function Loading() {
  return (
    <div className="w-full h-full p-6">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
            <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                <TableLoadingSkeleton />
            </div>
        </div>
    </div>
  );
}