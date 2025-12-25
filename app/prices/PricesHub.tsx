"use client";

import { useMemo, useState } from "react";
import GoldCalculator from "../components/GoldCalculator";

type MetalKey = "gold" | "silver" | "platinum";

const GRAMS_PER_TROY_OUNCE = 31.1035;

type PurityRow = {
  metal: MetalKey;
  label: string; // e.g., "14K", ".925", ".950"
  purity: number; // fraction 0-1
  note?: string;
};

const PURITIES: PurityRow[] = [
  { metal: "gold", label: "10K", purity: 10 / 24 },
  { metal: "gold", label: "14K", purity: 14 / 24 },
  { metal: "gold", label: "18K", purity: 18 / 24 },
  { metal: "gold", label: "22K", purity: 22 / 24 },
  { metal: "gold", label: "24K (pure)", purity: 1 },

  { metal: "silver", label: ".925 (sterling)", purity: 0.925 },
  { metal: "silver", label: ".999 (fine)", purity: 0.999 },

  { metal: "platinum", label: ".950", purity: 0.95 },
  { metal: "platinum", label: ".999 (fine)", purity: 0.999 },
];

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function metalLabel(m: MetalKey) {
  if (m === "gold") return "Gold";
  if (m === "silver") return "Silver";
  return "Platinum";
}

/**
 * Computes estimated price per gram for a given purity.
 * spotPrice is assumed USD per troy ounce of the pure metal.
 */
function pricePerGram(spotPrice: number, purity: number) {
  if (!spotPrice || spotPrice <= 0) return 0;
  return (spotPrice / GRAMS_PER_TROY_OUNCE) * purity;
}

export default function PricesHub() {
  // Manual spot inputs for now (we’ll swap these to live API later)
  const [spotGold, setSpotGold] = useState<string>("2400");
  const [spotSilver, setSpotSilver] = useState<string>("30");
  const [spotPlatinum, setSpotPlatinum] = useState<string>("950");

  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  const spotMap = useMemo(() => {
    const gold = Number(spotGold);
    const silver = Number(spotSilver);
    const platinum = Number(spotPlatinum);

    return {
      gold: Number.isFinite(gold) ? gold : 0,
      silver: Number.isFinite(silver) ? silver : 0,
      platinum: Number.isFinite(platinum) ? platinum : 0,
    } as Record<MetalKey, number>;
  }, [spotGold, spotSilver, spotPlatinum]);

  const rows = useMemo(() => {
    return PURITIES.map((p) => {
      const spot = spotMap[p.metal];
      const perGram = pricePerGram(spot, p.purity);
      const perOunceEquivalent = perGram * GRAMS_PER_TROY_OUNCE; // same purity applied
      return {
        ...p,
        spot,
        perGram,
        perOunceEquivalent,
      };
    });
  }, [spotMap]);

  function refreshTimestamp() {
    setLastUpdated(new Date());
  }

  return (
    <div className="space-y-10">
      {/* Spot inputs */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Spot Prices (USD / troy oz)</h2>
            <p className="text-xs text-slate-400">
              For now these are manual inputs. Next step: live pricing + caching.
            </p>
          </div>

          <div className="text-xs text-slate-400">
            Last updated:{" "}
            <span className="text-slate-200">
              {lastUpdated.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">
              Gold spot
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={spotGold}
              onChange={(e) => setSpotGold(e.target.value)}
              onBlur={refreshTimestamp}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">
              Silver spot
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={spotSilver}
              onChange={(e) => setSpotSilver(e.target.value)}
              onBlur={refreshTimestamp}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">
              Platinum spot
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={spotPlatinum}
              onChange={(e) => setSpotPlatinum(e.target.value)}
              onBlur={refreshTimestamp}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={refreshTimestamp}
              className="w-full rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Refresh timestamp
            </button>
          </div>
        </div>
      </section>

      {/* Prices table */}
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Prices by Purity</h2>
            <p className="text-xs text-slate-400">
              Estimates based on spot × purity. Jewelry offers can be lower.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-300">
                <th className="py-2 pr-4">Metal</th>
                <th className="py-2 pr-4">Purity</th>
                <th className="py-2 pr-4">Price / gram</th>
                <th className="py-2 pr-4">Price / oz</th>
                <th className="py-2 pr-4">Notes</th>
              </tr>
            </thead>
            <tbody className="text-slate-100">
              {rows.map((r) => (
                <tr key={`${r.metal}-${r.label}`} className="border-t border-slate-800/60">
                  <td className="py-3 pr-4 font-medium">{metalLabel(r.metal)}</td>
                  <td className="py-3 pr-4">{r.label}</td>
                  <td className="py-3 pr-4">
                    {r.spot > 0 ? formatMoney(r.perGram) : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {r.spot > 0 ? formatMoney(r.perOunceEquivalent) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-300">
                    {r.metal === "gold" && r.label.includes("K") ? "Common jewelry karat" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-[12px] text-slate-300">
          Tip: Use the calculator below to estimate a specific item’s melt value.
        </div>
      </section>

      {/* Calculator embed */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Estimate Your Item</h2>
          <p className="text-xs text-slate-400">
            Enter metal, purity, weight, and spot price to estimate melt value.
          </p>
        </div>

        <div className="mt-4">
          <GoldCalculator showHeading={false} showSaveControls={false} lockMode="none" />
        </div>
      </section>

      {/* Trust / SEO text block */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <h2 className="text-lg font-semibold">How to Read These Prices</h2>

        <div className="mt-3 space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>
            Spot price is typically quoted per <span className="text-slate-100">troy ounce</span>{" "}
            of pure metal. Jewelry and coins are rarely pure, so we adjust by purity
            (for example, 14K gold is 14/24 = 58.3% pure).
          </p>
          <p>
            Melt value is an estimate of raw metal content — it does not include brand
            premium, craftsmanship, gemstones, or buyer costs. Real offers can be lower
            because buyers need margin, verification, and refining.
          </p>
        </div>
      </section>
    </div>
  );
}
