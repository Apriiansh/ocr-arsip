"use client";

import { ThemeSwitcher } from "@/components/theme-switcher";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground p-4 mt-auto">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
        <p className="text-sm">&copy; 2025 CrChive. All rights reserved.</p>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}
