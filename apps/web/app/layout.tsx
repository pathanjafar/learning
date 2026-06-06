import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Providers from "@/components/Providers";
import AiBot from "@/components/AiBot";

export const metadata: Metadata = {
  title: "Reborn - Learn to Code & DSA",
  description: "Structured lessons, instructor-reviewed coding practice, and interview prep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="border-b border-slate-800 px-6 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-white">Reborn</Link>
            <nav className="flex gap-4 text-sm text-slate-400">
              <Link href="/">Tracks</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/login">Sign in</Link>
            </nav>
          </header>
          <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
          <AiBot />
        </Providers>
      </body>
    </html>
  );
}

