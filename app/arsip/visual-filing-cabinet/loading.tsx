"use client";

// Skeleton Component dipindahkan ke sini
const VisualizationLoadingSkeleton = () => {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-7xl mx-auto bg-card text-card-foreground rounded-xl shadow-lg overflow-hidden">
          {/* Header Skeleton */}
          <div className="bg-primary text-primary-foreground px-6 py-4">
            <div className="h-8 w-64 bg-primary-foreground/20 rounded animate-pulse"></div>
          </div>
  
          {/* Content Skeleton */}
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <div className="h-6 w-48 bg-muted/50 rounded animate-pulse mb-4"></div>
                <div className="space-y-2">
                  {[...Array(2)].map((_, subIndex) => (
                    <div key={subIndex} className="ml-6 h-4 w-64 bg-muted/50 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

export default function Loading() {
  return <VisualizationLoadingSkeleton />;
}