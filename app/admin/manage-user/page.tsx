"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    getUsersWithBidangAction,
    adminUpdateUserAction,
    adminDeleteUserAction,
    adminCreateUserAction,
} from "@/app/actions";
import { Modal } from "@/components/Modal";
import { FaEdit, FaTrash, FaEye, FaEyeSlash } from "react-icons/fa";
import { Users, Filter, ArrowDown, ArrowUp, ChevronsUpDown, PlusCircle } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UserRole, Jabatan, DaftarBidang, UserProfile } from "./types";
import Loading from "../loading";

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
    const supabase = createClient();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [daftarBidang, setDaftarBidang] = useState<DaftarBidang[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"edit" | "create">("edit");
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [filterRole, setFilterRole] = useState<string>("Semua");
    const [sortColumn, setSortColumn] = useState<string>('nama');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [showPassword, setShowPassword] = useState(false);

    const fetchUsers = useCallback(async (roleToFilter: string) => {
        setLoading(true);
        setError(null);
        console.log(`[fetchUsers] Fetching users with filterRole: ${roleToFilter}`);
        const result = await getUsersWithBidangAction(roleToFilter === "Semua" ? undefined : roleToFilter);
        console.log("[fetchUsers] Result from getUsersWithBidangAction:", result);
        if (result.success && result.data) {
            let sortedUsers = [...(result.data as UserProfile[])];

            // Apply sorting
            sortedUsers.sort((a, b) => {
                let aValue = '';
                let bValue = '';

                switch (sortColumn) {
                    case 'nama':
                        aValue = a.nama || '';
                        bValue = b.nama || '';
                        break;
                    case 'email':
                        aValue = a.email || '';
                        bValue = b.email || '';
                        break;
                    case 'role':
                        aValue = a.role || '';
                        bValue = b.role || '';
                        break;
                    case 'jabatan':
                        aValue = a.jabatan || '';
                        bValue = b.jabatan || '';
                        break;
                    case 'bidang':
                        aValue = a.daftar_bidang?.nama_bidang || '';
                        bValue = b.daftar_bidang?.nama_bidang || '';
                        break;
                    default:
                        aValue = a.nama || '';
                        bValue = b.nama || '';
                }

                const comparison = aValue.localeCompare(bValue);
                return sortDirection === 'asc' ? comparison : -comparison;
            });

            setUsers(sortedUsers);
        } else {
            setError(result.message || "Gagal memuat pengguna.");
            toast.error(result.message || "Gagal memuat pengguna.");
            console.error("[fetchUsers] Error fetching users:", result.message);
        }
        setLoading(false);
    }, [sortColumn, sortDirection]);

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
        // Validasi nama: hanya huruf, spasi, dan karakter khusus tertentu
        if (name === "nama") {
            // Hanya izinkan huruf, spasi, titik, koma, tanda petik, strip (tanpa unicode jika target bukan es6)
            if (!/^[a-zA-Z .,'-]*$/.test(value)) return;
        }
        // Validasi NIP: hanya angka
        if (name === "nip") {
            if (value && !/^\d*$/.test(value)) return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSort = (columnName: string) => {
        if (sortColumn === columnName) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnName);
            setSortDirection('asc');
        }
    };

    const openModal = (mode: "edit" | "create", user?: UserProfile) => {
        setModalMode(mode);
        if (mode === "edit" && user) {
            console.log(`[openModal] Opening modal in edit mode for user:`, { userId: user.user_id });
            setCurrentUser(user);
            setFormData({
                nama: user.nama || "",
                email: user.email || "",
                password: "", // Password field is for new password, keep blank for edit
                nip: user.nip || "",
                pangkat: user.pangkat || "",
                jabatan: (user.jabatan as Jabatan) || Object.values(Jabatan)[0],
                role: (user.role as UserRole) || Object.values(UserRole)[0],
                id_bidang_fkey: user.id_bidang_fkey ? String(user.id_bidang_fkey) : (daftarBidang[0]?.id_bidang ? String(daftarBidang[0].id_bidang) : ""),
            });
        } else if (mode === "create") {
            console.log("[openModal] Opening modal in create mode.");
            setCurrentUser(null);
            setFormData({
                ...initialFormData,
                id_bidang_fkey: daftarBidang[0]?.id_bidang ? String(daftarBidang[0].id_bidang) : "", // Default to first bidang if available
            });
        }
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
        // Validasi nama wajib diisi dan tidak boleh mengandung angka
        if (!formData.nama || /\d/.test(formData.nama)) {
            toast.error("Nama hanya boleh berisi huruf dan tidak boleh mengandung angka.");
            return;
        }
        // Validasi password (minimal 8 karakter, kombinasi huruf, angka, simbol)
        if (modalMode === "create" || (modalMode === "edit" && formData.password)) {
            if (!formData.password || formData.password.length < 8) {
                toast.error("Password minimal 8 karakter.");
                return;
            }
            if (!/[A-Za-z]/.test(formData.password) || !/\d/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)) {
                toast.error("Password harus mengandung huruf, angka, dan simbol.");
                return;
            }
        }
        // Validasi email
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            toast.error("Format email tidak valid.");
            return;
        }
        // Validasi NIP jika diisi (hanya angka, minimal 8 digit)
        if (formData.nip && formData.nip.length > 0 && !/^\d{8,}$/.test(formData.nip)) {
            toast.error("NIP harus berupa angka minimal 8 digit.");
            return;
        }
        // Validasi pangkat (opsional, tapi jika diisi minimal 3 karakter)
        if (formData.pangkat && formData.pangkat.length > 0 && formData.pangkat.length < 3) {
            toast.error("Pangkat minimal 3 karakter jika diisi.");
            return;
        }

        const formPayload = new FormData();
        console.log("[handleSubmit] Form submitted. Current formData state:", formData, "Mode:", modalMode);

        if (modalMode === "create" && !formData.password) {
            toast.error("Password wajib diisi untuk pengguna baru.");
            console.error("[handleSubmit] Create mode: Password is required.");
            return;
        }

        Object.entries(formData).forEach(([key, value]) => {
            if (key === "password") {
                // Only append password if it's provided (for edit) or if it's create mode and provided
                if (value || (modalMode === "create" && value)) { // Ensure password is not empty for create
                    formPayload.append(key, value);
                }
            } else {
                formPayload.append(key, value);
            }
        });

        console.log(`[handleSubmit] Payload to be sent:`, Object.fromEntries(formPayload.entries()));

        let result;
        if (modalMode === "edit" && currentUser) {
            console.log(`[handleSubmit] Calling adminUpdateUserAction for user ID: ${currentUser.user_id}.`);
            result = await adminUpdateUserAction(currentUser.user_id, formPayload);
        } else if (modalMode === "create") {
            console.log(`[handleSubmit] Calling adminCreateUserAction.`);
            result = await adminCreateUserAction(formPayload);
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

    if (loading && users.length === 0 && daftarBidang.length === 0) {
        return <Loading />;
    }

    return (
        <div className="w-full h-full p-6">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="max-w-8xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    <div className="bg-primary/10 px-6 py-4 rounded-t-lg flex justify-center items-center">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
                            <Users size={24} /> Kelola Pengguna
                        </h2>
                    </div>

                    <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="w-full sm:w-auto">
                            <label htmlFor="roleFilter" className="block text-sm font-medium text-foreground mb-1.5">
                                <Filter size={16} className="inline mr-1" /> Filter Berdasarkan Role:
                            </label>
                            <select
                                id="roleFilter"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="w-full md:w-64 px-3 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm transition-colors duration-300"
                            >
                                <option value="Semua">Semua Role</option>
                                {Object.values(UserRole)
                                    .filter(role => role !== UserRole.ADMIN) // Sembunyikan Admin dari filter
                                    .map((role) => (
                                        <option key={role} value={role}>{role.replace(/_/g, " ")}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => openModal("create")}
                            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-md hover:bg-primary/90 border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-150"
                        >
                            <PlusCircle size={18} /> Tambah Pengguna
                        </button>
                    </div>

                    {error && <div className="px-6 py-2"><p className="text-destructive">{error}</p></div>}

                    <div className="p-6 flex-grow flex flex-col overflow-auto">
                        {users.length > 0 ? (
                            <table className="min-w-full divide-y divide-border rounded-lg overflow-hidden">
                                <thead>
                                    <tr className="bg-muted text-muted-foreground">
                                        <th
                                            className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                                            onClick={() => handleSort('nama')}
                                        >
                                            Nama
                                            {sortColumn === 'nama' && (
                                                sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />
                                            )}
                                            {sortColumn !== 'nama' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                                        </th>
                                        <th
                                            className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                                            onClick={() => handleSort('email')}
                                        >
                                            Email
                                            {sortColumn === 'email' && (
                                                sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />
                                            )}
                                            {sortColumn !== 'email' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                                        </th>
                                        <th
                                            className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                                            onClick={() => handleSort('jabatan')}
                                        >
                                            Jabatan
                                            {sortColumn === 'jabatan' && (
                                                sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />
                                            )}
                                            {sortColumn !== 'jabatan' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                                        </th>
                                        <th
                                            className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                                            onClick={() => handleSort('role')}
                                        >
                                            Role
                                            {sortColumn === 'role' && (
                                                sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />
                                            )}
                                            {sortColumn !== 'role' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                                        </th>
                                        <th
                                            className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                                            onClick={() => handleSort('bidang')}
                                        >
                                            Bidang
                                            {sortColumn === 'bidang' && (
                                                sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />
                                            )}
                                            {sortColumn !== 'bidang' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                                        </th>
                                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">NIP</th>
                                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Pangkat</th>
                                        <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {users.map((user) => (
                                        <tr key={user.user_id} className="hover:bg-muted transition-colors duration-150">
                                            <td className="px-3 py-3 text-sm font-medium text-foreground">{user.nama}</td>
                                            <td className="px-3 py-3 text-sm text-muted-foreground">{user.email}</td>
                                            <td className="px-3 py-3 text-sm text-muted-foreground">{user.jabatan?.replace(/_/g, " ") || "-"}</td>
                                            <td className="px-3 py-3 text-sm text-muted-foreground">{user.role.replace(/_/g, " ") || "-"}</td>
                                            <td className="px-3 py-3 text-sm text-muted-foreground">{user.daftar_bidang?.nama_bidang || "-"}</td>
                                            <td className="px-3 py-3 text-sm text-center text-muted-foreground">{user.nip || "-"}</td>
                                            <td className="px-3 py-3 text-sm text-center text-muted-foreground">{user.pangkat || "-"}</td>
                                            <td className="px-3 py-3 text-sm text-center whitespace-nowrap">
                                                <button
                                                    onClick={() => user.role !== UserRole.ADMIN && openModal("edit", user)}
                                                    className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out mr-2"
                                                    title="Edit"
                                                    disabled={user.role === UserRole.ADMIN} // Nonaktifkan jika user adalah Admin
                                                >
                                                    <FaEdit className="transform group-hover:scale-110 transition-transform duration-150" />
                                                </button>
                                                <button
                                                    onClick={() => user.role !== UserRole.ADMIN && handleDelete(user.user_id)}
                                                    className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-destructive group transition-all duration-150 ease-in-out"
                                                    title="Hapus"
                                                    disabled={user.role === UserRole.ADMIN} // Nonaktifkan jika user adalah Admin
                                                >
                                                    <FaTrash className="transform group-hover:scale-110 transition-transform duration-150" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-16 bg-muted/50 rounded-lg flex-grow flex flex-col justify-center items-center">
                                <Users size={48} className="mx-auto text-muted-foreground" />
                                <p className="mt-2 text-lg text-muted-foreground">
                                    {filterRole !== "Semua" ? `Tidak ada pengguna dengan role ${filterRole.replace(/_/g, " ")} ditemukan.` : "Tidak ada pengguna ditemukan."}
                                </p>
                            </div>
                        )}
                    </div>

                    <Modal 
                        isOpen={isModalOpen} 
                        onClose={closeModal} 
                        title={modalMode === "edit" ? "Edit Pengguna" : "Tambah Pengguna Baru"}
                    >
                        <form onSubmit={handleSubmit} className="space-y-4 p-2">
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
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        id="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input text-foreground pr-10"
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-base px-1 py-0.5 rounded focus:outline-none"
                                        onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
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
                                        {Object.values(UserRole)
                                            .filter(role => role !== UserRole.ADMIN) // Sembunyikan Admin dari pilihan role di modal
                                            .map(role => <option key={role} value={role}>{role.replace(/_/g, " ")}</option>)}
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
                                    {modalMode === "edit" ? "Perbarui" : "Tambah Pengguna"}
                                </button>
                            </div>
                        </form>
                    </Modal>
                </div>
            </div>
        </div>
    );
}