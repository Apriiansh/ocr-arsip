"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCurrentUserProfile, updateCurrentUserProfileAction } from "@/app/actions";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UserProfile, Jabatan, UserRole } from "./types";
import { Eye, EyeOff } from "lucide-react";

const initialFormData = {
    nama: "",
    email: "",
    nip: "",
    pangkat: "",
    newPassword: "",
    confirmNewPassword: "",
};

export default function SettingsPage() {
    const supabase = createClient();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await getCurrentUserProfile();
        if (result.success && result.data) {
            // Fix: Specify the type instead of any for rawData
            const rawData = result.data as UserProfile & {
                daftar_bidang?: { nama_bidang?: string }[] | { nama_bidang?: string } | null;
            };

            const rawDaftarBidang = rawData.daftar_bidang;
            let transformedDaftarBidang: { nama_bidang: string } | null = null;

            if (rawDaftarBidang) {
                if (Array.isArray(rawDaftarBidang) && rawDaftarBidang.length > 0) {
                    const nama_bidang = rawDaftarBidang[0]?.nama_bidang;
                    if (typeof nama_bidang === "string") {
                        transformedDaftarBidang = { nama_bidang };
                    }
                } else if (!Array.isArray(rawDaftarBidang) && typeof rawDaftarBidang.nama_bidang === "string") {
                    transformedDaftarBidang = { nama_bidang: rawDaftarBidang.nama_bidang };
                }
            }

            const profile: UserProfile = {
                user_id: rawData.user_id,
                nama: rawData.nama,
                email: rawData.email,
                nip: rawData.nip,
                pangkat: rawData.pangkat,
                jabatan: rawData.jabatan as Jabatan,
                role: rawData.role as UserRole,
                id_bidang_fkey: rawData.id_bidang_fkey,
                daftar_bidang: transformedDaftarBidang,
            };

            setUserProfile(profile);
            setFormData({
                nama: profile.nama || "",
                email: profile.email || "",
                nip: profile.nip || "",
                pangkat: profile.pangkat || "",
                newPassword: "",
                confirmNewPassword: "",
            });
        } else {
            setError(result.message || "Gagal memuat profil pengguna.");
            toast.error(result.message || "Gagal memuat profil pengguna.");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // Buat instance FormData baru setiap kali submit
        const currentPayload = new FormData();
        currentPayload.append("nama", formData.nama);
        if (formData.nip) currentPayload.append("nip", formData.nip);
        if (formData.pangkat) currentPayload.append("pangkat", formData.pangkat);

        try {
            // Bagian untuk update password
            if (formData.newPassword) {
                if (formData.newPassword !== formData.confirmNewPassword) {
                    toast.error("Password baru dan konfirmasi password tidak cocok.");
                    // setIsSubmitting akan dihandle oleh finally
                    return;
                }
                try {
                    const { error: passwordError } = await supabase.auth.updateUser({ password: formData.newPassword });
                    if (passwordError) {
                        console.error("Password update error object:", passwordError); // Log detail error
                        toast.error(`Gagal memperbarui password: ${passwordError.message}`);
                        // setIsSubmitting akan dihandle oleh finally
                        return;
                    }
                    toast.success("Password berhasil diperbarui!");
                    // Kosongkan field password setelah berhasil
                    setFormData(prev => ({ ...prev, newPassword: "", confirmNewPassword: "" }));
                } catch (err: unknown) { // Catch untuk supabase.auth.updateUser
                    console.error("Exception during password update:", err); // Log exception
                    let errorMessage = "Terjadi kesalahan tidak diketahui saat memperbarui password.";
                    if (err instanceof Error) {
                        errorMessage = `Error saat memperbarui password: ${err.message}`;
                    }
                    toast.error(errorMessage);
                    // setIsSubmitting akan dihandle oleh finally
                    return;
                }
            }

            // Bagian untuk update profil (nama, nip, pangkat)
            // Hanya dijalankan jika update password berhasil atau tidak ada percobaan update password
            const result = await updateCurrentUserProfileAction(currentPayload);

            if (result.success) {
                toast.success(result.message);
                await fetchProfile(); // Muat ulang profil untuk data terbaru
            } else {
                toast.error(result.message || "Gagal memperbarui profil.");
            }
        } catch (profileUpdateError: unknown) {
            // Catch error tak terduga dari updateCurrentUserProfileAction atau logika lain
            console.error("Kesalahan tak terduga saat update profil:", profileUpdateError);
            const message = profileUpdateError instanceof Error ? profileUpdateError.message : "Terjadi kesalahan tak terduga.";
            toast.error(`Gagal memperbarui profil: ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Memuat profil Anda...</div>;
    }

    if (error || !userProfile) {
        return <div className="p-8 text-center text-destructive">{error || "Profil tidak ditemukan."}</div>;
    }

    return (
        <div className="bg-background p-4 md:p-8 w-full flex-grow">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="max-w-2xl mx-auto bg-card shadow-lg rounded-lg p-6 md:p-8 border border-border">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Pengaturan Akun</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="nama" className="block text-sm font-medium text-muted-foreground">Nama Lengkap</label>
                        <input type="text" name="nama" id="nama" value={formData.nama} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">Email</label>
                        <input type="email" name="email" id="email" value={formData.email} disabled className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-muted-foreground sm:text-sm cursor-not-allowed" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="nip" className="block text-sm font-medium text-muted-foreground">NIP</label>
                            <input type="text" name="nip" id="nip" value={formData.nip} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground" />
                        </div>
                        <div>
                            <label htmlFor="pangkat" className="block text-sm font-medium text-muted-foreground">Pangkat/Golongan</label>
                            <input type="text" name="pangkat" id="pangkat" value={formData.pangkat} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Jabatan</label>
                        <input type="text" value={userProfile.jabatan?.replace(/_/g, " ") || "-"} disabled className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-muted-foreground sm:text-sm cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Role</label>
                        <input type="text" value={userProfile.role?.replace(/_/g, " ") || "-"} disabled className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-muted-foreground sm:text-sm cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Bidang/Unit Kerja</label>
                        <input type="text" value={userProfile.daftar_bidang?.nama_bidang?.replace(/_/g, " ") || "-"} disabled className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-muted-foreground sm:text-sm cursor-not-allowed" />
                    </div>

                    <div className="pt-4 border-t border-border">
                        <h2 className="text-lg font-semibold text-foreground mb-3">Ubah Password</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-muted-foreground">Password Baru</label>
                                <div className="relative">
                                    <input type={showNewPassword ? "text" : "password"} name="newPassword" id="newPassword" value={formData.newPassword} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground pr-10" />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground">
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-muted-foreground">Konfirmasi Password Baru</label>
                                <div className="relative">
                                    <input type={showConfirmNewPassword ? "text" : "password"} name="confirmNewPassword" id="confirmNewPassword" value={formData.confirmNewPassword} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground pr-10" />
                                    <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground">
                                        {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting || loading}
                        >
                            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}