"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import GoldCalculator from "../components/GoldCalculator";
import { supabase } from "../lib/supabaseClient";
import { AnimatedDisclosure } from "../components/AnimatedDisclosure";
function GoldFaqSchema() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is melt value the same as what I’ll get paid?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "No. Melt value is a baseline. Buyer offers are often lower due to refining fees, verification, overhead, and margin.",
        },
      },
      {
        "@type": "Question",
        name: "How do I calculate gold price per gram?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Spot prices are usually quoted per troy ounce. Melt value converts to grams and adjusts for karat purity. MarketMint also shows live prices by purity.",
        },
      },
      {
        "@type": "Question",
        name: "What’s the difference between 10k, 14k, and 18k gold?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Karat measures purity. Higher karat means more gold content — and higher melt value for the same weight.",
        },
      },
      {
        "@type": "Question",
        name: "Why is my offer lower than the calculator result?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Offers include costs and risk. The fastest way to improve payout is to get multiple quotes and compare them.",
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

export default function GoldCalculatorPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------
  // AUTH CHECK
  // -------------------------------
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      }
      setAuthChecked(true);
    }
    loadUser();
  }, []);

  async function handleSave(valuation: {
    metal_type: string;
    karat: number;
    weight_gram: number;
    spot_price: number;
    melt_value: number;
    notes?: string;
  }) {
    setError(null);
    setSaveMessage(null);

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase.from("valuations").insert([
      {
        user_id: user.id,
        metal_type: valuation.metal_type,
        karat: String(valuation.karat),
        weight_gram: valuation.weight_gram,
        spot_price: valuation.spot_price,
        melt_value: valuation.melt_value,
        notes: valuation.notes ?? null,
      },
    ]);

    if (error) {
      console.error(error);
      setError("Could not save this valuation. Please try again.");
      return;
    }

    setSaveMessage("Valuation saved to your workspace.");
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
         <GoldFaqSchema />
        <p className="text-sm text-slate-400">Loading calculator…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-10">
        {/* HEADER */}
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            MARKETMINT GOLD CALCULATOR
          </p>

          <h1 className="text-4xl font-semibold tracking-tight">
            Gold Melt Value Calculator (by Karat &amp; Weight)
          </h1>

          <p className="text-base text-slate-300 max-w-3xl leading-relaxed">
            Enter gold karat and weight to estimate melt value using today’s spot price. This is a
            baseline number you can use to compare buyer quotes and avoid getting lowballed.
          </p>

          <div className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Want the market reference first? Check{" "}
            <Link href="/prices" className="text-emerald-300 hover:underline">
              live precious metal prices by purity
            </Link>{" "}
            (gold, silver, platinum).
          </div>

          <p className="text-xs text-slate-400">
            Working on multiple pieces or tracking offers?{" "}
            <Link
              href="/value"
              className="font-medium text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
            >
              Open the Valuation Workspace
            </Link>{" "}
            to save items and compare buyers.
          </p>
        </header>

        {/* CALCULATOR CARD */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
          <GoldCalculator
            showSaveControls
            onSave={handleSave}
            lockMode="pdf"
            freeValuations={1}
          />

          {saveMessage && (
            <p className="text-xs text-emerald-300">{saveMessage}</p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </section>

        {/* OFFERS CTA (only for logged-in users) */}
        {user && (
          <section className="rounded-2xl border border-emerald-700/30 bg-emerald-600/10 p-5">
            <h2 className="text-lg font-semibold text-emerald-300">
              Turn this estimate into real offers
            </h2>

            <p className="mt-1 text-slate-300 text-sm max-w-xl leading-relaxed">
              Once you have a melt value baseline, log quotes from jewelers, pawn shops, and private
              buyers in Offers Hub and compare them side by side.
            </p>

            <Link
              href="/offers/hub"
              className="inline-flex items-center mt-3 rounded-full bg-emerald-600/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Open Offers Hub
            </Link>
          </section>
        )}

        {/* EDUCATION BLOCK */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Understanding melt value</h2>

          <p className="text-slate-300 max-w-3xl text-base leading-relaxed">
            Melt value is your reference point — not a guaranteed payout. Use it to sanity-check
            offers, spot lowball quotes, and decide where it’s worth getting a second opinion.
          </p>

          <AnimatedDisclosure
            title="Cash-for-gold & pawn shops"
            subtitle="Fastest payout, usually the lowest offer"
          >
            <ul className="space-y-1.5 text-[13px]">
              <li>• Often pay the lowest percentage of melt value.</li>
              <li>
                • Useful for emergency cash, but rarely the best long-term price.
              </li>
            </ul>
          </AnimatedDisclosure>

          <AnimatedDisclosure
            title="Local jewelers"
            subtitle="Better than pawn, still conservative"
          >
            <ul className="space-y-1.5 text-[13px]">
              <li>• Commonly 10–30% higher than pawn shop offers.</li>
              <li>
                • Good balance of speed, trust, and payout — especially if you shop 2–3 stores.
              </li>
            </ul>
          </AnimatedDisclosure>

          <AnimatedDisclosure
            title="Private buyers & marketplaces"
            subtitle="Highest potential payout"
          >
            <ul className="space-y-1.5 text-[13px]">
              <li>• Serious buyers can get closer to melt for desirable items.</li>
              <li>
                • Build in safety: meet in public, and verify weight and karat at a jeweler when possible.
              </li>
            </ul>
          </AnimatedDisclosure>

          {/* FAQ (SEO / long-tail) */}
          <div className="pt-4 border-t border-slate-800">
            <h2 className="text-xl font-semibold">Gold melt value FAQ</h2>

            <div className="mt-3 space-y-3 text-sm text-slate-300 max-w-3xl leading-relaxed">
              <p>
                <span className="font-semibold text-slate-100">
                  Is melt value the same as what I’ll get paid?
                </span>{" "}
                No. Melt value is a baseline. Buyer offers are often lower due to refining fees,
                verification, overhead, and margin.
              </p>

              <p>
                <span className="font-semibold text-slate-100">
                  How do I calculate gold price per gram?
                </span>{" "}
                Spot prices are usually quoted per troy ounce. Melt value converts to grams and
                adjusts for karat purity. For quick comparisons, see{" "}
                <Link href="/prices" className="text-emerald-300 hover:underline">
                  live prices by purity
                </Link>
                .
              </p>

              <p>
                <span className="font-semibold text-slate-100">
                  What’s the difference between 10k, 14k, and 18k gold?
                </span>{" "}
                Karat measures purity. Higher karat means more gold content — and higher melt value
                for the same weight.
              </p>

              <p>
                <span className="font-semibold text-slate-100">
                  Why is my offer lower than the calculator result?
                </span>{" "}
                Offers include costs and risk. The fastest way to improve payout is to get multiple
                quotes and compare them in Offers Hub.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
