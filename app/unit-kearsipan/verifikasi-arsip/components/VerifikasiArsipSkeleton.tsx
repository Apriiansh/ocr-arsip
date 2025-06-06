"use client";

// Loading Skeleton Component
export const LoadingSkeleton = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton (as part of the page skeleton) */}
            <div className="bg-primary/10 h-16 flex justify-between items-center px-6 py-4 rounded-t-xl">
                <div className="h-8 w-3/5 bg-primary/20 rounded-lg"></div>
                <div className="flex gap-2">
                    <div className="h-9 w-28 bg-primary/20 rounded-lg"></div>
                    <div className="h-9 w-28 bg-primary/20 rounded-lg"></div>
                </div>
            </div>

            {/* Filters Skeleton (as part of the page skeleton) */}
            <div className="px-6 py-4 border-y border-border/50">
                <div className="flex gap-4">
                    <div className="h-10 w-2/3 bg-muted rounded-lg"></div>
                    <div className="h-10 w-1/3 bg-muted rounded-lg"></div>
                </div>
            </div>

            {/* Table Skeleton (actual table structure) */}
            <div className="overflow-x-auto px-6 py-4">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-muted text-muted-foreground"> 
                            <th className="px-4 py-3 w-12"><div className="h-4 w-4 bg-muted-foreground/20 rounded mx-auto"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-24 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-20 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-48 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-48 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-32 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-24 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-28 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-24 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-20 bg-muted-foreground/20 rounded"></div></th> 
                            <th className="px-4 py-3"><div className="h-4 w-20 bg-muted-foreground/20 rounded"></div></th> 
                            <th className="px-4 py-3"><div className="h-4 w-20 bg-muted-foreground/20 rounded"></div></th> 
                            <th className="px-4 py-3"><div className="h-4 w-28 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-24 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-20 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-20 bg-muted-foreground/20 rounded"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-16 bg-muted-foreground/20 rounded mx-auto"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-24 bg-muted-foreground/20 rounded mx-auto"></div></th>
                            <th className="px-4 py-3"><div className="h-4 w-24 bg-muted-foreground/20 rounded mx-auto"></div></th>
                        </tr>
                    </thead>
                </table>
            </div>
        </div>
    );
};