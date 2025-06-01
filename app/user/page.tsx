"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; // Pastikan Link diimpor jika belum
import { usePathname, useRouter } from "next/navigation";
import { FaRegFileAlt, FaRegCalendarAlt, FaRegCopy } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createClient } from "@/utils/supabase/client";
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";

export default function UserHome() {
    const supabase = createClient();
    const router = useRouter();
    const currentPathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [totalArsip, setTotalArsip] = useState(0);
    const [arsipBulanIni, setArsipBulanIni] = useState(0);
    const [arsipPerBulanData, setArsipPerBulanData] = useState<any[]>([]);
    const [arsipDipindahkanCount, setArsipDipindahkanCount] = useState(0); // State baru
    const [arsipTerbaruPengguna, setArsipTerbaruPengguna] = useState<any[]>([]);
    const [arsipMendekatiRetensiList, setArsipMendekatiRetensiList] = useState<any[]>([]);

    // Constants
    const SIGN_IN_PATH = "/sign-in";
    const DETAIL_ARSIP_PATH_PREFIX = "/arsip/arsip-aktif/detail/";
    const ARSIP_RETENSI_PATH = "/arsip/retensi";
    const N_HARI_RETENSI = 30;

    // Helper function untuk mendapatkan id_bidang user
    const getUserBidang = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: userData } = await supabase
            .from('users')
            .select('id_bidang_fkey')
            .eq('user_id', user.id)
            .single();

        return userData?.id_bidang_fkey;
    };

    // Fetch functions
    const fetchDashboardStats = async (userBidangId: number) => {
        // Get total arsip for user's bidang
        let queryAktif = supabase
            .from("arsip_aktif")
            .select("id_arsip_aktif, lokasi_penyimpanan!inner(id_bidang_fkey)", { count: "exact", head: true })
            .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId);

        // Menghapus filter idsToExclude untuk total arsip aktif
        // if (idsToExclude.length > 0) {
        //     queryAktif = queryAktif.not('id_arsip_aktif', 'in', `(${idsToExclude.join(',')})`);
        // }
        const { count: totalAktif, error: totalAktifError } = await queryAktif;
        if (totalAktifError) console.error("Error fetching total arsip aktif:", totalAktifError.message);

        const { count: totalInaktif } = await supabase
            .from("arsip_inaktif")
            .select("id_arsip_inaktif, lokasi_penyimpanan!inner(id_bidang_fkey)", { count: "exact", head: true })
            .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId);

        setTotalArsip((totalAktif || 0) + (totalInaktif || 0));

        // Get arsip bulan ini for user's bidang
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();

        let queryBulanIni = supabase
            .from("arsip_aktif")
            .select("id_arsip_aktif, lokasi_penyimpanan!inner(id_bidang_fkey)", { count: "exact", head: true })
            .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId)
            .gte("created_at", firstDayOfMonth);

        // Menghapus filter idsToExclude untuk arsip bulan ini
        // if (idsToExclude.length > 0) {
        //     queryBulanIni = queryBulanIni.not('id_arsip_aktif', 'in', `(${idsToExclude.join(',')})`);
        // }
        const { count: bulanIni, error: bulanIniError } = await queryBulanIni;
        if (bulanIniError) console.error("Error fetching arsip bulan ini:", bulanIniError.message);
        setArsipBulanIni(bulanIni || 0);

        // Hitung arsip yang telah dipindahkan (ada di pemindahan_arsip_link)
        // Menggunakan join yang benar dengan foreign key relationship
        const { count: dipindahkanCount, error: dipindahkanError } = await supabase
            .from('arsip_aktif')
            .select(`
                id_arsip_aktif,
                lokasi_penyimpanan!inner(id_bidang_fkey),
                pemindahan_arsip_link!inner(id_arsip_aktif_fkey)
            `, { count: 'exact', head: true })
            .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId);

        if (dipindahkanError) {
            console.error("Error fetching arsip dipindahkan count:", dipindahkanError.message || dipindahkanError.details || "Unknown error");
            console.error("Full error object:", JSON.stringify(dipindahkanError, null, 2));
        }
        setArsipDipindahkanCount(dipindahkanCount || 0);
    };

    const fetchArsipPerBulanChartData = async (userBidangId: number) => {
        const fiveMonthsAgo = new Date();
        fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 4);
        fiveMonthsAgo.setDate(1);
        fiveMonthsAgo.setHours(0, 0, 0, 0);

        let queryArsipBulanan = supabase
            .from("arsip_aktif")
            .select("id_arsip_aktif, created_at, lokasi_penyimpanan!inner(id_bidang_fkey)")
            .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId)
            .gte("created_at", fiveMonthsAgo.toISOString());

        // Menghapus filter idsToExclude untuk data chart
        // if (idsToExclude.length > 0) {
        //     queryArsipBulanan = queryArsipBulanan.not('id_arsip_aktif', 'in', `(${idsToExclude.join(',')})`);
        // }

        const { data: arsipBulanan, error } = await queryArsipBulanan;

        if (error) {
            console.error("Error fetching arsip bulanan for chart:", error);
            setArsipPerBulanData([]);
            return;
        }

        const monthlyCounts: { [key: string]: number } = {};
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei"];

        if (arsipBulanan) {
            arsipBulanan.forEach(arsip => {
                if (arsip.created_at) {
                    const date = new Date(arsip.created_at);
                    const monthYear = monthNames[date.getMonth()];
                    monthlyCounts[monthYear] = (monthlyCounts[monthYear] || 0) + 1;
                }
            });
        }

        const chartDataBulanan = monthNames.map(month => ({
            name: month,
            jumlah: monthlyCounts[month] || 0,
        }));

        setArsipPerBulanData(chartDataBulanan);
    };

    const fetchArsipTerbaruPengguna = async (userBidangId: number) => {
        let queryTerbaru = supabase
            .from("arsip_aktif")
            .select(`
                id_arsip_aktif,
                kode_klasifikasi,
                uraian_informasi,
                created_at,
                lokasi_penyimpanan!inner(id_bidang_fkey)
            `)
            .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId)
            .order("created_at", { ascending: false })
            .limit(2);

        // Menghapus filter idsToExclude untuk arsip terbaru
        // if (idsToExclude.length > 0) {
        //     queryTerbaru = queryTerbaru.not('id_arsip_aktif', 'in', `(${idsToExclude.join(',')})`);
        // }
        const { data: terbaruPengguna, error } = await queryTerbaru;

        if (error) {
            console.error("Error fetching arsip terbaru pengguna:", error.message);
        }
        setArsipTerbaruPengguna(terbaruPengguna || []);
    };

    const fetchArsipMendekatiRetensi = async (userBidangId: number) => {
        let queryRetensi = supabase
            .from("arsip_aktif")
            .select(`
                id_arsip_aktif,
                kode_klasifikasi,
                lokasi_penyimpanan!inner(id_bidang_fkey)
            `)
            .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId)
            .eq("kode_klasifikasi", "000.5.2.1")
            .limit(1);

        // Menghapus filter idsToExclude untuk arsip mendekati retensi
        // if (idsToExclude.length > 0) {
        //     queryRetensi = queryRetensi.not('id_arsip_aktif', 'in', `(${idsToExclude.join(',')})`);
        // }
        const { data: daftarDekatRetensi, error } = await queryRetensi;

        if (error) {
            console.error("Error fetching arsip mendekati retensi:", error.message || "Unknown error");
        }
        setArsipMendekatiRetensiList(daftarDekatRetensi || []);
    };

    useEffect(() => {
        const checkAuthAndFetchData = async () => {
            setLoading(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                console.error("No active session or user. Redirecting to sign-in.");
                router.push(SIGN_IN_PATH);
                return;
            }

            const userBidangId = await getUserBidang();
            if (!userBidangId) {
                console.error("User bidang not found");
                router.push(SIGN_IN_PATH);
                return;
            }

            // idsToExclude tidak lagi digunakan secara luas, hanya untuk 'Arsip Telah Dipindahkan'
            // yang dihitung di dalam fetchDashboardStats
            try {
                await Promise.all([
                    fetchDashboardStats(userBidangId),
                    fetchArsipPerBulanChartData(userBidangId),
                    fetchArsipTerbaruPengguna(userBidangId),
                    fetchArsipMendekatiRetensi(userBidangId),
                ]);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndFetchData();
    }, [supabase, router, currentPathname]);

    if (loading) {
        // Konsisten dengan wrapper loading di halaman Kepala Bidang
        return (
            <div className="bg-background p-6 w-full h-full"> {/* Added h-full */}
                <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-center"> {/* Added h-full and centering for skeleton */}
                    <LoadingSkeleton />
                </div>
            </div>
        );
    }
    return (
        // Menyesuaikan struktur utama dengan halaman Kepala Bidang
        <div className="bg-background p-6 w-full h-full"> {/* Added h-full */}
            <div className="max-w-screen-2xl mx-auto w-full h-full"> {/* Added h-full to content container */}
                <div className="w-full space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                        <div className="card-neon p-6 rounded-xl">
                            <div className="flex items-center">
                                <div className="bg-primary/10 p-3 rounded-lg">
                                    <FaRegFileAlt className="text-primary text-2xl" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-muted-foreground text-sm">Arsip Aktif Bulan Ini</p>
                                    <p className="text-3xl font-semibold text-foreground">{arsipBulanIni}</p>
                                </div>
                            </div>
                        </div>

                        {/* Total Arsip Card - Disesuaikan rounded-xl */}
                        <div className="card-neon p-6 rounded-xl flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="bg-primary/10 p-3 rounded-lg">
                                    <FaRegCalendarAlt className="text-primary text-2xl" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-muted-foreground text-sm">Total Arsip</p>
                                    <p className="text-3xl font-semibold text-foreground">{totalArsip}</p>
                                </div>
                            </div>
                        </div>

                        {/* Arsip Telah Dipindahkan Card */}
                        <div className="card-neon p-6 rounded-xl flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="bg-accent/10 p-3 rounded-lg"> {/* Warna bisa disesuaikan */}
                                    <FaRegCopy className="text-accent text-2xl" /> {/* Ikon bisa disesuaikan */}
                                </div>
                                <div className="ml-4">
                                    <p className="text-muted-foreground text-sm">Arsip Telah Dipindahkan</p>
                                    <p className="text-3xl font-semibold text-foreground">{arsipDipindahkanCount}</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Charts and Info Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="card-neon p-6 rounded-xl">
                            <h4 className="text-lg font-semibold text-foreground mb-4">Arsip Ditambahkan (6 Bulan Terakhir)</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={arsipPerBulanData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis allowDecimals={false} fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                    <Bar dataKey="jumlah" fill="hsl(var(--primary))" name="Jumlah Arsip" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Info Cards */}
                        <div className="space-y-8">
                            {/* Recent Archives Card - Disesuaikan rounded-xl */}
                            <div className="card-neon p-6 rounded-xl">
                                <h4 className="text-lg font-semibold text-foreground mb-4">Arsip Terbaru</h4>
                                {arsipTerbaruPengguna.length > 0 ? (
                                    <div className="space-y-3">
                                        {arsipTerbaruPengguna.map(arsip => (
                                            <div key={arsip.id_arsip_aktif} className="p-4 bg-muted/10 rounded-lg border border-border">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-sm font-medium text-foreground truncate" title={arsip.uraian_informasi}>
                                                        {arsip.kode_klasifikasi} - {arsip.uraian_informasi}
                                                    </p>
                                                    <Link href={`${DETAIL_ARSIP_PATH_PREFIX}${arsip.id_arsip_aktif}`} className="text-xs text-primary hover:underline ml-2">
                                                        detail
                                                    </Link>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Dibuat: {new Date(arsip.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-4">Belum ada arsip terbaru.</p>
                                )}
                            </div>

                            {/* Retention Warning Card - Disesuaikan rounded-xl */}
                            <div className="card-neon p-6 rounded-xl">
                                <h4 className="text-lg font-semibold text-foreground mb-4">Arsip yang Mendekati Masa Retensi (1 bulan)</h4>
                                {arsipMendekatiRetensiList.length > 0 ? (
                                    <div className="p-4 bg-muted/10 rounded-lg border border-border">
                                        <p className="text-sm text-foreground">
                                            Terdapat beberapa Arsip Aktif yang harus di pindahkan ke Arsip Inaktif
                                        </p>
                                        <div className="flex justify-end mt-2">
                                            <Link href={ARSIP_RETENSI_PATH} className="text-xs text-primary hover:underline">
                                                detail
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-4">Tidak ada arsip yang mendekati masa retensi.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}