// app/prices/page.tsx
import Link from "next/link";
import PricesHub from "./PricesHub";

export const metadata = {
  title: "Live Gold, Silver & Platinum Prices by Purity | MarketMint",
  description:
    "Live spot prices and estimated melt value prices by purity for gold, silver, and platinum. Updated on a cached schedule to reduce upstream calls.",
};
function PricesFaqSchema() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is this the live gold price?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Prices are sourced from live spot markets and cached briefly for performance while remaining accurate.",
        },
      },
      {
        "@type": "Question",
        name: "What is the difference between spot price and melt value?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Spot price is the market price of pure metal. Melt value adjusts that price based on purity and weight.",
        },
      },
      {
        "@type": "Question",
        name: "Why are buyer offers lower than melt value?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Buyer offers may be lower due to testing, refining fees, overhead, risk, and dealer margins.",
        },
      },
      {
        "@type": "Question",
        name: "How do I calculate gold melt value exactly?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use the MarketMint gold calculator to enter weight and karat for a precise estimate using current spot prices.",
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
            Live Gold, Silver &amp; Platinum Prices by Purity
          </h1>

          <p className="max-w-3xl text-sm text-slate-300 leading-relaxed">
              Reference prices for common metals and purities, shown per gram and per troy ounce using live spot data.
          </p>

          <p className="max-w-3xl text-sm text-slate-300 leading-relaxed">
  For item-level melt value, use the{" "}
  <Link href="/gold" className="text-emerald-300 hover:underline">
    gold calculator
  </Link>
  .
</p>
          <div className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-100">
              Precious Metal Pricing FAQs
            </h2>

            <div className="space-y-2 max-w-3xl text-sm text-slate-300 leading-relaxed">
              <p>
                <strong>Is this the live gold price?</strong><br />
                Prices are sourced from live spot markets and cached briefly to reduce upstream calls while remaining accurate.
              </p>

              <p>
                <strong>What is the difference between spot price and melt value?</strong><br />
                Spot price is the market price of pure metal. Melt value adjusts that price based on purity and weight.
              </p>

              <p>
                <strong>Why are buyer offers lower than melt value?</strong><br />
                Buyers factor in refining fees, testing, overhead, risk, and resale margin when making offers.
              </p>

              <p>
                <strong>How do I calculate gold melt value exactly?</strong><br />
                Use the{" "}
                <Link href="/gold" className="text-emerald-300 hover:underline">
                  MarketMint gold calculator
                </Link>{" "}
                to enter weight and karat for a precise estimate.
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
