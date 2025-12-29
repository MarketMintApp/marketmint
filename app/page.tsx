// app/page.tsx
import Link from "next/link";
import ProWaitlistForm from "./components/ProWaitlistForm";
import HomeCtas from "./components/HomeCtas";
type MarketSnapshot = {
  gold: number | null;
  silver: number | null;
  sp500: number | null;
  bitcoin: number | null;
  asOf?: string | null;
};

function OutcomeCard({
  title,
  description,
  href,
  cta,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-800 bg-slate-900/30 p-5 transition hover:border-emerald-500/30 hover:bg-slate-900/45"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-white">
          {title}
        </h3>
        {badge ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>

      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
        {cta}
        <span className="transition group-hover:translate-x-0.5">→</span>
      </div>
    </Link>
  );
}
async function getMarketSnapshot(): Promise<MarketSnapshot> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/market-snapshot`,
      { cache: "no-store" }
    );

    if (!res.ok) throw new Error("snapshot fetch failed");
    return await res.json();
  } catch {
    return {
      gold: null,
      silver: null,
      sp500: null,
      bitcoin: null,
      asOf: null,
    };
  }
}

export default async function HomePage() {
  const snapshot = await getMarketSnapshot();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 space-y-4">
        {/* HERO */}
        <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Melt value + pricing + offer tracking
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Know what your jewelry is worth.
              <br className="hidden sm:block" />
              Avoid lowball offers fast.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              MarketMint provides a reference melt-value estimate based on live spot prices. Use it to sanity-check offers and decide where to sell.
            </p>
{/* MARKET SNAPSHOT */}
<section className="rounded-2xl border border-white/10 bg-white/5 p-4">
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">
        Market snapshot
      </p>
      <p className="mt-1 text-sm text-white/70">
        Quick reference prices. For full detail, use the Prices hub.
      </p>
    </div>

    <a
      href="/prices"
      className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
    >
      View full prices →
    </a>
  </div>

  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <p className="text-xs text-white/60">Gold (spot)</p>
      <p className="mt-1 text-lg font-semibold text-white">
  {snapshot.gold != null ? `$${snapshot.gold.toFixed(2)}` : ""}
</p>
      <p className="mt-1 text-xs text-white/50">Live prices in Prices hub</p>
    </div>

    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <p className="text-xs text-white/60">Silver (spot)</p>
     <p className="mt-1 text-lg font-semibold text-white">
  {snapshot.silver != null ? `$${snapshot.silver.toFixed(2)}` : ""}
</p>
      <p className="mt-1 text-xs text-white/50">Live prices in Prices hub</p>
    </div>

    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
  <p className="text-xs text-white/60">S&amp;P 500</p>
  <p className="mt-1 text-lg font-semibold text-white">
    {snapshot.sp500 != null
      ? `$${Math.round(snapshot.sp500).toLocaleString("en-US")}`
      : "—"}
  </p>
  <p className="mt-1 text-xs text-white/50">Live prices in Prices hub</p>
</div>


    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
  <p className="text-xs text-white/60">Bitcoin</p>
  <p className="mt-1 text-lg font-semibold text-white">
    {snapshot.bitcoin != null
      ? `$${Math.round(snapshot.bitcoin).toLocaleString("en-US")}`
      : "—"}
  </p>
  <p className="mt-1 text-xs text-white/50">Live prices in Prices hub</p>
</div>
  </div>
</section>

            {/* Primary CTA row (keeps your existing CTAs) */}
            <div className="mt-5 space-y-2">
              <HomeCtas placement="home_final" />
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/gold"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Quick gold calculator
                </Link>

                <Link
                  href="/prices"
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-500/30"
                >
                  Live prices by purity
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white"
                >
                  Create account
                </Link>
              </div>

              <p className="text-xs text-slate-500">
                No credit card. You can use the calculator without signing up.
              </p>
            </div>

            {/* Benefit chips */}
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/40 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Melt value estimate
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/40 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Purity price table
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/40 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Offer tracking
              </span>
            </div>
          </div>

          {/* Outcome router (this is the “mobile nav fix without nav work”) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              Choose your goal
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              What are you trying to do?
            </h2>

            <div className="mt-4 grid gap-3">
              <OutcomeCard
                title="Get a fast estimate (most common)"
                description="Enter karat + grams and get an estimated melt value in seconds. Great if you’re just curious."
                href="/gold"
                cta="Open the calculator"
                badge="Fast"
              />
              <OutcomeCard
                title="See live prices by purity"
                description="Compare common purities (10K/14K/18K/24K, sterling, platinum) with prices per gram and per ounce."
                href="/prices"
                cta="View the prices hub"
                badge="Popular"
              />
              <OutcomeCard
                title="I’m selling multiple items"
                description="Track items, store notes, and log offers so you can compare buyers and avoid getting underpaid."
                href="/login"
                cta="Go to the workspace"
                badge="Power users"
              />
             
            </div>
          </div>
        </section>
 <OutcomeCard
                title="See how offer tracking works"
                description="Preview the offers flow without committing. Good for small resellers."
                href="/offers"
                cta="Explore the offers demo"
              />
        {/* SIMPLE EXPLAINER */}
        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Step 1
            </p>
            <h3 className="mt-2 text-base font-semibold">Find purity + weight</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Look for markings like 10K, 14K, 18K, 925, or “PLAT.” We use those to
              estimate how much pure metal is in your item.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Step 2
            </p>
            <h3 className="mt-2 text-base font-semibold">See melt value</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Melt value is the raw metal value — it does not include brand value,
              gemstones, or craftsmanship. Buyer offers can be lower due to margin and refining.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Step 3
            </p>
            <h3 className="mt-2 text-base font-semibold">Compare before you sell</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Use the prices hub for reference, then track real offers so you
              can quickly spot lowball quotes.
            </p>
          </div>
        </section>

        {/* WAITLIST / PRO (keep, but make it feel optional) */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                Optional
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Want the “seller workflow” later?
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Join the Pro waitlist if you want multi-item tracking, exports, and more.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Calculator stays free.
            </div>
          </div>

          <div className="mt-5">
            <ProWaitlistForm />
          </div>
        </section>

        {/* Footer links (quick trust) */}
        <section className="text-xs text-slate-500">
          <p>
            Estimates are informational and may vary from real buyer offers due to fees,
            verification, refining, and market conditions.
          </p>
        </section>
      </div>
    </main>
  );
}
  