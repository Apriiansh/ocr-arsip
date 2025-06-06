"use client";

// Skeleton component for loading state
const TableLoadingSkeleton = () => {
    return (
      // Skeleton now renders only the inner content of the card-neon
      <>
        <div className="bg-primary/10 px-6 py-4 flex justify-between items-center rounded-t-xl"> {/* Matches actual header style */}
          <div className="h-8 bg-primary/50 rounded w-3/4 animate-pulse"></div>
        </div>
  
        <div className="p-6 border-b border-border/50 space-y-4"> {/* Matches actual filter area style */}
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20"> {/* Matches actual stats card style */}
            <div className="h-6 bg-muted-foreground/20 rounded w-1/2 mb-2 animate-pulse"></div>
            <div className="h-10 bg-muted-foreground/30 rounded w-1/4 mb-1 animate-pulse"></div>
            <div className="h-4 bg-muted-foreground/10 rounded w-3/4 animate-pulse"></div>
          </div>
          {/* No filter by bidang skeleton needed */}
        </div>
  
        <div className="p-6 flex-grow flex flex-col overflow-auto"> {/* Matches actual table area */}
          <div className="overflow-x-auto rounded-lg border border-border animate-pulse">
              {/* Simplified table skeleton part */}
              <div className="h-10 bg-muted/50 w-full rounded-t-lg"></div> {/* Header row */}
              {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 border-t border-border bg-card flex items-center px-3">
                      <div className="h-4 bg-muted/30 rounded w-full"></div>
                  </div> 
              ))}
          </div>
        </div>
      </>
    );
  };

export default function Loading() {
  return (
    <div className="w-full h-full p-6">
        <div className="max-w-8xl mx-auto w-full h-full flex flex-col">
            <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                <TableLoadingSkeleton />
            </div>
        </div>
    </div>
  );
}