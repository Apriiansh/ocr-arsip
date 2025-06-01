"use client";

import { Button } from "@/components/ui/button"; // Tetap gunakan Button untuk styling
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;

  const toggleTheme = () => {
    // Jika tema saat ini 'light' atau 'system' (dianggap light), ganti ke 'dark'.
    // Jika 'dark', ganti ke 'light'.
    setTheme(theme === "light" || theme === "system" ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`
        relative inline-flex items-center h-7 w-14 cursor-pointer rounded-full 
        transition-colors duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${theme === "light" || theme === "system" ? "bg-yellow-400" : "bg-slate-700"}
      `}
    >
      <span className="sr-only">Toggle theme</span>
      {/* Knop Switch */}
      <span
        className={`
          absolute inline-flex items-center justify-center h-5 w-5 transform rounded-full 
          bg-card shadow-md transition-transform duration-300 ease-in-out
          ${theme === "light" || theme === "system" ? "translate-x-1" : "translate-x-8"}
        `}
      >
        {/* Ikon di dalam knop */}
        {(theme === "light" || theme === "system") ? (
          <Sun size={ICON_SIZE - 2} className="text-yellow-600" />
        ) : (
          <Moon size={ICON_SIZE - 2} className="text-slate-300" />
        )}
      </span>
    </button>
  );
};

export { ThemeSwitcher };
