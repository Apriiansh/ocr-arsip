"use client";

// Loading Skeleton Component
export const LoadingSkeleton = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="bg-primary/10 h-16 flex justify-between items-center px-6 py-4 rounded-lg">
                <div className="h-8 w-3/5 bg-primary/20 rounded-lg"></div>
                <div className="flex gap-2">
                    <div className="h-9 w-28 bg-primary/20 rounded-lg"></div>
                    <div className="h-9 w-28 bg-primary/20 rounded-lg"></div>
                </div>
            </div>

            {/* Filters Skeleton */}
            <div className="px-6 py-4 border-y border-border/50">
                <div className="flex gap-4">
                    <div className="h-10 w-2/3 bg-muted rounded-lg"></div>
                    <div className="h-10 w-1/3 bg-muted rounded-lg"></div>
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="px-6">
                <div className="bg-muted p-4">
                    <div className="h-8 w-full bg-muted-foreground/10 rounded"></div>
                </div>
            </div>
        </div>
    );
};