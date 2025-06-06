"use client";

export const ManageUserSkeleton = () => {
    return (
        <div className="bg-background p-4 md:p-8 w-full animate-pulse">
            <div className="max-w-full mx-auto">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="h-8 w-48 bg-muted rounded"></div> {/* Title */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="h-10 w-full sm:w-48 bg-muted rounded-md"></div> {/* Filter */}
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="bg-card shadow-md rounded-lg border border-border overflow-hidden">
                    {/* Table Header Skeleton */}
                    <div className="bg-muted/50">
                        <div className="flex px-6 py-3">
                            {["Nama", "Email", "Jabatan", "Role", "Bidang", "NIP", "Pangkat", "Aksi"].map((_, index) => (
                                <div key={index} className={`flex-1 h-4 bg-muted-foreground/20 rounded ${index < 7 ? 'mr-6' : ''}`}></div>
                            ))}
                        </div>
                    </div>
                    {/* Table Body Skeleton */}
                    <div className="bg-card divide-y divide-border">
                        {[...Array(5)].map((_, rowIndex) => (
                            <div key={rowIndex} className="flex px-6 py-4">
                                {["w-1/4", "w-1/4", "w-1/6", "w-1/6", "w-1/6", "w-1/6", "w-1/6", "w-12"].map((widthClass, colIndex) => (
                                    <div key={colIndex} className={`flex-1 ${widthClass} ${colIndex < 7 ? 'mr-6' : ''}`}>
                                        <div className="h-4 bg-muted/30 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};