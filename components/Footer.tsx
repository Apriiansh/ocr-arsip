"use client";

import { ThemeSwitcher } from "@/components/theme-switcher";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground p-4 mt-auto">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between">
        <p className="text-sm text-center mb-2 sm:mb-0 sm:flex-1 sm:text-center">&copy; 2025 CrChive. All rights reserved.</p>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}
