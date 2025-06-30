"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, FileText, RefreshCcw, ListChecks, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Loading from "../daftar-aktif/loading";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/utils/supabase/client";

export default function DaftarAlihMediaPage() {
    const { user, isLoading: isAuthLoading, error: authError } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [searching, setSearching] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [exactMatch, setExactMatch] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const loadData = async (searchText?: string, optCaseSensitive = caseSensitive, optExactMatch = exactMatch) => {
        setLoading(true);
        setError("");
        try {
            if (!user?.id_bidang_fkey) throw new Error("User bidang tidak ditemukan");
            let query = supabase
                .from("alih_media_isi_arsip")
                .select(`
                    id_alih_media, id_isi_arsip_fkey, hasil_ocr_json, status, file_url, created_at,
                    isi_berkas_arsip:isi_berkas_arsip!inner (
                        id_isi_arsip, id_berkas_induk_fkey, nomor_item, kode_klasifikasi, uraian_informasi,
                        berkas_arsip_aktif:id_berkas_induk_fkey!inner (
                            nomor_berkas, uraian_informasi, akses,
                            lokasi_penyimpanan!inner(id_bidang_fkey)
                        )
                    )
                `)
                .eq('isi_berkas_arsip.berkas_arsip_aktif.lokasi_penyimpanan.id_bidang_fkey', user.id_bidang_fkey);
            if (searchText && searchText.trim() !== "") {
                const keys = [
                    'isi', 'hal', 'kepada', 'alamat', 'penutup', 'nomor', 'tanggal',
                    'instansi1', 'instansi2', 'ttdNama', 'ttdJabatan', 'ttdNip', 'ttdPangkat', 'alamatTujuan'
                ];
                let op = optCaseSensitive ? 'like' : 'ilike';
                let val = optExactMatch ? searchText : `%${searchText}%`;
                const orString = keys.map(key => `hasil_ocr_json->>${key}.${op}.${val}`).join(',');
                query = query.or(orString);
            }
            const { data, error } = await query;
            if (error) throw new Error(error.message);
            setData(data || []);
        } catch (e: any) {
            setError(e.message || "Gagal memuat data");
        } finally {
            setLoading(false);
            setSearching(false);
        }
    };

    useEffect(() => {
        if (!isAuthLoading && user) {
            loadData();
        }
    }, [isAuthLoading, user]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearching(true);
        loadData(search, caseSensitive, exactMatch);
    };

    if (isAuthLoading || loading) return <Loading />;
    if (authError) return <div className="flex items-center justify-center h-full text-red-500">Error Autentikasi: {authError}</div>;
    if (error) return <div className="text-red-500 p-8">{error} <button onClick={() => loadData(search)} className="ml-2 text-blue-600 underline"><RefreshCcw size={16} className="inline" /> Coba Lagi</button></div>;
    if (!user) return <Loading />;

    return (
        <div className="w-full h-full p-6">
            <div className="max-w-10xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    {/* Header */}
                    <div className="bg-primary/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-lg">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <ListChecks size={24} /> Daftar Arsip Alih Media
                        </h2>
                        <form onSubmit={handleSearch} className="flex flex-col gap-2 items-stretch sm:flex-row sm:items-center sm:gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                                <input
                                    type="text"
                                    className="input input-bordered px-4 py-2 pr-10 rounded-lg border border-border bg-background text-foreground focus:outline-primary w-full shadow-sm focus:ring-2 focus:ring-primary/30 transition"
                                    placeholder="Cari isi dokumen, nomor, tujuan, dll..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    disabled={loading || searching}
                                    autoFocus
                                />
                                {search && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-1 py-0.5 rounded focus:outline-none"
                                        onClick={() => { setSearch(""); loadData(""); }}
                                        tabIndex={-1}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary px-5 py-2 rounded-lg font-semibold shadow-sm flex items-center gap-2 disabled:opacity-60"
                                disabled={loading || searching}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                {searching ? 'Mencari...' : 'Cari'}
                            </button>
                            <div className="relative">
                                <button
                                    type="button"
                                    className="flex items-center gap-1 px-3 py-2 border border-border rounded-lg bg-background text-xs font-medium shadow-sm hover:bg-muted/60 transition"
                                    onClick={e => {
                                        e.preventDefault();
                                        setShowFilterDropdown(v => !v);
                                    }}
                                    tabIndex={0}
                                >
                                    Filter
                                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showFilterDropdown && (
                                    <div className="absolute right-0 mt-2 z-20 bg-background border border-border rounded-lg shadow-lg p-3 min-w-[180px] flex flex-col gap-2">
                                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={caseSensitive}
                                                onChange={e => setCaseSensitive(e.target.checked)}
                                                className="accent-primary"
                                                disabled={loading || searching}
                                            />
                                            Case Sensitive
                                        </label>
                                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={exactMatch}
                                                onChange={e => setExactMatch(e.target.checked)}
                                                className="accent-primary"
                                                disabled={loading || searching}
                                            />
                                            Exact Match
                                        </label>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                    {/* Table Section */}
                    <div className="p-6 flex-grow flex flex-col overflow-auto">
                        {data.length > 0 ? (
                            <table className="min-w-full divide-y divide-border rounded-lg overflow-hidden">
                                <thead>
                                    <tr className="bg-muted text-muted-foreground">
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">No. Berkas</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">No. Item</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Kode Klasifikasi</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Uraian Informasi</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">File</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {data.map((item: any) => (
                                        <tr key={item.id_alih_media} className="hover:bg-muted transition-colors duration-150">
                                            <td className="px-4 py-3 text-sm text-center" title={item.isi_berkas_arsip?.berkas_arsip_aktif?.uraian_informasi}>
                                                {item.isi_berkas_arsip?.berkas_arsip_aktif?.nomor_berkas || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center">{item.isi_berkas_arsip?.nomor_item}</td>
                                            <td className="px-4 py-3 text-sm text-center">{item.isi_berkas_arsip?.kode_klasifikasi}</td>
                                            <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={item.isi_berkas_arsip?.uraian_informasi}>{item.isi_berkas_arsip?.uraian_informasi}</td>
                                            <td className="px-4 py-3 text-sm text-center">
                                                {item.file_url ? (
                                                    <a
                                                        href={item.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center w-9 h-9 rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
                                                        title="Lihat File"
                                                    >
                                                        <Eye size={18} />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center">
                                                <Link
                                                    href={`/arsip/alih-media?isiArsipId=${item.isi_berkas_arsip?.id_isi_arsip}&fileUrl=${encodeURIComponent(item.file_url || "")}`}
                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-md btn-accent hover:bg-accent/90 transition"
                                                    title="Alih Media dari File Digital (OCR Surat Scan)"
                                                >
                                                    <Wand2 size={18} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-16 bg-muted/50 rounded-lg flex-grow flex flex-col justify-center items-center">
                                <FileText size={48} className="mx-auto text-muted-foreground" />
                                <p className="mt-2 text-lg text-muted-foreground">Tidak ada arsip yang siap dialihmediakan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
