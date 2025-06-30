"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, BookOpen } from "lucide-react";
import { signInAction } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSignIn = async (formData: FormData) => {
    setError("");
    setIsLoading(true);

    try {
      const result = await signInAction(formData);

      if (result.success) {
        if (result.redirectTo) {
          router.push(result.redirectTo);
        } else {
          router.push("/");
        }
      } else {
        setError(result.error || "Login gagal");
      }
    } catch (err: unknown) {
      let errorMessage = "Terjadi kesalahan saat login";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error("Sign in error:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    

    <div className="card-neon relative w-full max-w-lg px-10 pt-2 pb-25 md:px-10 md:pt-10 md:pb-16 justify-center mx-auto">
      
      <div className="text-center mb-8">
        <img src="/logosumsel.png" className="w-20 h-24 mx-auto" alt="Logo Sumsel" />
        <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
          CrChive
        </h1>
        <p className="text-secondary-foreground mt-2">
          Pengelolaan Arsip Dinamis Dinas Kearsipan Provinsi Sumatera Selatan
        </p>

        <div className="p-2">

        <div>
          <h2 className="text-bold text-secondary-foreground text-4xl font-bold">Sign In</h2>
        </div>
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="text-sm text-center">{error}</p>
        </div>
      )}

      <form action={handleSignIn} className="space-y-4 md:space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            name="email"
            type="email"
            placeholder="emailname@email.com"
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground transition-colors duration-300"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Password
          </label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground pr-10 transition-colors duration-300"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="w-full btn-neon"
          disabled={isLoading}
        >
          {isLoading ? "Signing In..." : "Masuk"}
        </button>
      </form>

      {/* <p className="mt-6 md:mt-8 text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-primary hover:text-[hsl(var(--neon-purple))] hover:underline transition-colors duration-300"
        >
          Daftar di sini
        </Link>
      </p> */}

      <Link
        href="/user-manual"
        className="absolute bottom-4 left-8 md:left-10 text-muted-foreground bg-slate-300 rounded-full p-2 hover:text-primary transition-colors duration-300"
        title="Panduan Pengguna"
      >
        <BookOpen size={20} />
      </Link>
    </div>
  );
}