// filepath: d:\Project\ocr-arsip\app\admin\page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";
import { FaUsers, FaUserTie, FaUserSecret, FaChartBar, FaUserCheck, FaHistory, FaUserAlt, FaUserShield, FaUserEdit } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UserActivityStat {
    name: string; 
    count: number; 
}

export default function AdminHome() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [employeeStats, setEmployeeStats] = useState({ total: 0, active: 0 });
    const [headOfDepartmentStats, setHeadOfDepartmentStats] = useState({ total: 0 });
    const [secretaryStats, setSecretaryStats] = useState({ total: 0 });
    const [userActivityStats, setUserActivityStats] = useState<UserActivityStat[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Fetch statistics
    const fetchStatistics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            
            const { count: activeEmployees, error: activeEmployeesError } = await supabase
                .from("users")
                .select("user_id", { count: "exact", head: true }) // Cukup pilih satu kolom (misal PK) atau biarkan kosong
                .eq("status", "active");

            // Fetch employee data
            const { count: totalEmployees, error: totalEmployeesError } = await supabase
                .from("users")
                .select("user_id", { count: "exact", head: true })
                .eq("role", "Pegawai");

            // Fetch head of department data
            const { count: totalHeads } = await supabase
                .from("users")
                .select("*", { count: "exact", head: true })
                .eq("role", "Kepala_Bidang");

            // Fetch secretary data
            const { count: totalSecretaries } = await supabase
                .from("users")
                .select("*", { count: "exact", head: true })
                .eq("role", "Sekretaris");
            
            if (activeEmployeesError) console.error("Error fetching active employees count:", activeEmployeesError);
            if (totalEmployeesError) console.error("Error fetching total employees count:", totalEmployeesError);
            // Tambahkan penanganan error serupa untuk query count lainnya jika diperlukan

            setEmployeeStats({ total: totalEmployees || 0, active: activeEmployees || 0 });
            setHeadOfDepartmentStats({ total: totalHeads || 0 });
            setSecretaryStats({ total: totalSecretaries || 0 });

            // Fetch user activity statistics
            const { data: usersData, error: usersError } = await supabase
                .from("users")
                .select("user_id, nama, email");

            if (usersError) {
                console.error("Error fetching users for activity stats:", usersError);
                // Not throwing error here to allow other stats to load
            }

            const userActivityMap = new Map<string, { count: number, name: string }>();
            if (usersData) {
                usersData.forEach(user => {
                    const displayName = user.nama || user.email || `User (${user.user_id.substring(0, 8)})`;
                    userActivityMap.set(user.user_id, { count: 0, name: displayName });
                });
            }

            // Activity from arsip_aktif
            const { data: arsipAktifActivity, error: arsipAktifError } = await supabase
                .from("arsip_aktif")
                .select("user_id")
                .not("user_id", "is", null);

            if (arsipAktifError) console.error("Error fetching arsip_aktif activity:", arsipAktifError);
            else if (arsipAktifActivity) {
                arsipAktifActivity.forEach(item => {
                    if (item.user_id && userActivityMap.has(item.user_id)) {
                        const current = userActivityMap.get(item.user_id)!;
                        userActivityMap.set(item.user_id, { ...current, count: current.count + 1 });
                    }
                });
            }

            // Activity from arsip_inaktif
            const { data: arsipInaktifActivity, error: arsipInaktifError } = await supabase
                .from("arsip_inaktif")
                .select("user_id")
                .not("user_id", "is", null);

            if (arsipInaktifError) console.error("Error fetching arsip_inaktif activity:", arsipInaktifError);
            else if (arsipInaktifActivity) {
                arsipInaktifActivity.forEach(item => {
                    if (item.user_id && userActivityMap.has(item.user_id)) {
                        const current = userActivityMap.get(item.user_id)!;
                        userActivityMap.set(item.user_id, { ...current, count: current.count + 1 });
                    }
                });
            }
            
            const aggregatedUserActivity = Array.from(userActivityMap.values())
                .filter(activity => activity.count > 0) 
                .sort((a, b) => b.count - a.count)
                .slice(0, 15); // Show top 15 active users, adjust as needed

            setUserActivityStats(aggregatedUserActivity);

        } catch (error) {
            setError("Gagal memuat sebagian atau semua statistik.");
            console.error("Error fetching statistics:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    if (loading) {
        // Jika loading.tsx ada, ini tidak akan ditampilkan pada initial load.
        return null;
    }

    if (error) {
        return (
            <div className="bg-background w-full flex-grow flex flex-col items-center justify-center p-6"> {/* Konsisten dengan flex-grow dan p-6 di dalam */}
                    <div className="text-center p-6"> {/* Pastikan konten error juga punya padding jika diinginkan */}
                        <h2 className="text-2xl font-bold text-destructive mb-4">Terjadi Kesalahan</h2>
                        <p className="text-muted-foreground mb-6">{error}</p>
                        <button
                            onClick={fetchStatistics}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
                        >
                            Coba Lagi
                        </button>
                    </div>
                </div>
        );
    }

    return (
        <div className="bg-background w-full flex-grow flex flex-col"> {/* Hapus p-6 dari div terluar halaman */}
            <div className="max-w-screen-2xl mx-auto w-full flex-grow flex flex-col space-y-8 p-6"> {/* Tambahkan p-6 ke div pembungkus konten */}
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* Pengguna Aktif Card */}
                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[hsl(var(--neon-green))]/10 rounded-lg">
                                <FaUserCheck className="w-6 h-6 text-[hsl(var(--neon-green))]" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pengguna Aktif</p>
                                <p className="text-2xl font-bold">{employeeStats.active}</p>
                            </div>
                        </div>
                    </div>

                    {/* Total Pengguna Card */}
                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <FaUsers className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Pengguna</p>
                                <p className="text-2xl font-bold">{employeeStats.total}</p>
                            </div>
                        </div>
                    </div>

                    {/* Kepala Bidang Card */}
                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[hsl(var(--neon-blue))]/10 rounded-lg">
                                <FaUserTie className="w-6 h-6 text-[hsl(var(--neon-blue))]" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Kepala Bidang</p>
                                <p className="text-2xl font-bold">{headOfDepartmentStats.total}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sekretaris Card */}
                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[hsl(var(--neon-purple))]/10 rounded-lg">
                                <FaUserEdit className="w-6 h-6 text-[hsl(var(--neon-purple))]" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Sekretaris</p>
                                <p className="text-2xl font-bold">{secretaryStats.total}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Activity Statistics Chart */}
                <div className="card-neon p-6 rounded-xl mt-auto">
                    <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                        <FaHistory className="text-primary" />
                        Aktivitas Pengguna (Pengelolaan Arsip)
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                        {/* Adjusted margin: added some space on left and right for labels */}
                        <BarChart data={userActivityStats} margin={{ top: 5, right: 20, left: 20, bottom: 70 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                angle={0}
                                textAnchor="middle"
                                interval={0}
                                height={80}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            />
                            <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                                itemStyle={{ color: 'hsl(var(--primary))' }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}