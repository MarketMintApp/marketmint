// app/prices/page.tsx
import Link from "next/link";
import PricesHub from "./PricesHub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gold Price Today (Per Gram & Karat) + Silver & Platinum Spot | MarketMint",
  description:
    "Gold price today with price per gram and by karat (10K, 14K, 18K, 22K, 24K), plus silver and platinum spot prices. See last-updated timing and calculate item melt value with the MarketMint gold calculator.",
};

function PricesFaqSchema() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is this the gold price today?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes — MarketMint shows live spot prices in USD per troy ounce of pure metal, along with last-updated timing and the data source. Prices may be briefly cached for reliability and performance.",
        },
      },
      {
        "@type": "Question",
        name: "What is gold price per gram?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Gold price per gram is derived from the spot price (USD per troy ounce) converted to grams. For jewelry, the per-gram estimate is adjusted by karat purity (e.g., 14K = 14/24).",
        },
      },
      {
        "@type": "Question",
        name: "What does gold price by karat mean?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Gold price by karat estimates the value of the gold content based on purity. Common jewelry purities include 10K, 14K, and 18K. This does not include gemstones, brand value, or craftsmanship.",
        },
      },
      {
        "@type": "Question",
        name: "Why is melt value different from an offer I get from a buyer?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Melt value reflects raw metal content only. Buyer offers are often lower due to verification/testing, refining costs, risk, overhead, and dealer margin.",
        },
      },
      {
        "@type": "Question",
        name: "How do I calculate my item’s gold melt value?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Use the MarketMint gold calculator to enter your item’s metal, karat/purity, and weight. It uses current spot prices to estimate melt value for your specific item.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function PricesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <PricesFaqSchema />

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 space-y-10">
        {/* HERO */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            MARKETMINT PRICES
          </p>

          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Gold Price Today (Per Gram &amp; Karat) + Silver &amp; Platinum Spot
          </h1>

          <p className="max-w-3xl text-sm text-slate-300 leading-relaxed">
            Live spot prices and practical reference estimates — including{" "}
            <span className="text-slate-100">gold price per gram</span> and{" "}
            <span className="text-slate-100">gold price by karat</span> (10K, 14K, 18K, 22K, 24K),
            plus <span className="text-slate-100">silver spot price</span> and{" "}
            <span className="text-slate-100">platinum spot price</span>. Each section shows the
            source and last-updated timing for clarity.
          </p>

          <p className="max-w-3xl text-sm text-slate-300 leading-relaxed">
            Want an item-specific number (your chain, ring, bar, coins)? Use the{" "}
            <Link href="/gold" className="text-emerald-300 hover:underline">
              gold calculator
            </Link>{" "}
            to estimate melt value based on weight and purity.
          </p>

          <div className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-100">
              Quick FAQs (Spot, Per Gram, Karat Pricing)
            </h2>

            <div className="space-y-2 max-w-3xl text-sm text-slate-300 leading-relaxed">
              <p>
                <strong>Is this the gold price today?</strong>
                <br />
                Yes — we show live spot prices in USD per troy ounce of pure metal, along with the
                data source and last updated time. Prices may be briefly cached for reliability.
              </p>

              <p>
                <strong>What’s the difference between spot price and per-gram/karat pricing?</strong>
                <br />
                Spot is quoted per troy ounce of pure metal. Per-gram pricing converts ounces to grams,
                and karat pricing adjusts for purity (example: 14K = 14/24).
              </p>

              <p>
                <strong>Why can a buyer offer be lower than melt value?</strong>
                <br />
                Melt value is raw metal content only. Offers typically factor in testing, refining,
                overhead, risk, and dealer margin.
              </p>

              <p>
                <strong>How do I estimate my item’s gold melt value?</strong>
                <br />
                Use the{" "}
                <Link href="/gold" className="text-emerald-300 hover:underline">
                  MarketMint gold calculator
                </Link>{" "}
                to enter weight and karat for an item-level estimate using current spot prices.
              </p>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <PricesHub />
      </div>
    </main>
  );
}
