// d:\Project\end\ocr-arsip\app\admin\manage-users\page.tsx
"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    getUsersWithBidangAction,    
    adminUpdateUserAction,
    adminDeleteUserAction,
} from "@/app/actions";
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";
import { Modal } from "@/components/Modal"; 
import { FaEdit, FaTrash, FaFilter } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Re-define or import these from a shared types file
export enum UserRole {
    ADMIN = "Admin",
    PEGAWAI = "Pegawai",
    KEPALA_BIDANG = "Kepala_Bidang",
    KEPALA_DINAS = "Kepala_Dinas",
    SEKRETARIS = "Sekretaris",
}

export enum Jabatan {
    ARSIPARIS_AHLI_PERTAMA = "Arsiparis Ahli Pertama",
    ARSIPARIS_AHLI_MUDA = "Arsiparis Ahli Muda",
    ARSIPARIS_PENYELIA = "Arsiparis Penyelia",
    PENGADMINISTRASI_UMUM = "Pengadministrasi Umum",
    KEPALA_DINAS = "Kepala Dinas",
    SEKRETARIS = "Sekretaris",
    KEPALA_BIDANG = "Kepala Bidang",
    STAFF_ADMINISTRASI = "Staff Administrasi",
    ANALIS_KEBIJAKAN = "Analis Kebijakan",
}

export interface DaftarBidang {
    id_bidang: number;
    nama_bidang: string;
}

export interface UserProfile {
    user_id: string;
    nama: string;
    email: string;
    jabatan: Jabatan | string | null;
    role: UserRole | string;
    nip: string | null;
    id_bidang_fkey: number | null;
    pangkat: string | null;
    created_at: string;
    daftar_bidang?: { nama_bidang: string } | null;
}
// End of type definitions

const initialFormData = {
    nama: "",
    email: "",
    password: "",
    nip: "",
    pangkat: "",
    jabatan: Object.values(Jabatan)[0],
    role: Object.values(UserRole)[0],
    id_bidang_fkey: "",
};

