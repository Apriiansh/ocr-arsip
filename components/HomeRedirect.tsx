"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import Link from "next/link";
import { Bell, ArrowRight, X, Inbox, Eye } from "lucide-react";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/utils/notificationService";

// Definisikan konstanta untuk path agar mudah dikelola
const ROLE_PATHS: Record<string, string> = {
    "Admin": "/admin/",
    "Kepala_Bidang": "/unit-pengolah/",
    "Sekretaris": "/unit-kearsipan/",
    "Pegawai": "/user/",
    "Kepala_Dinas": "/kepala-dinas/",
};
const DEFAULT_USER_PATH = "/user/";
const SIGN_IN_PATH = "/sign-in";
const NOTIFICATION_PATH = "/notifikasi";
const SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY = 'loginNotificationShown';
const MAX_INDIVIDUAL_TOASTS = 3;
const INDIVIDUAL_TOAST_AUTOCLOSE_DURATION = 12000;
const INDIVIDUAL_TOAST_STAGGER_DELAY = 2000;
const SUMMARY_TOAST_AUTOCLOSE_DURATION = 8000;

// Updated toast styling - more compact and responsive
const TOAST_COMMON_CLASSNAME = "!bg-card dark:!bg-card !border !border-border !shadow-xl !rounded-xl w-[340px] max-w-[90vw] [&>.Toastify__toast-body]:!p-0 [&>.Toastify__toast-body]:!m-0 [&>.Toastify__close-button]:!hidden";

