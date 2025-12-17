// app/page.tsx
import ProWaitlistForm from "./components/ProWaitlistForm";
import HomeCtas from "./components/HomeCtas";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 space-y-16">
        {/* HERO */}
        <section className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Calculator + offer tracking for gold sellers
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Know your melt value.
              <br className="hidden sm:block" />
              Spot lowball offers instantly.
            </h1>

            <p className="mt-4 max-w-xl text-sm sm:text-base text-slate-300">
              MarketMint helps you estimate melt value in seconds, then log real
              quotes from jewelers, pawn shops, and private buyers so you can see
              who’s paying the strongest % of melt — before you sell.
            </p>

            {/* ✅ Client CTAs w/ GA events */}
            <HomeCtas />

            <p className="mt-3 text-[11px] text-slate-500">
              No credit card. No signup required to use the core calculator.
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-slate-400">
              <span className="rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1">
                ✅ Melt value estimate
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1">
                ✅ Offer inbox + % of melt
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1">
                ✅ Shareable summary text
              </span>
            </div>
          </div>

          {/* “App preview” card (static) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs shadow-lg">
            <p className="text-[11px] font-medium text-emerald-300">
              Preview · Valuation snapshot
            </p>

            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex gap-3 text-[11px] text-slate-300">
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Metal
                  </p>
                  <div className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1">
                    Gold · 14K
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Weight (g)
                  </p>
                  <div className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1">
                    45
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  Spot price (USD / troy oz)
                </p>
                <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2 py-1">
                  <span>2400</span>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-slate-900/80 p-3 border border-emerald-600/40">
                <p className="text-[11px] font-semibold text-emerald-300">
                  Estimated melt value
                </p>
                <p className="mt-1 text-xl font-semibold text-emerald-100">
                  $2,025.50
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Typical dealer range (≈85–90% of melt):{" "}
                  <span className="font-medium text-slate-200">
                    $1,721 – $1,822
                  </span>
                </p>
              </div>

              <div className="mt-3 flex gap-2">
                <div className="flex-1 rounded-full bg-slate-800 px-3 py-1.5 text-center text-[11px] font-medium text-slate-100">
                  Save to workspace
                </div>
                <div className="flex-1 rounded-full bg-emerald-600/90 px-3 py-1.5 text-center text-[11px] font-medium text-white">
                  Get offers
                </div>
              </div>
            </div>

            <p className="mt-2 text-[10px] text-slate-500">
              Static preview. Click “Start a free valuation” to run your own
              numbers.
            </p>
          </div>
        </section>

        {/* (everything else stays the same below) */}
        {/* HOW IT WORKS */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">
            How MarketMint works
          </h2>

          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Step 1
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-100">
                Estimate melt value
              </h3>
              <p className="mt-2 text-slate-300 text-[13px]">
                Enter karat, weight, and spot price to estimate melt value and a
                realistic buyer range (so you’re not negotiating blind).
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Step 2
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-100">
                Log real offers
              </h3>
              <p className="mt-2 text-slate-300 text-[13px]">
                Record quotes from jewelers, pawn shops, and private buyers.
                MarketMint shows % of melt, spread, and where each buyer type
                lands.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Step 3
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-100">
                Negotiate and sell with confidence
              </h3>
              <p className="mt-2 text-slate-300 text-[13px]">
                Share a clean summary message that anchors buyers to your melt
                value. Keep your history so you can spot patterns over time.
              </p>
            </div>
          </div>
        </section>

        {/* ... keep the rest of your file unchanged ... */}

        {/* FINAL CTA + WAITLIST */}
        <section className="rounded-2xl border border-emerald-700/60 bg-emerald-500/10 px-5 py-6 text-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-emerald-100">
                Ready to see what your gold is really worth?
              </h2>
              <p className="mt-1 text-[13px] text-emerald-100/80 max-w-xl">
                Run a valuation in under 30 seconds, then log offers as you shop
                around. You’ll never look at a quote the same way again.
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-4 md:mt-0 md:min-w-[260px]">
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/value"
                  className="inline-flex items-center rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Start free valuation
                </Link>
                <Link
                  href="/offers"
                  className="inline-flex items-center rounded-full border border-emerald-500/60 bg-slate-950 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-slate-900"
                >
                  View offers demo
                </Link>
              </div>

              <ProWaitlistForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
