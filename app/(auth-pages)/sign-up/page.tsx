"use client";

import { useState, useEffect, Suspense } from "react"; // Added Suspense
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { signUpAction } from "@/app/actions";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import Link from "next/link";

enum UserRole {
  PEGAWAI = "Pegawai",
  KEPALA_BIDANG = "Kepala_Bidang",
  SEKRETARIS = "Sekretaris",
  KEPALA_DINAS = "Kepala_Dinas"
}

enum Jabatan {
  ARSIPARIS_AHLI_PERTAMA = "Arsiparis Ahli Pertama",
  ARSIPARIS_AHLI_MUDA = "Arsiparis Ahli Muda",
  ARSIPARIS_AHLI_MADYA = "Arsiparis Ahli Madya",
  ARSIPARIS_AHLI_UTAMA = "Arsiparis Ahli Utama",
  KEPALA_BIDANG = "Kepala Bidang",
  SEKRETARIS = "Sekretaris",
  KEPALA_DINAS = "Kepala Dinas",
}

interface DaftarBidang {
  id_bidang: number;
  nama_bidang: string;
}

// Component to contain the main logic and UI, allowing useSearchParams
function SignUpForm() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nip, setNip] = useState("");
  const [pangkat, setPangkat] = useState("");
  const [idBidang, setIdBidang] = useState<number | "">("");
  const [daftarBidangList, setDaftarBidangList] = useState<DaftarBidang[]>([]);
  const [jabatan, setJabatan] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type");
  const urlMessage = searchParams.get("message");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (idBidang === "") {
      toast.error("Silakan pilih bidang.");
      return;
    }
    if (!jabatan) {
      toast.error("Silakan pilih jabatan.");
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("nama", nama);
    formData.append("nip", nip);
    formData.append("pangkat", pangkat);
    formData.append("idBidang", idBidang.toString());
    formData.append("jabatan", jabatan);

    const result = await signUpAction(formData) as { type: string; message?: string };
    if (result?.type === "error") {
      toast.error(result.message || "Gagal sign up");
      return;
    }
    toast.success("Sign up berhasil!");
    setTimeout(() => router.push("/sign-in"), 2000);
  };

  // Semua jabatan yang diizinkan
  const jabatanList = [
    Jabatan.ARSIPARIS_AHLI_PERTAMA,
    Jabatan.ARSIPARIS_AHLI_MUDA,
    Jabatan.ARSIPARIS_AHLI_MADYA,
    Jabatan.ARSIPARIS_AHLI_UTAMA,
    Jabatan.KEPALA_BIDANG,
    Jabatan.SEKRETARIS,
    Jabatan.KEPALA_DINAS,
  ];

  useEffect(() => {
    const fetchDaftarBidang = async () => {
      const { data, error } = await supabase
        .from("daftar_bidang")
        .select("id_bidang, nama_bidang")
        .order("nama_bidang", { ascending: true });

      if (error) {
        setError("Gagal memuat daftar bidang.");
      } else {
        setDaftarBidangList(data || []);
      }
    };
    fetchDaftarBidang();
  }, [supabase]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
      <div className="card-neon w-full max-w-3xl p-6 md:p-10">
        <form onSubmit={handleSignUp} className="space-y-6"> {/* Moved form tag to wrap everything */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Sign Up
          </h2>
          {/* Tampilkan pesan dari URL jika ada */}
          {urlType === "error" && urlMessage && (
            <div className="mb-4 text-center">
              <div className="inline-block bg-destructive/10 text-destructive px-4 py-2 rounded-md">{urlMessage}</div>
            </div>
          )}
          {urlType === "success" && urlMessage && (
            <div className="mb-4 text-center">
              <div className="inline-block bg-[hsl(var(--neon-green))]/10 text-[hsl(var(--neon-green))] px-4 py-2 rounded-md">{urlMessage}</div>
            </div>
          )}
          {error && (
            <div className="mb-4 text-center">
              <div className="inline-block bg-destructive/10 text-destructive px-4 py-2 rounded-md">{error}</div>
            </div>
          )}
          {success && (
            <div className="mb-4 text-center">
              <div className="inline-block bg-[hsl(var(--neon-green))]/10 text-[hsl(var(--neon-green))] px-4 py-2 rounded-md">{success}</div>
            </div>
          )}
          {/* Card Email & Password */}
          <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-6 shadow-sm border border-border/50"> {/* Adjusted inner card style */}
            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground transition-colors duration-300"
                required
              />
            </div>
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground pr-10 transition-colors duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>
          {/* NIP full width, di luar card */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              NIP
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground transition-colors duration-300"
              required
            />
          </div>
          {/* Form Data Lainnya */}
          <div className="flex flex-col md:flex-row gap-6"> {/* Changed form to div as it's now nested */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nama
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground transition-colors duration-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Pangkat/Gol
                </label>
                <input
                  type="text"
                  value={pangkat}
                  onChange={(e) => setPangkat(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground transition-colors duration-300"
                  required
                />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bidang
                </label>
                <select
                  value={idBidang}
                  onChange={(e) => setIdBidang(e.target.value ? parseInt(e.target.value) : "")}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground transition-colors duration-300"
                  required
                >
                  <option value="">Pilih Bidang</option>
                  {daftarBidangList.map((item) => (
                    <option key={item.id_bidang} value={item.id_bidang}>
                      {item.nama_bidang.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Jabatan
                </label>
                <select
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground transition-colors duration-300"
                  required
                >
                  <option value="">Pilih Jabatan</option>
                  {jabatanList.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full btn-neon" // onClick removed, type="submit" handles form submission
          >
            Sign Up
          </button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/sign-in"
              className="font-medium text-primary hover:text-[hsl(var(--neon-purple))] hover:underline transition-colors duration-300"
            >
              Masuk di sini
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

// Fallback component for Suspense
function SignUpLoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-screen w-full">
      <p className="text-lg text-foreground">Memuat halaman pendaftaran...</p>
    </div>
  );
}

// Default export page component wraps SignUpForm with Suspense
export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpLoadingFallback />}>
      <SignUpForm />
    </Suspense>
  );
}