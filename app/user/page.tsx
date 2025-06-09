"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaRegFileAlt, FaRegCalendarAlt, FaRegCopy, FaFolder, FaExternalLinkAlt, FaChartBar } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { Bell, ArrowRight, X as LucideX, Eye } from "lucide-react";
import { differenceInDays } from "date-fns";
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";

interface Stats {
    totalArsip: number;
    arsipBulanIni: number;
    arsipDipindahkan: number;
}

interface ArsipData {
    id_arsip_aktif: string;
    kode_klasifikasi: string;
    uraian_informasi: string;
    created_at: string;
}

interface ArsipJatuhTempo extends ArsipData {
    jangka_simpan: string | null;
    selisih_hari?: number;
}

// Stats Cards Component
function StatsCards({ stats }: { stats: Stats }) {
    const statsData = [
        {
            title: "Arsip Bulan Ini",
            value: stats.arsipBulanIni,
            icon: FaRegFileAlt,
            colorClass: "primary",
            description: "Ditambahkan bulan ini"
        },
        {
            title: "Total Arsip",
            value: stats.totalArsip,
            icon: FaRegCalendarAlt,
            colorClass: "neon-green",
            description: "Keseluruhan arsip"
        },
        {
            title: "Arsip Dipindahkan",
            value: stats.arsipDipindahkan,
            icon: FaRegCopy,
            colorClass: "neon-orange",
            description: "Sudah dipindahkan"
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsData.map((item, index) => (
                <div key={index} className="card-neon p-6 rounded-xl">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${item.colorClass === "primary" ? "bg-primary/10" :
                                item.colorClass === "neon-green" ? "bg-[hsl(var(--neon-green))]/20" :
                                    "bg-[hsl(var(--neon-orange))]/20"
                            }`}>
                            <item.icon className={`w-6 h-6 ${item.colorClass === "primary" ? "text-primary" :
                                    item.colorClass === "neon-green" ? "text-[hsl(var(--neon-green))]" :
                                        "text-[hsl(var(--neon-orange))]"
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

// Monthly Chart Component
function MonthlyChart({ data }: { data: any[] }) {
    return (
        <div className="lg:col-span-2 card-neon p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <FaChartBar className="text-primary" />
                Arsip Ditambahkan (5 Bulan Terakhir)
            </h3>

            {data.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                        <FaFolder className="mx-auto w-12 h-12 mb-4 opacity-50" />
                        <p>Belum ada data arsip bulanan.</p>
                    </div>
                </div>
            ) : (
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height={430}>
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
                                formatter={(value, name) => [value, "Jumlah Arsip"]}
                            />
                            <Legend wrapperStyle={{ fontSize: "14px" }} />
                            <Bar
                                dataKey="jumlah"
                                name="Jumlah Arsip"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// Recent Archives Component
function RecentArchives({ archives }: { archives: ArsipData[] }) {
    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    return (
        <div className="card-neon p-4 rounded-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <FaFolder className="text-primary" />
                Arsip Terbaru
            </h3>

            <div className="space-y-4">
                {archives.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        Belum ada arsip terbaru
                    </div>
                ) : (
                    archives.map((arsip) => (
                        <div key={arsip.id_arsip_aktif} className="p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm text-foreground">{arsip.kode_klasifikasi}</p>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(arsip.created_at).toLocaleDateString('id-ID')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="font-small text-sm text-foreground mb-2" title={arsip.uraian_informasi}>
                                    {truncateText(arsip.uraian_informasi, 50)}
                                </p>
                                <Link
                                    href={`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`}
                                    className="text-xs text-primary hover:underline flex"
                                >
                                    Lihat Detail <FaExternalLinkAlt size={10} />
                                </Link>
                            </div>
                            
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Retention Alerts Component
function RetentionAlerts({ archives }: { archives: ArsipJatuhTempo[] }) {
    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    return (
        <div className="card-neon p-4 rounded-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Bell className="text-primary" />
                Jatuh Tempo Terdekat
            </h3>

            <div className="space-y-4">
                {archives.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        Tidak ada arsip dengan informasi jatuh tempo
                    </div>
                ) : (
                    archives.map((arsip) => (
                        <div key={arsip.id_arsip_aktif} className="p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm text-foreground">{arsip.kode_klasifikasi}</p>
                                <span className={`text-xs ${typeof arsip.selisih_hari === 'number' && arsip.selisih_hari < 0
                                        ? 'text-red-500'
                                        : 'text-orange-500'
                                    }`}>
                                    {typeof arsip.selisih_hari === 'number' ?
                                        (arsip.selisih_hari < 0
                                            ? `Lewat ${Math.abs(arsip.selisih_hari)} hari`
                                            : `${arsip.selisih_hari} hari lagi`)
                                        : 'Tanggal tidak valid'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="font-small text-sm text-foreground mb-2" title={arsip.uraian_informasi}>
                                    {truncateText(arsip.uraian_informasi, 50)}
                                </p>
                                <Link
                                    href={`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    Lihat Detail <FaExternalLinkAlt size={10} />
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {archives.length > 0 && (
                <Link
                    href="/arsip/retensi"
                    className="text-sm text-primary hover:underline mt-4 inline-block"
                >
                    Lihat Semua Jatuh Tempo...
                </Link>
            )}
        </div>
    );
}

// Retention Toast Component
const RetentionToastContent = ({
    arsip,
    onView,
    onDismiss,
}: {
    arsip: ArsipJatuhTempo;
    onView: () => void;
    onDismiss: () => void;
}) => {
    let message = "";
    let titleColor = "text-orange-500";
    if (typeof arsip.selisih_hari === 'number') {
        if (arsip.selisih_hari < 0) {
            message = `Arsip "${arsip.kode_klasifikasi} - ${arsip.uraian_informasi}" telah LEWAT jatuh tempo ${Math.abs(arsip.selisih_hari)} hari.`;
            titleColor = "text-red-500";
        } else if (arsip.selisih_hari === 0) {
            message = `Arsip "${arsip.kode_klasifikasi} - ${arsip.uraian_informasi}" jatuh tempo HARI INI.`;
        } else {
            message = `Arsip "${arsip.kode_klasifikasi} - ${arsip.uraian_informasi}" akan jatuh tempo dalam ${arsip.selisih_hari} hari.`;
        }
    } else {
        message = `Arsip "${arsip.kode_klasifikasi} - ${arsip.uraian_informasi}" memiliki tanggal jatuh tempo yang perlu diperiksa.`;
    }

    return (
        <div className="relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${arsip.selisih_hari !== undefined && arsip.selisih_hari < 0 ? 'bg-red-500' : 'bg-orange-500'}`} />
            <div className="flex items-start gap-3 p-3 pl-5">
                <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${arsip.selisih_hari !== undefined && arsip.selisih_hari < 0 ? 'bg-red-500/15' : 'bg-orange-500/15'}`}>
                        <Bell size={14} className={titleColor} />
                    </div>
                </div>
                <div className="flex-grow min-w-0 pr-2">
                    <p className={`text-sm font-semibold ${titleColor} mb-1`}>
                        {arsip.selisih_hari !== undefined && arsip.selisih_hari < 0 ? "Arsip Lewat Jatuh Tempo!" : "Arsip Mendekati Jatuh Tempo"}
                    </p>
                    <p className="text-xs text-foreground leading-snug mb-3 break-words">
                        {message}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={onView}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 group"
                        >
                            <Eye size={10} />
                            <span>Lihat Detail</span>
                            <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                        </button>
                        <button
                            onClick={onDismiss}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 bg-muted hover:bg-muted/80 text-muted-foreground"
                        >
                            <LucideX size={10} />
                            <span>Tutup</span>
                        </button>
                    </div>
                </div>
                <button
                    onClick={onDismiss}
                    className="absolute top-2 right-2 flex-shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors duration-200"
                    aria-label="Tutup notifikasi"
                >
                    <LucideX size={12} />
                </button>
            </div>
        </div>
    );
};

// Loading Skeletons
function StatsLoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
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
                    {[...Array(2)].map((_, i) => (
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

    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<Stats>({
        totalArsip: 0,
        arsipBulanIni: 0,
        arsipDipindahkan: 0
    });

    const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
    const [recentArchives, setRecentArchives] = useState<ArsipData[]>([]);
    const [retentionAlerts, setRetentionAlerts] = useState<ArsipJatuhTempo[]>([]);

    const SIGN_IN_PATH = "/sign-in";
    const TOAST_RETENTION_AUTOCLOSE_DURATION = 15000;
    const TOAST_COMMON_CLASSNAME = "!bg-card dark:!bg-card !border !border-border !shadow-xl !rounded-xl w-[340px] max-w-[90vw] [&>.Toastify__toast-body]:!p-0 [&>.Toastify__toast-body]:!m-0 [&>.Toastify__close-button]:!hidden";

    const getUserBidang = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: userData } = await supabase
            .from('users')
            .select('id_bidang_fkey')
            .eq('user_id', user.id)
            .single();

        return userData?.id_bidang_fkey;
    }, [supabase]);

    const checkAuth = useCallback(async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error("No active session");

            const userBidangId = await getUserBidang();
            if (!userBidangId) throw new Error("User bidang not found");

            return userBidangId;
        } catch (authError) {
            console.error("Auth error:", authError);
            router.push(SIGN_IN_PATH);
            return null;
        }
    }, [router, supabase, getUserBidang]);

    const fetchDashboardData = useCallback(async (bidangId: number) => {
        try {
            setDataLoading(true);
            setError(null);

            // Get lokasi penyimpanan for user's bidang
            const { data: lokasiDiBidang, error: lokasiError } = await supabase
                .from("lokasi_penyimpanan")
                .select("id_lokasi")
                .eq("id_bidang_fkey", bidangId);

            if (lokasiError) throw lokasiError;

            const lokasiIds = lokasiDiBidang?.map(l => l.id_lokasi) || [];
            if (lokasiIds.length === 0) {
                setStats({ totalArsip: 0, arsipBulanIni: 0, arsipDipindahkan: 0 });
                setMonthlyChartData([]);
                setRecentArchives([]);
                setRetentionAlerts([]);
                return;
            }

            // Fetch all arsip data
            const { data: arsipAktif, error: arsipAktifError } = await supabase
                .from("arsip_aktif")
                .select(`
                    id_arsip_aktif,
                    kode_klasifikasi,
                    uraian_informasi,
                    created_at,
                    jangka_simpan
                `)
                .in("id_lokasi_fkey", lokasiIds)
                .order("created_at", { ascending: false });

            if (arsipAktifError) throw arsipAktifError;

            // Get count of arsip_inaktif related to the fetched arsip_aktif
            let arsipInaktifCount = 0;
            const arsipAktifIds = arsipAktif?.map(a => a.id_arsip_aktif).filter(id => id) || [];

            if (arsipAktifIds.length > 0) {
                const { count, error: arsipInaktifError } = await supabase
                    .from("arsip_inaktif")
                    .select("id_arsip_inaktif", { count: "exact", head: true }) // Select a minimal field
                    .in("id_arsip_aktif", arsipAktifIds); // Filter by id_arsip_aktif from arsip_aktif

                if (arsipInaktifError) throw arsipInaktifError;
                arsipInaktifCount = count || 0;
            }


            // Get pemindahan data
            const { data: pemindahanLinks, error: pemindahanError } = await supabase
                .from("pemindahan_arsip_link")
                .select("id_arsip_aktif_fkey");

            if (pemindahanError) throw pemindahanError;

            const dipindahkanIds = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];
            const arsipDipindahkan = arsipAktif?.filter(arsip => dipindahkanIds.includes(arsip.id_arsip_aktif)) || [];

            // Calculate stats
            const currentDate = new Date();
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const arsipBulanIni = arsipAktif?.filter(arsip =>
                new Date(arsip.created_at) >= firstDayOfMonth
            ).length || 0;

            const newStats = {
                totalArsip: (arsipAktif?.length || 0) + (arsipInaktifCount || 0),
                arsipBulanIni,
                arsipDipindahkan: arsipDipindahkan.length
            };

            // Prepare monthly chart data
            const fiveMonthsAgo = new Date();
            fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 4);
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

            const monthlyCounts: { [key: string]: number } = {};
            const chartMonths: string[] = [];

            for (let i = 4; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthKey = monthNames[date.getMonth()];
                chartMonths.push(monthKey);
                monthlyCounts[monthKey] = 0;
            }

            arsipAktif?.forEach(arsip => {
                const arsipDate = new Date(arsip.created_at);
                if (arsipDate >= fiveMonthsAgo) {
                    const monthKey = monthNames[arsipDate.getMonth()];
                    if (monthlyCounts.hasOwnProperty(monthKey)) {
                        monthlyCounts[monthKey]++;
                    }
                }
            });

            const chartData = chartMonths.map(month => ({
                name: month,
                jumlah: monthlyCounts[month]
            }));

            // Prepare retention alerts
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const arsipDenganJatuhTempo = arsipAktif?.filter(arsip =>
                arsip.jangka_simpan && !dipindahkanIds.includes(arsip.id_arsip_aktif)
            ).map(arsip => {
                let selisihHari: number | undefined = undefined;
                if (arsip.jangka_simpan) {
                    const parts = arsip.jangka_simpan.split(" s.d. ");
                    const endDateStringDMY = parts.length > 1 ? parts[1] : parts[0];

                    if (endDateStringDMY) {
                        const dateParts = endDateStringDMY.split("-");
                        if (dateParts.length === 3) {
                            const day = parseInt(dateParts[0], 10);
                            const month = parseInt(dateParts[1], 10) - 1;
                            const year = parseInt(dateParts[2], 10);

                            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                                const endDate = new Date(year, month, day);
                                endDate.setHours(23, 59, 59, 999);

                                if (!isNaN(endDate.getTime())) {
                                    selisihHari = differenceInDays(endDate, today);
                                }
                            }
                        }
                    }
                }
                return {
                    ...arsip,
                    selisih_hari: selisihHari,
                };
            }).filter(arsip => typeof arsip.selisih_hari === 'number') || [];

            arsipDenganJatuhTempo.sort((a, b) => {
                return (a.selisih_hari as number) - (b.selisih_hari as number);
            });

            setStats(newStats);
            setMonthlyChartData(chartData);
            setRecentArchives(arsipAktif?.slice(0, 2) || []);
            setRetentionAlerts(arsipDenganJatuhTempo.slice(0, 2));

        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Failed to fetch dashboard data";
            console.error("Dashboard error:", message);
            setError(message);
            toast.error("Gagal memuat data dashboard.");
        } finally {
            setDataLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const initializeDashboard = async () => {
            setAuthLoading(true);
            const bidangId = await checkAuth();
            if (bidangId) {
                await fetchDashboardData(bidangId);
            }
            setAuthLoading(false);
        };
        initializeDashboard();
    }, [checkAuth, fetchDashboardData]);

    // Toast notifications for retention alerts
    useEffect(() => {
        if (retentionAlerts.length > 0) {
            retentionAlerts.forEach(arsip => {
                if (typeof arsip.selisih_hari === 'number' && arsip.selisih_hari <= 30) {
                    const toastId = `retention-alert-${arsip.id_arsip_aktif}`;
                    if (!toast.isActive(toastId)) {
                        const handleView = () => {
                            router.push(`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`);
                            toast.dismiss(toastId);
                        };
                        const handleDismiss = () => {
                            toast.dismiss(toastId);
                        };

                        const toastType = arsip.selisih_hari < 0 ? toast.error : toast.warn;

                        toastType(
                            <RetentionToastContent
                                arsip={arsip}
                                onView={handleView}
                                onDismiss={handleDismiss}
                            />,
                            {
                                toastId: toastId,
                                position: "top-right",
                                autoClose: TOAST_RETENTION_AUTOCLOSE_DURATION,
                                hideProgressBar: true,
                                closeOnClick: false,
                                pauseOnHover: true,
                                draggable: true,
                                closeButton: false,
                                theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                                className: TOAST_COMMON_CLASSNAME,
                            }
                        );
                    }
                }
            });
        }
    }, [retentionAlerts, router]);

    if (authLoading || (dataLoading && !stats.totalArsip)) {
        return null; // The loading.tsx will handle this
    }

    if (error) {
        return (
            <div className="bg-background flex flex-col items-center justify-center p-6 w-full h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Terjadi Kesalahan</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background p-6 w-full h-full">
            <div className="max-w-screen-2xl mx-auto w-full h-full space-y-8">
                {/* Stats Cards */}
                <Suspense fallback={<StatsLoadingSkeleton />}>
                    {dataLoading ? <StatsLoadingSkeleton /> : <StatsCards stats={stats} />}
                </Suspense>

                {/* Charts and Info Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Suspense fallback={<ChartLoadingSkeleton />}>
                        {dataLoading ? <ChartLoadingSkeleton /> : <MonthlyChart data={monthlyChartData} />}
                    </Suspense>

                    <div className="space-y-8">
                        <Suspense fallback={<ArchivesLoadingSkeleton />}>
                            {dataLoading ? <ArchivesLoadingSkeleton /> : <RecentArchives archives={recentArchives} />}
                        </Suspense>
                        <Suspense fallback={<ArchivesLoadingSkeleton />}>
                            {dataLoading ? <ArchivesLoadingSkeleton /> : <RetentionAlerts archives={retentionAlerts} />}
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PegawaiDashboard() {
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