export default function ManageUsersPage() {
    const supabase = createClient(); // For fetching daftar_bidang client-side
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [daftarBidang, setDaftarBidang] = useState<DaftarBidang[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"edit">("edit"); // Default to "edit", "create" mode is removed
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [filterRole, setFilterRole] = useState<string>("Semua");

    const fetchUsers = useCallback(async (roleToFilter: string) => {
        setLoading(true);
        setError(null);
        console.log(`[fetchUsers] Fetching users with filterRole: ${roleToFilter}`);
        const result = await getUsersWithBidangAction(roleToFilter === "Semua" ? undefined : roleToFilter);
        console.log("[fetchUsers] Result from getUsersWithBidangAction:", result);
        if (result.success && result.data) {
            setUsers(result.data as UserProfile[]);
        } else {
            setError(result.message || "Gagal memuat pengguna.");
            toast.error(result.message || "Gagal memuat pengguna.");
            console.error("[fetchUsers] Error fetching users:", result.message);
        }
        setLoading(false);
    }, []);

    const fetchDaftarBidang = useCallback(async () => {
        const { data, error } = await supabase.from("daftar_bidang").select("id_bidang, nama_bidang");
        if (error) {
            const errorMessage = "Gagal memuat daftar bidang.";
            toast.error(errorMessage);
            console.error("[fetchDaftarBidang] Error fetching daftar bidang:", error);
        } else {
            console.log("[fetchDaftarBidang] Successfully fetched daftar bidang:", data);
            setDaftarBidang(data as DaftarBidang[]);
            if (data && data.length > 0) {
                setFormData(prev => ({ ...prev, id_bidang_fkey: String(data[0].id_bidang) }));
            }
        }
    }, [supabase]);

    useEffect(() => {
        console.log("[useEffect] Initializing page, fetching daftar bidang and users.");
        fetchDaftarBidang();
        fetchUsers(filterRole);
    }, [fetchUsers, fetchDaftarBidang, filterRole]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Modified openModal to only handle "edit" mode
    const openModal = (user: UserProfile) => {
        setModalMode("edit");
        console.log(`[openModal] Opening modal in edit mode for user:`, { userId: user.user_id });
        setCurrentUser(user);
        setFormData({
            nama: user.nama || "",
            email: user.email || "",
            password: "", // Keep password blank for edit, only set if changing
            nip: user.nip || "",
            pangkat: user.pangkat || "",
            jabatan: (user.jabatan as Jabatan) || Object.values(Jabatan)[0],
            role: (user.role as UserRole) || Object.values(UserRole)[0],
            id_bidang_fkey: user.id_bidang_fkey ? String(user.id_bidang_fkey) : (daftarBidang[0]?.id_bidang ? String(daftarBidang[0].id_bidang) : ""),
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        console.log("[closeModal] Modal closed.");
        setCurrentUser(null);
        setFormData(initialFormData);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const formPayload = new FormData();
        console.log("[handleSubmit] Form submitted. Current formData state:", formData);
        Object.entries(formData).forEach(([key, value]) => {
            // Only append password if it's not empty OR if it's create mode
            if (key === "password" && !value) { // For edit mode, only append password if not empty
                return; // Don't append empty password for edit
            }
            formPayload.append(key, value);
        });

        console.log(`[handleSubmit] Mode: ${modalMode}. Payload to be sent:`, Object.fromEntries(formPayload.entries()));

        let result;
        // "create" mode is removed, so we only handle "edit"
        if (currentUser) {
            console.log(`[handleSubmit] Calling adminUpdateUserAction for user ID: ${currentUser.user_id} (Mode: ${modalMode})...`);
            result = await adminUpdateUserAction(currentUser.user_id, formPayload);
        }

        console.log("[handleSubmit] Result from server action:", result);

        if (result?.success) {
            toast.success(result.message);
            console.log("[handleSubmit] Operation successful. Fetching updated users list.");
            fetchUsers(filterRole);
            closeModal();
        } else {
            toast.error(result?.message || "Operasi gagal.");
            console.error("[handleSubmit] Operation failed:", result?.message);
        }
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
            console.log(`[handleDelete] Attempting to delete user ID: ${userId}`);
            const result = await adminDeleteUserAction(userId);
            console.log(`[handleDelete] Result for user ID ${userId}:`, result);
            if (result.success) {
                toast.success(result.message);
                fetchUsers(filterRole);
            } else {
                toast.error(result.message || "Gagal menghapus pengguna.");
            }
        }
    };

    if (loading && users.length === 0 && daftarBidang.length === 0) { // Show skeleton only on initial full load
        console.log("[Render] Displaying initial loading skeleton.");
        return (
            <div className="bg-background p-8 w-full">
                <div className="max-w-7xl mx-auto"><LoadingSkeleton /></div>
            </div>
        );
    }

    // console.log("[Render] Page rendering. Loading:", loading, "Users count:", users.length, "Error:", error);
    return (
        <div className="bg-background p-4 md:p-8 w-full">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="max-w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-foreground">Kelola Pengguna</h1>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-border rounded-md bg-card text-foreground focus:ring-primary focus:border-primary w-full"
                            >
                                <option value="Semua">Semua Role</option>
                                {Object.values(UserRole).map((role) => (
                                    <option key={role} value={role}>{role.replace(/_/g, " ")}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {error && <p className="text-destructive mb-4">{error}</p>}

                <div className="bg-card shadow-md rounded-lg overflow-x-auto border border-border">
                    {loading && users.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">Memuat data pengguna...</div>
                    ) : !loading && users.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">Tidak ada pengguna ditemukan.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    {["Nama", "Email", "Jabatan", "Role", "Bidang", "NIP", "Pangkat", "Aksi"].map(header => (
                                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {users.map((user) => (
                                    <tr key={user.user_id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{user.nama}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.jabatan?.replace(/_/g, " ") || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.role.replace(/_/g, " ") || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.daftar_bidang?.nama_bidang || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.nip || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.pangkat || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button onClick={() => openModal(user)} className="text-primary hover:text-primary/80" title="Edit">
                                                <FaEdit />
                                            </button>
                                            <button onClick={() => handleDelete(user.user_id)} className="text-destructive hover:text-destructive/80" title="Hapus">
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <Modal isOpen={isModalOpen} onClose={closeModal} title={"Edit Pengguna"}> {/* Title is now always "Edit Pengguna" */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="nama" className="block text-sm font-medium text-muted-foreground">Nama Lengkap</label>
                            <input type="text" name="nama" id="nama" value={formData.nama} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">Email</label>
                            <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground" />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                                Password (Kosongkan jika tidak ingin mengubah)
                            </label>
                            <input type="password" name="password" id="password" value={formData.password} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="nip" className="block text-sm font-medium text-muted-foreground">NIP</label>
                                <input type="text" name="nip" id="nip" value={formData.nip} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground" />
                            </div>
                            <div>
                                <label htmlFor="pangkat" className="block text-sm font-medium text-muted-foreground">Pangkat/Golongan</label>
                                <input type="text" name="pangkat" id="pangkat" value={formData.pangkat} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="jabatan" className="block text-sm font-medium text-muted-foreground">Jabatan</label>
                                <select name="jabatan" id="jabatan" value={formData.jabatan} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground">
                                    {Object.values(Jabatan).map(jab => <option key={jab} value={jab}>{jab.replace(/_/g, " ")}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-muted-foreground">Role</label>
                                <select name="role" id="role" value={formData.role} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground">
                                    {Object.values(UserRole).map(role => <option key={role} value={role}>{role.replace(/_/g, " ")}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="id_bidang_fkey" className="block text-sm font-medium text-muted-foreground">Bidang/Unit Kerja</label>
                            <select name="id_bidang_fkey" id="id_bidang_fkey" value={formData.id_bidang_fkey} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground">
                                {daftarBidang.length === 0 && <option value="" disabled>Memuat bidang...</option>}
                                {daftarBidang.map(bidang => <option key={bidang.id_bidang} value={bidang.id_bidang}>{bidang.nama_bidang.replace(/_/g, " ")}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={closeModal} className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50">Batal</button>
                            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                                Perbarui
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        </div>
    );
}
