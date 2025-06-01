"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    FaArchive, // Untuk Arsip Aktif
    FaFileArchive, // Untuk Arsip Inaktif
    FaUsers, // Untuk Data Pengguna
    FaBuilding, // Untuk Keaktifan Bidang
    FaChartBar,
    FaExternalLinkAlt,
} from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";

interface BidangAktivitas {
    nama_bidang: string;
    total_arsip_aktif: number;
}

export default function KepalaDinasDashboard() {
    const supabase = createClient();
    const router = useRouter();

    // State Management
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState({
        totalArsipAktif: 0,
        totalArsipInaktif: 0,
        totalPengguna: 0,
        totalBidangAktif: 0,
    });

    const [bidangAktivitas, setBidangAktivitas] = useState<BidangAktivitas[]>([]);

    // Constants
    const ALLOWED_ROLE = "Kepala_Dinas";
    const SIGN_IN_PATH = "/sign-in";
    const DEFAULT_HOME_PATH = "/";

    // Authentication Check
    const checkAuth = useCallback(async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error("No active session");

            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("role")
                .eq("user_id", session.user.id)
                .single();

            if (userError || !userData?.role) throw new Error("Invalid user data");
            if (userData.role !== ALLOWED_ROLE) throw new Error("Unauthorized role");

            return true;
        } catch (authError) {
            const message = authError instanceof Error ? authError.message : "Authentication error";
            console.error("Auth error:", message);
            router.push(message === "Unauthorized role" ? DEFAULT_HOME_PATH : SIGN_IN_PATH);
            return false;
        }
    }, [router, supabase]);

    // Data Fetching
    const fetchDashboardData = useCallback(async () => {
        setDataLoading(true);
        setError(null);
        try {
            // Ambil semua ID arsip aktif
            const { data: semuaArsipAktif, error: semuaArsipAktifError } = await supabase
                .from("arsip_aktif")
                .select("id_arsip_aktif");
            if (semuaArsipAktifError) throw semuaArsipAktifError;

            // Ambil semua ID arsip aktif yang ada di tabel pemindahan_arsip_link
            const { data: arsipDipindahkanLinks, error: arsipDipindahkanError } = await supabase
                .from("pemindahan_arsip_link")
                .select("id_arsip_aktif_fkey");
            if (arsipDipindahkanError) throw arsipDipindahkanError;

            const idPindahSet = new Set(arsipDipindahkanLinks?.map(link => link.id_arsip_aktif_fkey) || []);
            
            const arsipAktifSebenarnya = semuaArsipAktif?.filter(arsip => !idPindahSet.has(arsip.id_arsip_aktif)) || [];
            const totalAktifSebenarnya = arsipAktifSebenarnya.length;

            // Total Arsip Inaktif
            const { count: totalInaktif, error: totalInaktifError } = await supabase
                .from("arsip_inaktif")
                .select("id_arsip_inaktif", { count: "exact", head: true });
            if (totalInaktifError) throw totalInaktifError;

            // Total Pengguna
            const { count: totalPengguna, error: totalPenggunaError } = await supabase
                .from("users")
                .select("user_id", { count: "exact", head: true });
            if (totalPenggunaError) throw totalPenggunaError;

            // Data Keaktifan Bidang
            const { data: bidangData, error: bidangError } = await supabase
                .from("daftar_bidang")
                .select(`
                    nama_bidang,
                    users!fk_users_daftar_bidang (
                        user_id, 
                        arsip_aktif!arsip_aktif_user_id_fkey (id_arsip_aktif),
                        arsip_inaktif!arsip_inaktif_user_id_fkey1 (id_arsip_inaktif)
                    )
                `);
            if (bidangError) throw bidangError;

            // Proses data keaktifan bidang
            let processedBidangAktivitasData: BidangAktivitas[] = bidangData?.map((bidang: any) => {
                let totalArsipAktif = 0;
                // let totalArsipInaktif = 0; // Tidak lagi menghitung arsip inaktif untuk unit pengolah

                // Hitung total arsip untuk semua user di bidang ini
                bidang.users?.forEach((user: any) => {
                    // Filter arsip aktif yang belum dipindahkan untuk user ini
                    const arsipAktifUser = user.arsip_aktif?.filter((aa: { id_arsip_aktif: string }) => !idPindahSet.has(aa.id_arsip_aktif)) || [];
                    totalArsipAktif += arsipAktifUser.length;
                    // totalArsipInaktif += user.arsip_inaktif?.length || 0;
                });

                return {
                    nama_bidang: bidang.nama_bidang, // Ini adalah nama asli dari database
                    total_arsip_aktif: totalArsipAktif,
                };
            }) || [];

            // Kecualikan Bidang "Sekretariat"
            // Pastikan "Sekretariat" adalah nilai yang persis sama dengan yang ada di kolom `nama_bidang` di tabel `daftar_bidang`
            processedBidangAktivitasData = processedBidangAktivitasData.filter(
                (b) => b.nama_bidang !== "Sekretariat"
            );

            processedBidangAktivitasData.sort((a, b) => b.total_arsip_aktif - a.total_arsip_aktif);
            setBidangAktivitas(processedBidangAktivitasData);

            // Hitung bidang yang aktif (memiliki arsip)
            const bidangAktif = processedBidangAktivitasData.filter(bidang => bidang.total_arsip_aktif > 0).length;

            setStats({
                totalArsipAktif: totalAktifSebenarnya,
                totalArsipInaktif: totalInaktif || 0,
                totalPengguna: totalPengguna || 0,
                totalBidangAktif: bidangAktif,
            });

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
            const isAuthorized = await checkAuth();
            if (isAuthorized) {
                await fetchDashboardData();
            }
            setAuthLoading(false);
        };
        initializeDashboard();
    }, [checkAuth, fetchDashboardData]);

    if (authLoading || dataLoading) {
        return (
            <div className="bg-background p-6 w-full h-full"> {/* Adjusted padding, added w-full and h-full */}
                <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-center"> {/* Increased max-width, added h-full and centering */}
                    <LoadingSkeleton />
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="bg-background p-6 w-full h-full flex flex-col items-center justify-center"> {/* Adjusted padding, added w-full, h-full and centering */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-destructive mb-4">Terjadi Kesalahan</h2>
                        <p className="text-muted-foreground mb-6">{error}</p>
                        <button
                            onClick={fetchDashboardData}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
                        >
                            Coba Lagi
                        </button>
                    </div>
            </div>
        );
    }

    return (
        <div className="bg-background p-6 w-full h-full"> {/* Adjusted padding, added w-full and h-full */}
            <div className="max-w-screen-2xl mx-auto w-full h-full space-y-8"> {/* Increased max-width, added w-full and h-full */}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            title: "Total Arsip Aktif",
                            value: stats.totalArsipAktif,
                            icon: FaArchive,
                            colorClass: "primary", // Menggunakan nama kelas atau variabel
                            description: "Dokumen arsip aktif"
                        },
                        {
                            title: "Total Arsip Inaktif",
                            value: stats.totalArsipInaktif,
                            icon: FaFileArchive,
                            colorClass: "neon-green",
                            description: "Dokumen arsip inaktif"
                        },
                        {
                            title: "Data Pengguna",
                            value: stats.totalPengguna,
                            icon: FaUsers,
                            colorClass: "neon-purple",
                            description: "Total pengguna sistem"
                        },
                        {
                            title: "Bidang Aktif",
                            value: stats.totalBidangAktif,
                            icon: FaBuilding,
                            colorClass: "neon-orange",
                            description: "Bidang dengan arsip"
                        },
                    ].map((item, index) => (
                        <div key={index} className="bg-card p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-border">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${item.colorClass === "primary" ? "bg-primary/10" :
                                        item.colorClass === "neon-green" ? "bg-[hsl(var(--neon-green))]/10" :
                                            item.colorClass === "neon-purple" ? "bg-[hsl(var(--neon-purple))]/10" :
                                                "bg-[hsl(var(--neon-orange))]/10" // Default to neon-orange or handle error
                                    }`}>
                                    <item.icon className={`w-6 h-6 ${item.colorClass === "primary" ? "text-primary" :
                                            item.colorClass === "neon-green" ? "text-[hsl(var(--neon-green))]" :
                                                item.colorClass === "neon-purple" ? "text-[hsl(var(--neon-purple))]" :
                                                    "text-[hsl(var(--neon-orange))]" // Default to neon-orange or handle error
                                        }`} />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{item.title}</p>
                                    <p className="text-2xl font-bold text-foreground">{item.value}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grafik Keaktifan Bidang */}
                <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                    <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                        <FaChartBar className="text-primary" /> Keaktifan Bidang dalam Mengelola Arsip
                    </h3>

                    {bidangAktivitas.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FaBuilding className="mx-auto w-12 h-12 mb-4 opacity-50" />
                            <p>Belum ada data aktivitas bidang.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Grafik Bar */}
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={bidangAktivitas}
                                        margin={{ top: 20, right: 30, left: 30, bottom: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                        <XAxis
                                            dataKey="nama_bidang"
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                            interval={0}
                                            fontSize={12}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '0.5rem'
                                            }}
                                            formatter={(value, name) => [
                                                value, "Arsip Aktif"
                                            ]}
                                        />
                                        <Bar
                                            dataKey="total_arsip_aktif"
                                            name="total_arsip_aktif"
                                            fill="hsl(var(--primary))" // Menggunakan warna primer dari tema
                                            radius={[2, 2, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}