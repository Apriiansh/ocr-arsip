"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { markNotificationAsRead } from "@/utils/notificationService";
import { BellRing } from "lucide-react";
import { toast } from "react-toastify";

interface NotificationItem {
    id_notif: string;
    message: string;
    created_at: string;
    is_read: boolean;
    link?: string; // Tambahkan properti link (opsional)
}

export default function NotifikasiPage() {
    const supabase = createClient();
    const [notifikasi, setNotifikasi] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotifikasi = async () => {
            setLoading(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                if (userError) {
                    toast.error(`Gagal memuat sesi pengguna: ${userError.message}`);
                } else {
                    toast.warn("Sesi pengguna tidak ditemukan, tidak dapat memuat notifikasi.");
                }
                setNotifikasi([]);
                setLoading(false);
                return;
            }
            setUserId(user.id);

            const { data, error } = await supabase
                .from("notifications")
                .select("id_notif, message, created_at, is_read, link") // Tambahkan link di select
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) {
                toast.error("Gagal mengambil notifikasi.");
                setNotifikasi([]);
            } else {
                setNotifikasi(data || []);
            }
            setLoading(false);
        };

        fetchNotifikasi();
    }, [supabase]);

    const handleMarkAsRead = async (id: string) => {
        try {
            const success = await markNotificationAsRead(id);
            if (success) {
                setNotifikasi(prev =>
                    prev.map(item =>
                        item.id_notif === id ? { ...item, is_read: true } : item
                    )
                );
            } else {
                toast.error("Gagal menandai notifikasi.");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan.");
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <BellRing size={24} /> Notifikasi
            </h1>

            {loading ? (
                <p className="text-muted-foreground">Memuat notifikasi...</p>
            ) : notifikasi.length === 0 ? (
                <p className="text-muted-foreground">Tidak ada notifikasi.</p>
            ) : (
                <ul className="space-y-4">
                    {notifikasi.map((item) => (
                        <li
                            key={item.id_notif}
                            className={`bg-card border border-border p-4 rounded-lg shadow-sm transition-opacity duration-300 ${
                                item.is_read ? 'opacity-60' : 'cursor-pointer hover:bg-muted/50'
                            }`}
                            onClick={() => !item.is_read && handleMarkAsRead(item.id_notif)}
                        >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div>
                                    <p className="text-foreground">{item.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(item.created_at).toLocaleString("id-ID")}
                                    </p>
                                </div>
                                {item.link && (
                                    <a
                                        href={item.link}
                                        className="inline-block mt-2 md:mt-0 px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/80 transition"
                                        onClick={e => {
                                            e.stopPropagation(); // Mencegah handler onClick dari <li> terpicu
                                            if (!item.is_read) {
                                                handleMarkAsRead(item.id_notif);
                                            }
                                        }}
                                    >
                                        Lihat
                                    </a>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