const IndividualNotificationToastContent = ({
    message,
    link,
    notificationId,
}: {
    message: string;
    link?: string | null;
    notificationId: string;
}) => {
    const handleInteraction = async () => {
        try {
            await markNotificationAsRead(notificationId);
        } catch (error) {
            console.error("Error marking notification as read from toast:", error);
            toast.error("Gagal menandai notifikasi sebagai dibaca.");
        }
        toast.dismiss(`login-notif-${notificationId}`);
    };

    const handleClose = () => {
        toast.dismiss(`login-notif-${notificationId}`);
    };

    return (
        <div className="relative overflow-hidden">
            {/* Gradient accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--neon-purple))] rounded-l-xl" />

            <div className="flex items-start gap-3 p-3 pl-5">
                {/* Icon container - smaller and cleaner */}
                <div className="flex-shrink-0 mt-0.5">
                    <div className="w-7 h-7 bg-gradient-to-br from-primary/15 to-primary/25 rounded-lg flex items-center justify-center">
                        <Bell size={14} className="text-primary" />
                    </div>
                </div>

                <div className="flex-grow min-w-0 pr-2">
                    {/* Message with better line height */}
                    <p className="text-sm text-foreground leading-snug mb-3 break-words">
                        {message}
                    </p>

                    {/* Action buttons - more compact */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {link && (
                            <Link
                                href={link}
                                onClick={handleInteraction}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-pink))] hover:opacity-90 text-white rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 group"
                            >
                                <span>Lihat</span>
                                <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                            </Link>
                        )}
                        <button
                            onClick={handleInteraction}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 ${link ?
                                'bg-muted hover:bg-muted/80 text-muted-foreground'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                }`}
                        >
                            <Eye size={10} />
                            <span>{link ? "Tandai" : "OK"}</span>
                        </button>
                    </div>
                </div>

                {/* Single close button - positioned absolutely */}
                <button
                    onClick={handleClose}
                    className="absolute top-2 right-2 flex-shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors duration-200"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    );
};

const SummaryNotificationToastContent = ({ remainingCount }: { remainingCount: number }) => {
    const handleClose = () => {
        toast.dismiss();
    };

    return (
        <div className="relative overflow-hidden">
            {/* Gradient accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[hsl(var(--neon-orange))] to-orange-600 rounded-l-xl" />

            <div className="flex items-start gap-3 p-3 pl-5">
                {/* Icon container with badge */}
                <div className="relative flex-shrink-0 mt-0.5">
                    <div className="w-7 h-7 bg-gradient-to-br from-neon-orange/15 to-neon-orange/25 rounded-lg flex items-center justify-center">
                        <Inbox size={14} className="text-neon-orange" />
                    </div>
                    {/* Count badge - smaller */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white">{remainingCount > 9 ? '9+' : remainingCount}</span>
                    </div>
                </div>

                <div className="flex-grow min-w-0 pr-2">
                    <p className="text-sm text-foreground leading-snug mb-3">
                        <span className="font-semibold text-neon-orange">{remainingCount} notifikasi</span> lainnya menunggu
                    </p>

                    <Link
                        href={NOTIFICATION_PATH}
                        onClick={handleClose}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[hsl(var(--neon-orange))] hover:bg-orange-600 text-white rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 group"
                    >
                        <Inbox size={10} />
                        <span>Lihat Semua</span>
                        <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                    </Link>
                </div>

                {/* Single close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-2 right-2 flex-shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors duration-200"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    );
};

export default function HomeRedirect() {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);

    const checkSessionAndRedirect = useCallback(async () => {
        const { data: { user: sessionUser }, error: userFetchError } = await supabase.auth.getUser();

        if (userFetchError || !sessionUser) {
            if (userFetchError) {
                console.error("HomeRedirect: Error fetching user:", userFetchError.message);
            } else {
                console.log("HomeRedirect: No user session found, redirecting to sign-in.");
            }
            sessionStorage.removeItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
            router.push(SIGN_IN_PATH);
            setLoading(false);
            return;
        }

        const userId = sessionUser.id;
        let userRole: string;

        try {
            const { data: userData, error: userDbError } = await supabase
                .from("users")
                .select("role")
                .eq("user_id", userId)
                .single();

            if (userDbError || !userData) {
                console.error("HomeRedirect: Error fetching user role from DB or no user data:", userDbError?.message);
                sessionStorage.removeItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
                router.push(SIGN_IN_PATH);
                setLoading(false);
                return;
            }

            userRole = userData.role || "Pegawai";
        } catch (error) {
            console.error("HomeRedirect: Unexpected error fetching user role:", error);
            sessionStorage.removeItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
            router.push(SIGN_IN_PATH);
            setLoading(false);
            return;
        }

        const loginNotificationShown = sessionStorage.getItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);

        if (!loginNotificationShown) {
            try {
                const { data: unreadNotifications, error: fetchError } = await supabase
                    .from("notifications")
                    .select("id_notif, message, link, created_at")
                    .eq("user_id", userId)
                    .eq("is_read", false)
                    .order("created_at", { ascending: false });

                if (fetchError) {
                    console.error("HomeRedirect: Error fetching unread notifications:", fetchError.message);
                } else if (unreadNotifications && unreadNotifications.length > 0) {
                    const notificationsToShowIndividually = unreadNotifications.slice(0, MAX_INDIVIDUAL_TOASTS);
                    const remainingNotificationsCount = unreadNotifications.length - notificationsToShowIndividually.length;

                    // Show individual notifications with staggered timing
                    notificationsToShowIndividually.forEach((notification, index) => {
                        setTimeout(() => {
                            toast.info(
                                <IndividualNotificationToastContent
                                    message={notification.message}
                                    link={notification.link}
                                    notificationId={notification.id_notif}
                                />,
                                {
                                    toastId: `login-notif-${notification.id_notif}`,
                                    position: "top-right",
                                    autoClose: INDIVIDUAL_TOAST_AUTOCLOSE_DURATION,
                                    hideProgressBar: true,
                                    closeOnClick: false,
                                    pauseOnHover: true,
                                    draggable: true,
                                    closeButton: false, // Disable default close button
                                    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                                    className: TOAST_COMMON_CLASSNAME,
                                }
                            );
                        }, index * INDIVIDUAL_TOAST_STAGGER_DELAY);
                    });

                    // Show summary notification if there are remaining notifications
                    if (remainingNotificationsCount > 0) {
                        const summaryToastDelay = notificationsToShowIndividually.length * INDIVIDUAL_TOAST_STAGGER_DELAY;
                        setTimeout(() => {
                            toast.info(
                                <SummaryNotificationToastContent remainingCount={remainingNotificationsCount} />,
                                {
                                    position: "top-right",
                                    autoClose: SUMMARY_TOAST_AUTOCLOSE_DURATION,
                                    hideProgressBar: true,
                                    closeButton: false, // Disable default close button
                                    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                                    className: TOAST_COMMON_CLASSNAME,
                                }
                            );
                        }, summaryToastDelay);
                    }
                }
                sessionStorage.setItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY, 'true');
            } catch (error) {
                console.error("HomeRedirect: Unexpected error fetching notification count for toast:", error);
            }
        }

        const redirectPath = ROLE_PATHS[userRole] || DEFAULT_USER_PATH;
        if (pathname !== redirectPath) {
            console.log(`HomeRedirect: User role: ${userRole}, redirecting to: ${redirectPath}`);
            router.push(redirectPath);
        }
        setLoading(false);
    }, [router, supabase, pathname]);

    useEffect(() => {
        checkSessionAndRedirect();
    }, [checkSessionAndRedirect]);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="relative">

                </div>
            </div>
        );
    }

    return null;
}