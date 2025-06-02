"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCurrentUserProfile, updateCurrentUserProfileAction } from "@/app/actions";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UserProfile, Jabatan, UserRole } from "./types"; // Menggunakan tipe dari file lokal
import { Eye, EyeOff } from "lucide-react";

const initialFormData = {
    nama: "",
    email: "", // Email tidak bisa diubah oleh pengguna
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
    const [error, setError] = useState<string | null>(null);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await getCurrentUserProfile();
        if (result.success && result.data) {
            // Handle potential array for daftar_bidang and ensure enum types
            const rawData = result.data as any; // Use 'any' for intermediate transformation
            
            const transformedDaftarBidang = 
                rawData.daftar_bidang && Array.isArray(rawData.daftar_bidang) && rawData.daftar_bidang.length > 0
                ? rawData.daftar_bidang[0] // Take the first object from the array
                : rawData.daftar_bidang && !Array.isArray(rawData.daftar_bidang) 
                    ? rawData.daftar_bidang // If it's already an object (robustness)
                    : null;

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

        const payload = new FormData();
        payload.append("nama", formData.nama);
        if (formData.nip) payload.append("nip", formData.nip);
        if (formData.pangkat) payload.append("pangkat", formData.pangkat);

        // Logika untuk update password (jika diimplementasikan di action terpisah atau di sini)
        if (formData.newPassword) {
            if (formData.newPassword !== formData.confirmNewPassword) {
                toast.error("Password baru dan konfirmasi password tidak cocok.");
                return;
            }
            // Jika ingin update password di sini, tambahkan ke payload dan handle di server action
            // Untuk saat ini, kita fokus pada update profil dasar
            // payload.append("newPassword", formData.newPassword);
            // Untuk update password, biasanya lebih aman menggunakan updateUser dari Supabase Auth
            // yang memerlukan password saat ini atau link reset.
            // Untuk kesederhanaan, kita akan memisahkan update password.
            try {
                const { error: passwordError } = await supabase.auth.updateUser({ password: formData.newPassword });
                if (passwordError) {
                    toast.error(`Gagal memperbarui password: ${passwordError.message}`);
                    return; // Hentikan jika update password gagal
                }
                toast.success("Password berhasil diperbarui!");
            } catch (err: any) {
                toast.error(`Error saat memperbarui password: ${err.message}`);
                return;
            }
        }


        const result = await updateCurrentUserProfileAction(payload);

        if (result.success) {
            toast.success(result.message);
            fetchProfile(); // Refresh data profil
            setFormData(prev => ({ ...prev, newPassword: "", confirmNewPassword: "" })); // Reset password fields
        } else {
            toast.error(result.message || "Gagal memperbarui profil.");
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
                        <button type="submit" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                            Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}