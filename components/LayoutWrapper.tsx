"use client";

import { usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./Navbar";
import Footer from "./Footer";

// Daftar prefix path di mana Navbar dan Footer akan disembunyikan
const PATHS_WITHOUT_NAVBAR_FOOTER = ["/sign-in", "/sign-up"];



export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Cek apakah path saat ini dimulai dengan salah satu prefix yang ditentukan
    const shouldHideNavbarAndFooter = PATHS_WITHOUT_NAVBAR_FOOTER.some(prefix =>
        pathname.startsWith(prefix)
    );

    // Jadikan <main> sebagai flex container kolom secara default.
    // Ini memungkinkan anak-anaknya (konten halaman) untuk menggunakan flex-grow jika diperlukan.
    const mainElementClasses = ["flex-grow", "flex", "flex-col"];

    if (shouldHideNavbarAndFooter) {
        mainElementClasses.push("flex", "items-center", "justify-center");
    }

    return (
        <div className="flex flex-col min-h-screen">
            {!shouldHideNavbarAndFooter && <Navbar />}
            <ToastContainer />
            <main className={mainElementClasses.join(" ")}>
                {children}
            </main>
            {!shouldHideNavbarAndFooter && <Footer />}
        </div>
    );
}
