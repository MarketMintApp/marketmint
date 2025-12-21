// app/page.tsx
import Link from "next/link";
import ProWaitlistForm from "./components/ProWaitlistForm";
import HomeCtas from "./components/HomeCtas";

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

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              MarketMint helps you estimate melt value in seconds, then log real quotes from
              jewelers, pawn shops, and private buyers so you can see who&apos;s paying the
              strongest % of melt — before you sell.
            </p>

            <div className="mt-5 space-y-2">
              <HomeCtas placement="home_final" />
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white"
              >
                Create an account
              </Link>
              <p className="text-xs text-slate-500">
                No credit card. No signup required to use the core calculator.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/40 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Melt value estimate
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/40 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Offer inbox + % of melt
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/40 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Shareable summary text
              </span>
            </div>
          </div>

          {/* Right column (keep whatever preview you already had; this is a safe placeholder) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <p className="text-sm text-slate-300">
              Preview: Valuation snapshot
            </p>
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-400">Static preview</p>
            </div>
          </div>
        </section>

        {/* WAITLIST (server-safe) */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
          <ProWaitlistForm />
        </section>
      </div>
    </main>
  );
}
