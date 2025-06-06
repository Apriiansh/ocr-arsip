// Alternatif: Gunakan server action dengan benar
"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react"; 
import { signInAction } from "@/app/actions"; // Import server action

export default function SignIn() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (formData: FormData) => {
    setError("");
    setIsLoading(true);
    
    try {
      const result = await signInAction(formData);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
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
      
      {/* Gunakan server action */}
      <form action={handleSignIn} className="space-y-4 md:space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
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
          {isLoading ? "Signing In..." : "Sign In"}
        </button>
      </form>
      
      <p className="mt-6 md:mt-8 text-center text-sm text-muted-foreground">
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