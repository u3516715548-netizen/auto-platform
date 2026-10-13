import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Autobear",
  description: "Storefront multi-tenant pentru dealeri auto — inventar, lead-uri și subdomeniu propriu",
  // App Router also serves `app/icon.png`, `app/apple-icon.png`, and generated `/favicon.ico`.
  // Public mark is light-on-dark so the tab stays readable (source brand icon is black-on-transparent).
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
      { url: "/brand/autobear-icon-mark.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/favicon.png"],
    apple: [{ url: "/brand/autobear-icon-mark.png", sizes: "512x512", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
