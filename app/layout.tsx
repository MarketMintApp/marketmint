// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import "./globals.css";
import AppHeader from "./components/AppHeader";
import AnalyticsProvider from "./components/AnalyticsProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// NOTE: Set NEXT_PUBLIC_SITE_URL in env for production
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MarketMint — Gold melt value calculator + offer tracking",
    template: "%s — MarketMint",
  },
  description:
    "Know your gold’s real melt value and track offers from jewelers, pawn shops, and private buyers. Spot lowball offers instantly before you sell.",
  applicationName: "MarketMint",
  authors: [{ name: "MarketMint" }],
  creator: "MarketMint",
  publisher: "MarketMint",
  keywords: [
    "gold melt value",
    "gold calculator",
    "scrap gold price",
    "14k gold value",
    "18k gold value",
    "cash for gold",
    "pawn shop offer",
    "jewelry valuation",
    "gold selling tool",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MarketMint",
    title: "MarketMint — Know your melt value. Spot lowball offers instantly.",
    description:
      "Estimate gold melt value in seconds, then track real buyer offers so you know who’s paying fair value.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MarketMint — Gold melt value + offer tracking",
    description: "Instant melt values and offer tracking so you don’t sell blind.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617", // slate-950
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        {/* GA4 */}
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>

        {/* Global Header */}
        <AppHeader />

        {/* Page Content */}
        <main className="min-h-screen">{children}</main>

        {/* Global Footer (required for AdSense + legal) */}
        <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-400">
          <a href="/privacy" className="mx-3 hover:underline">
            Privacy
          </a>
          <a href="/terms" className="mx-3 hover:underline">
            Terms
          </a>
          <a href="/disclaimer" className="mx-3 hover:underline">
            Disclaimer
          </a>
        </footer>
      </body>
    </html>
  );
}
