"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaFolder, FaCheckCircle, FaTasks, FaHourglassHalf, FaExternalLinkAlt, FaChartBar } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext"; // Impor useAuth
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";
import Loading from "./loading";

interface Stats {
    totalArsip: number;
    arsipMenunggu: number;
    arsipDisetujui: number;
    arsipDitolak: number;
}

interface ArsipData {
    id_arsip_aktif: string;
    kode_klasifikasi: string;
    uraian_informasi: string;
    status_persetujuan: string;
    created_at: string;
    user_id: string;
}

interface StatusChartData {
    name: string;
    jumlah: number;
    fill: string;
}

// Stats Cards Component
function StatsCards({ stats }: { stats: Stats }) {
    const statsData = [
        {
            title: "Total Arsip Aktif",
            value: stats.totalArsip,
            icon: FaFolder,
            colorClass: "primary",
            description: "Dokumen di bidang Anda"
        },
        {
            title: "Arsip Disetujui",
            value: stats.arsipDisetujui,
            icon: FaCheckCircle,
            colorClass: "neon-green",
            description: "Sudah disetujui"
        },
        {
            title: "Menunggu Persetujuan",
            value: stats.arsipMenunggu,
            icon: FaHourglassHalf,
            colorClass: "neon-orange",
            description: "Butuh tindakan"
        },
        {
            title: "Arsip Ditolak",
            value: stats.arsipDitolak,
            icon: FaTasks,
            colorClass: "destructive",
            description: "Perlu diperbaiki"
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsData.map((item, index) => (
                <div key={index} className="card-neon p-6 rounded-xl">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${item.colorClass === "primary" ? "bg-primary/10" :
                            item.colorClass === "neon-green" ? "bg-[hsl(var(--neon-green))]/20" :
                                item.colorClass === "neon-orange" ? "bg-[hsl(var(--neon-orange))]/20" :
                                    "bg-destructive/10"
                            }`}>
                            <item.icon className={`w-6 h-6 ${item.colorClass === "primary" ? "text-primary" :
                                item.colorClass === "neon-green" ? "text-[hsl(var(--neon-green))]" :
                                    item.colorClass === "neon-orange" ? "text-[hsl(var(--neon-orange))]" :
                                        "text-destructive"
                                }`} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{item.title}</p>
                            <p className="text-2xl font-bold text-foreground">{item.value}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Status Chart Component
function StatusChart({ data }: { data: StatusChartData[] }) {
    return (
        <div className="lg:col-span-2 card-neon p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <FaChartBar className="text-primary" />
                Status Persetujuan Arsip
            </h3>

            {data.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                        <FaFolder className="mx-auto w-12 h-12 mb-4 opacity-50" />
                        <p>Belum ada data status persetujuan.</p>
                    </div>
                </div>
            ) : (
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis allowDecimals={false} fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '0.5rem'
                                }}
                                formatter={(value) => [value, "Jumlah Arsip"]}
                            />
                            <Legend wrapperStyle={{ fontSize: "14px" }} />
                            <Bar
                                dataKey="jumlah"
                                name="Jumlah Arsip"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// Recent Archives Component - Simplified like Sekretaris
function RecentArchives({ archives, totalArchives }: { archives: ArsipData[], totalArchives: number }) {
    return (
        <div className="card-neon p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <FaFolder className="text-primary" />
                Arsip Terbaru
            </h3>

            <div className="space-y-4">
                {archives.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Belum ada arsip terbaru
                    </div>
                ) : (
                    archives.map((arsip) => (
                        <div key={arsip.id_arsip_aktif} className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm text-foreground">{arsip.kode_klasifikasi}</p>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(arsip.created_at).toLocaleDateString('id-ID')}
                                </span>
                            </div>
                            <p className="font-small text-sm text-foreground mb-2">{arsip.uraian_informasi}</p>
                            <Link
                                href={`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                Lihat Detail <FaExternalLinkAlt size={10} />
                            </Link>
                        </div>
                    ))
                )}
            </div>

            {totalArchives > 5 && (
                <Link
                    href="/unit-pengolah/verifikasi-arsip"
                    className="text-sm text-primary hover:underline mt-4 inline-block"
                >
                    Lihat Selengkapnya...
                </Link>
            )}
        </div>
    );
}

