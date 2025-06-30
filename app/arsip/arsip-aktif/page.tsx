"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ArsipAktifFormUI from "./components/ArsipAktifFormUI";
import BerkasArsipAktifFormUI from "./components/BerkasArsipAktifFormUi";
import Loading from "./loading";
import { File, Folder, RefreshCw } from "lucide-react";
import { useArsipAktifForm } from "./hooks/useArsipAktifForm";
import { useBerkasArsipAktif } from "./hooks/useBerkasArsipAktif";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify"; 

type FormMode = "arsip" | "berkas";

function ArsipAktifContent() {
  const [formMode, setFormMode] = useState<FormMode>("arsip");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, isLoading: isAuthLoading, error: authError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); 

  useEffect(() => {
    const savedMode = localStorage.getItem('selectedFormMode') as FormMode;
    if (savedMode && (savedMode === 'arsip' || savedMode === 'berkas')) {
      setFormMode(savedMode);
    }
  }, []);

  useEffect(() => {
    const editId = searchParams.get('editId');
    const modeFromUrl = searchParams.get('formMode') as FormMode;

    if (editId) {
      if (modeFromUrl === 'arsip') {
        setFormMode('arsip');
      } else {
        setFormMode('berkas');
      }
    }
  }, [searchParams]);

  const arsipFormLogicHook = useArsipAktifForm(formMode === "arsip" && !!user, user);
  const berkasFormLogicHook = useBerkasArsipAktif(formMode === "berkas" && !!user, user);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast.warn("Sesi tidak ditemukan, harap login kembali.");
      router.push("/sign-in");
    } else if (user && user.role !== "Pegawai") {
      toast.error("Anda tidak memiliki izin untuk mengakses halaman ini.");
      router.push("/"); 
    } else if (user && (!user.id_bidang_fkey || !user.daftar_bidang?.nama_bidang)) {
      toast.error("Data bidang pengguna tidak lengkap. Harap hubungi administrator.");
    }
  }, [user, isAuthLoading, router]);


  if (isAuthLoading || isRefreshing) {
    return <Loading />;
  }

  const handleModeChange = (newMode: FormMode) => {
    if (newMode === formMode) return;

    setIsRefreshing(true);

    // Simpan mode baru
    localStorage.setItem('selectedFormMode', newMode);
    setFormMode(newMode);

    // Hapus query param 'editId' saat mode diganti manual agar tidak terjadi konflik
    router.push('/arsip/arsip-aktif');

    // Reset refreshing state setelah mode berubah
    setTimeout(() => setIsRefreshing(false), 100);
  };

  // isLoading sekarang hanya untuk ocrLoading atau state loading spesifik form lainnya
  // isAuthLoading sudah ditangani di atas.
  const formSpecificLoading =
    (formMode === "arsip" && arsipFormLogicHook?.ocrLoading);
    // Tambahkan loading state lain dari berkasFormLogicHook jika ada

  if (formSpecificLoading) {
    return <Loading />;
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error Autentikasi: {authError}
      </div>
    );
  }

  // Jika user tidak ada setelah loading auth selesai (seharusnya sudah di-redirect)
  // atau jika data user tidak lengkap untuk role ini.
  if (!user || user.role !== "Pegawai" || !user.id_bidang_fkey || !user.daftar_bidang?.nama_bidang) {
    // Pesan error atau loading sudah ditampilkan sebelumnya,
    // atau pengguna sudah di-redirect.
    return <Loading />; // Atau pesan error yang lebih spesifik
  }

  return (
    <div>
      {/* Mode Selection Buttons */}
      <div className="flex justify-center my-4 space-x-2">
        <button
          onClick={() => handleModeChange("berkas")}
          disabled={isRefreshing}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 disabled:opacity-50 ${formMode === "berkas"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
        >
          {isRefreshing && formMode !== "berkas" ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <Folder size={18} />
          )}
          Input Berkas (Folder)
        </button>

        <button
          onClick={() => handleModeChange("arsip")}
          disabled={isRefreshing}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 disabled:opacity-50 ${formMode === "arsip"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
        >
          {isRefreshing && formMode !== "arsip" ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <File size={18} />
          )}
          Input Arsip (Dokumen)
        </button>
      </div>

      {/* Form Components */}
      {formMode === "berkas" && berkasFormLogicHook && (
        <BerkasArsipAktifFormUI {...berkasFormLogicHook} />
      )}

      {formMode === "arsip" && arsipFormLogicHook && (
        <ArsipAktifFormUI {...arsipFormLogicHook} />
      )}
    </div>
  );
}

export default function FormArsipAktifPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ArsipAktifContent />
    </Suspense>
  );
}