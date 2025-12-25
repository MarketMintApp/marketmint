import type { Metadata } from "next";
import PricesHub from "./PricesHub";

export const metadata: Metadata = {
  title: "Live Precious Metal Prices by Purity",
  description:
    "Compare gold, silver, and platinum prices by purity (10K, 14K, 18K, 24K, .925, .999, .950). Estimate melt value quickly and understand how purity affects price.",
  alternates: { canonical: "/prices" },
};

export default function PricesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            MarketMint Prices Hub
          </p>
          <h1 className="text-3xl font-semibold">
            Live Precious Metal Prices by Purity
          </h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Compare estimated melt prices across common purities (gold karat, silver
            fineness, platinum fineness). These are informational estimates — actual
            buyer offers can be lower due to fees, verification, and margin.
          </p>
        </header>

        <PricesHub />
      </div>
    </main>
  );
}
