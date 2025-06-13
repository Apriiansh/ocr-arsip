"use client";

import Link from "next/link";
import { BookOpen, ChevronLeft, UserCircle, Users, FilePlus, FileSearch, FolderSync, FileArchive, LucideStretchHorizontal, CheckSquare, BarChart2, TimerOff } from "lucide-react";

interface ManualItem {
    title: string;
    icon: React.ElementType;
    description: string;
    slug: string; 
}

interface ManualSection {
    title: string;
    items: ManualItem[];
}

const manualData: ManualSection[] = [
    {
        title: "Dasar Aplikasi",
        items: [
            {
                title: "Login",
                icon: UserCircle,
                description: "Cara masuk ke dalam aplikasi.",
                slug: "login"
            },
            {
                title: "Mengganti Password",
                icon: UserCircle,
                description: "Langkah-langkah untuk mengubah kata sandi akun Anda.",
                slug: "mengganti-password"
            },
        ],
    },
    {
        title: "Admin",
        items: [
            {
                title: "Daftar Akun",
                icon: UserCircle,
                description: "Panduan membuat akun baru.",
                slug: "daftar-akun"
            },
            {
                title: "Kelola Pengguna",
                icon: Users,
                description: "Manajemen akun pengguna, peran, dan hak akses.",
                slug: "kelola-pengguna"
            },
        ],
    },
    {
        title: "Pegawai (Pejabat Struktural)",
        items: [
            {
                title: "Menambahkan Arsip Aktif",
                icon: FilePlus,
                description: "Proses input data dan unggah dokumen arsip aktif.",
                slug: "menambahkan-arsip-aktif"
            },
            {
                title: "Melihat Daftar Arsip Aktif",
                icon: FileSearch,
                description: "Menampilkan dan mencari arsip aktif yang sudah ada.",
                slug: "daftar-arsip-aktif"
            },
            {
                title: "Visualisasi Filing Cabinet",
                icon: LucideStretchHorizontal,
                description: "Menampilkan visualisasi filing cabinet sesuai bidang masing-masing.",
                slug: "visualisasi-filing-cabinet"
            },
            {
                title: "Monitoring Retensi Arsip Aktif",
                icon: TimerOff,
                description: "Langkah-langkah memindahkan arsip aktif menjadi inaktif.",
                slug: "pemindahan-arsip"
            },
            {
                title: "Proses Pemindahan Arsip",
                icon: FolderSync,
                description: "Langkah-langkah memindahkan arsip aktif menjadi inaktif.",
                slug: "pemindahan-arsip"
            },
            {
                title: "Melihat Daftar Arsip Inaktif",
                icon: FileArchive,
                description: "Menampilkan dan mencari arsip inaktif.",
                slug: "daftar-arsip-inaktif"
            },
        ],
    },
    {
        title: "Sekretaris / Kepala Bidang",
        items: [
            {
                title: "Verifikasi Arsip Aktif",
                icon: CheckSquare,
                description: "Proses persetujuan atau penolakan arsip aktif oleh Kepala Bidang.",
                slug: "verifikasi-arsip-aktif"
            },
            {
                title: "Verifikasi Arsip Inaktif",
                icon: CheckSquare,
                description: "Proses persetujuan atau penolakan arsip inaktif oleh Sekretaris.",
                slug: "verifikasi-arsip-inaktif"
            },
            {
                title: "Verifikasi Pemindahan Arsip",
                icon: CheckSquare,
                description: "Proses persetujuan atau penolakan pemindahan arsip.",
                slug: "verifikasi-pemindahan-arsip"
            },
        ],
    },
    {
        title: "Kepala Dinas",
        items: [
            {
                title: "Lihat Laporan Arsip Aktif",
                icon: BarChart2,
                description: "Menampilkan laporan rekapitulasi arsip aktif.",
                slug: "laporan-arsip-aktif"
            },
            {
                title: "Lihat Laporan Arsip Inaktif",
                icon: BarChart2,
                description: "Menampilkan laporan rekapitulasi arsip inaktif.",
                slug: "laporan-arsip-inaktif"
            },
        ],
    },
];

export default function UserManualPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-10 bg-card shadow-sm border-b border-border">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/sign-in" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                            <ChevronLeft size={20} />
                            <span className="text-sm font-medium">Kembali ke Sign In</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <BookOpen className="text-primary" />
                            <h1 className="text-xl font-semibold">Panduan Pengguna</h1>
                        </div>
                        {/* Placeholder for potential future actions like search */}
                        <div className="w-28"></div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl mx-auto">
                    <p className="text-center text-muted-foreground mb-10">
                        Selamat datang di panduan pengguna CrChive. Di sini Anda akan menemukan informasi mengenai cara menggunakan berbagai fitur aplikasi.
                    </p>

                    {manualData.map((section, sectionIndex) => (
                        <section key={sectionIndex} className="mb-12">
                            <h2 className="text-2xl font-semibold text-primary mb-6 pb-2 border-b border-border">
                                {section.title}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {section.items.map((item, itemIndex) => (
                                    <Link
                                        key={itemIndex}
                                        href={`/user-manual/${item.slug}`}
                                        className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col group cursor-pointer hover:border-primary/20"
                                    >
                                        <div className="flex items-center mb-3">
                                            <item.icon className="w-6 h-6 text-primary mr-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                                            <h3 className="text-lg font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                                                {item.title}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex-grow mb-4">
                                            {item.description}
                                        </p>
                                        <div className="text-sm text-primary group-hover:underline self-start mt-auto">
                                            Pelajari lebih lanjut &rarr;
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))}

                    <section className="mt-16 text-center">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Butuh Bantuan Lebih Lanjut?</h2>
                        <p className="text-muted-foreground mb-6">
                            Jika Anda tidak menemukan jawaban atas pertanyaan Anda di sini, jangan ragu untuk menghubungi tim dukungan kami.
                        </p>
                        <Link
                            href="/contact-support" // Ganti dengan link kontak yang sesuai
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-background bg-primary hover:bg-primary/90 transition-colors"
                        >
                            Hubungi Dukungan
                        </Link>
                    </section>
                </div>
            </main>
        </div>
    );
}