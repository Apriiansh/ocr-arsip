export default function FormLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto card-neon rounded-2xl overflow-hidden">
                {/* Header Skeleton */}
                <div className="bg-primary py-6 px-8 flex items-center justify-between rounded-lg">
                    <div className="h-9 w-3/5 bg-primary-foreground/20 rounded animate-pulse"></div>
                    <div className="h-9 w-1/5 bg-primary-foreground/20 rounded animate-pulse"></div>
                </div>

                <div className="p-8">
                    {/* Upload Section Skeleton */}
                    <div className="mb-8">
                        <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
                            <div className="h-6 w-1/3 bg-muted-foreground/20 rounded animate-pulse mb-4"></div>
                            <div className="h-5 w-1/4 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                            <div className="h-12 bg-input rounded-lg animate-pulse"></div>
                        </div>
                    </div>

                    {/* Form Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Kolom Kiri Skeleton */}
                        <div className="space-y-6">
                            {/* Nomor Berkas */}
                            <div>
                                <div className="h-5 w-1/4 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                                <div className="h-12 bg-input rounded-lg animate-pulse"></div>
                            </div>
                            {/* Kode Klasifikasi */}
                            <div>
                                <div className="h-5 w-1/3 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                                <div className="h-12 bg-input rounded-lg animate-pulse mb-2"></div>
                                <div className="h-12 bg-input rounded-lg animate-pulse"></div>
                            </div>
                            {/* Uraian Informasi */}
                            <div>
                                <div className="h-5 w-1/3 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                                <div className="h-32 bg-input rounded-lg animate-pulse"></div>
                            </div>
                            {/* Kurun Waktu Penciptaan */}
                            <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
                                <div className="h-6 w-1/2 bg-muted-foreground/20 rounded animate-pulse mb-4"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="h-5 w-2/3 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                                        <div className="h-12 bg-input rounded-lg animate-pulse"></div>
                                    </div>
                                    <div>
                                        <div className="h-5 w-2/3 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                                        <div className="h-12 bg-input rounded-lg animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                            {/* Jangka Waktu Aktif */}
                            <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
                                <div className="h-6 w-1/2 bg-muted-foreground/20 rounded animate-pulse mb-4"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="h-5 w-2/3 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                                        <div className="h-12 bg-input rounded-lg animate-pulse"></div>
                                    </div>
                                    <div>
                                        <div className="h-5 w-2/3 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                                        <div className="h-12 bg-input rounded-lg animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Kolom Kanan Skeleton */}
                        <div className="space-y-6">
                            {/* Keterangan, Tingkat Perkembangan, Media Simpan, Jumlah (masing-masing) */}
                            {[...Array(4)].map((_, i) => (
                                <div key={i}>
                                    <div className="h-5 w-1/3 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                                    <div className="h-12 bg-input rounded-lg animate-pulse"></div>
                                </div>
                            ))}
                            {/* Lokasi Penyimpanan */}
                            <div className="bg-muted/40 dark:bg-muted/20 p-6 rounded-xl border border-border/40 shadow-md">
                                <div className="h-6 w-1/2 bg-muted-foreground/20 rounded animate-pulse mb-4"></div>
                                <div className="grid grid-cols-3 gap-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i}>
                                            <div className="h-5 w-2/3 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
                                            <div className="h-12 bg-input rounded-lg animate-pulse"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tombol Aksi Skeleton */}
                    <div className="mt-10 flex justify-end space-x-3">
                        <div className="h-12 w-24 bg-muted rounded-lg animate-pulse"></div>
                        <div className="h-12 w-32 bg-primary/50 rounded-lg animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}