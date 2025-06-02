"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react"; 
import { createClient } from "@/utils/supabase/client"; // <-- Ubah import

export default function SignIn() {
  const supabase = createClient(); // <-- Buat instance Supabase
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="card-neon w-full max-w-lg p-8 md:p-10 justify-center mx-auto">
      <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6 text-center">
        Sign In
      </h2>
      {error && (
        <p className="text-destructive mb-4 text-center text-sm">{error}</p>
      )}
      <form onSubmit={handleSignIn} className="space-y-4 md:space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
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
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground pr-10 transition-colors duration-300" // Tambahkan pr-10 untuk ruang ikon
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="w-full btn-neon" // Menggunakan kelas .btn-neon
          disabled={isLoading}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </button>
      </form>
      <p className="mt-6 md:mt-8 text-center text-sm text-muted-foreground"> {/* Adjusted margin top */}
        Belum punya akun?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-primary hover:text-[hsl(var(--neon-purple))] hover:underline transition-colors duration-300"
        >
          Daftar di sini
        </Link>
      </p>
    </div>
  );
}