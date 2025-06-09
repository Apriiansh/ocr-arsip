// app/layout.tsx 
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import LayoutWrapper from "@/components/LayoutWrapper";

const defaultUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "CrChive - Aplikasi Pengelolaan Arsip Dinamis",
  description: "Aplikasi pengelolaan arsip dinamis dengan teknologi OCR.",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="antialiased bg-background flex flex-col min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LayoutWrapper>            
            {/* The LayoutWrapper's <main> tag will now handle centering for auth pages.
                For other pages, <main> is just flex-grow, and children (the page) renders directly. */}
              {children}
          </LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}