// Loading Skeletons
function StatsLoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
                <div key={index} className="card-neon p-6 rounded-xl animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-lg"></div>
                        <div className="flex-1">
                            <div className="h-3 bg-muted rounded mb-2"></div>
                            <div className="h-6 bg-muted rounded mb-1"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ChartLoadingSkeleton() {
    return (
        <div className="lg:col-span-2 card-neon p-6 rounded-xl">
            <div className="animate-pulse">
                <div className="h-6 bg-muted rounded mb-6 w-3/4"></div>
                <div className="h-[300px] bg-muted rounded"></div>
            </div>
        </div>
    );
}

function ArchivesLoadingSkeleton() {
    return (
        <div className="card-neon p-6 rounded-xl">
            <div className="animate-pulse">
                <div className="h-6 bg-muted rounded mb-6 w-1/2"></div>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 bg-muted rounded-lg">
                            <div className="h-4 bg-muted-foreground/20 rounded mb-2 w-3/4"></div>
                            <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Main Dashboard Component
function DashboardContent() {
    const supabase = createClient();
    const router = useRouter();
    const { user, isLoading: isAuthLoading, error: authError } = useAuth(); // Gunakan useAuth
    const [dataLoading, setDataLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState<string | null>(null); // Ganti nama state error data

    const [stats, setStats] = useState<Stats>({
        totalArsip: 0,
        arsipMenunggu: 0,
        arsipDisetujui: 0,
        arsipDitolak: 0
    });

    // userName & userBidang removed (lint: assigned but never used)
    const [chartData, setChartData] = useState<StatusChartData[]>([]);
    const [recentArchives, setRecentArchives] = useState<ArsipData[]>([]);

    const ALLOWED_ROLE = "Kepala_Bidang";
    // Hapus SIGN_IN_PATH dan DEFAULT_HOME_PATH karena AuthContext yang menangani redirect

    const fetchDashboardData = useCallback(async (bidangId: number) => {
        try {
            setDataLoading(true);
            setDashboardError(null);

            const { data: lokasiDiBidang, error: lokasiError } = await supabase
                .from("lokasi_penyimpanan")
                .select("id_lokasi")
                .eq("id_bidang_fkey", bidangId);

            if (lokasiError) throw lokasiError;

            const lokasiIds: string[] = lokasiDiBidang?.map((l: { id_lokasi: string }) => l.id_lokasi) || [];
            if (lokasiIds.length === 0) {
                setStats({ totalArsip: 0, arsipMenunggu: 0, arsipDisetujui: 0, arsipDitolak: 0 });
                setChartData([]);
                setRecentArchives([]);
                return;
            }

            const { data: arsipData, error: arsipError } = await supabase
                .from("arsip_aktif")
                .select(`
                    id_arsip_aktif,
                    kode_klasifikasi,
                    uraian_informasi,
                    status_persetujuan,
                    created_at,
                    user_id
                `)
                .in("id_lokasi_fkey", lokasiIds)
                .order("created_at", { ascending: false });

            if (arsipError) throw arsipError;

            const newStats = {
                totalArsip: arsipData.length,
                arsipMenunggu: arsipData.filter((a: ArsipData) => a.status_persetujuan === "Menunggu").length,
                arsipDisetujui: arsipData.filter((a: ArsipData) => a.status_persetujuan === "Disetujui").length,
                arsipDitolak: arsipData.filter((a: ArsipData) => a.status_persetujuan === "Ditolak").length
            };

            const newChartData: StatusChartData[] = [
                { name: "Disetujui", jumlah: newStats.arsipDisetujui, fill: "hsl(var(--neon-green))" },
                { name: "Menunggu", jumlah: newStats.arsipMenunggu, fill: "hsl(var(--neon-orange))" },
                { name: "Ditolak", jumlah: newStats.arsipDitolak, fill: "hsl(var(--destructive))" }
            ].filter(d => d.jumlah > 0);

            setStats(newStats);
            setChartData(newChartData);
            setRecentArchives((arsipData as ArsipData[]).slice(0, 4));

        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Failed to fetch dashboard data";
            console.error("Dashboard error:", message);
            setDashboardError(message);
            toast.error("Gagal memuat data dashboard.");
        } finally {
            setDataLoading(false);
        }
    }, [supabase]);

    // Efek untuk menangani status autentikasi dan memuat data dashboard
    useEffect(() => {
        // Jika AuthContext masih loading, tunggu
        if (isAuthLoading) return;

        // Jika ada error dari AuthContext, tampilkan dan jangan lanjutkan
        if (authError) {
            // setDashboardError(authError); // Bisa set error lokal jika ingin menampilkannya di UI ini
            // router.push("/sign-in"); // AuthContext mungkin sudah redirect
            return;
        }

        // Jika tidak ada user setelah AuthContext selesai loading, redirect (AuthContext seharusnya sudah melakukan ini)
        if (!user) {
            // router.push("/sign-in"); // AuthContext handles this
            return;
        }

        // Verifikasi role pengguna dan kelengkapan data bidang
        if (user.role !== ALLOWED_ROLE || !user.id_bidang_fkey) {
            toast.warn("Anda tidak memiliki izin atau data bidang tidak lengkap.");
            // router.push(DEFAULT_HOME_PATH); // AuthContext/HomeRedirect handles this
            return;
        }

        // Jika user terautentikasi dan memiliki role serta bidang yang valid, fetch data dashboard
        fetchDashboardData(user.id_bidang_fkey);
    }, [user, isAuthLoading, authError, fetchDashboardData, router]); // Tambahkan user, isAuthLoading, authError sebagai dependency

    if (isAuthLoading || (dataLoading && !stats.totalArsip)) { // Gunakan isAuthLoading
        return <Loading />;
    }

    // Tampilkan error dari AuthContext atau error data dashboard
    if (authError) {
        return (
            <div className="bg-background flex flex-col items-center justify-center p-6 w-full h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Autentikasi Gagal</h2>
                    <p className="text-muted-foreground mb-6">{authError}</p>
                    {/* Tombol untuk kembali ke sign-in mungkin lebih cocok di sini */}
                </div>
            </div>
        );
    }
    if (dashboardError) {
        return (
            <div className="bg-background flex flex-col items-center justify-center p-6 w-full h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Terjadi Kesalahan</h2>
                    <p className="text-muted-foreground mb-6">{dashboardError}</p>
                    <button
                        onClick={() => user?.id_bidang_fkey && fetchDashboardData(user.id_bidang_fkey)} // Perbaiki onClick dan pastikan bidangId ada
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }
    // Jika user tidak ada setelah loading auth selesai (seharusnya sudah di-redirect oleh AuthContext)
    if (!user) {
        // Bisa return null atau komponen "Unauthorized" jika AuthContext tidak redirect
        return <Loading />; // Atau null, karena redirect seharusnya sudah terjadi
    }

    return (
        <div className="bg-background p-6 w-full h-full">
            <div className="max-w-screen-2xl mx-auto w-full h-full space-y-8">
                {/* Stats Cards */}
                <Suspense fallback={<StatsLoadingSkeleton />}>
                    {dataLoading ? <StatsLoadingSkeleton /> : <StatsCards stats={stats} />}
                </Suspense>

                {/* Charts and Recent Archives */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Suspense fallback={<ChartLoadingSkeleton />}>
                        {dataLoading ? <ChartLoadingSkeleton /> : <StatusChart data={chartData} />}
                    </Suspense>

                    <Suspense fallback={<ArchivesLoadingSkeleton />}>
                        {dataLoading ? <ArchivesLoadingSkeleton /> : <RecentArchives archives={recentArchives} totalArchives={stats.totalArsip} />}
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

export default function KepalaBidangDashboard() {
    return (
        <Suspense fallback={
            <div className="bg-background p-6 w-full h-full">
                <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-center">
                    <LoadingSkeleton />
                </div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}