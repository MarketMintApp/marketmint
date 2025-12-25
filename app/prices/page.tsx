// app/prices/page.tsx
import PricesHub from "./PricesHub";

export const metadata = {
  title: "Live Precious Metal Prices by Purity | MarketMint",
  description:
    "Live spot prices and estimated melt prices by purity for gold, silver, and platinum. Updated on a cached schedule to reduce upstream calls.",
};

export default function PricesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 space-y-10">
        {/* HERO */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            MARKETMINT PRICES HUB
          </p>

          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Live Precious Metal Prices by Purity
          </h1>

          <p className="max-w-3xl text-sm text-slate-300 leading-relaxed">
            Compare estimated melt prices across common purities (gold karat, silver fineness, platinum fineness).
            These are informational estimates — real buyer offers can be lower due to fees, verification, and margin.
          </p>
        </section>

        {/* CONTENT */}
        <PricesHub />
      </div>
    </main>
  );
}
