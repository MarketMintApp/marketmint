"use client";

import { useEffect, useMemo, useState } from "react";
import GoldCalculator from "../components/GoldCalculator";
import AdSlot from "../components/AdSlot";

type MetalKey = "gold" | "silver" | "platinum";
const GRAMS_PER_TROY_OUNCE = 31.1035;

type SpotResponse = {
  base: "USD";
  unit: "troy_oz";
  gold: number;
  silver: number;
  platinum: number;
  updatedAt: string; // ISO timestamp
  source: string; // e.g. "stooq"
};

type PurityRow = {
  metal: MetalKey;
  label: string; // e.g., "14K", ".925", ".950"
  purity: number; // fraction 0-1
  note?: string;
};

const PURITIES: PurityRow[] = [
  { metal: "gold", label: "10K", purity: 10 / 24, note: "Common jewelry karat" },
  { metal: "gold", label: "14K", purity: 14 / 24, note: "Most common US jewelry karat" },
  { metal: "gold", label: "18K", purity: 18 / 24, note: "Higher purity jewelry" },
  { metal: "gold", label: "22K", purity: 22 / 24, note: "High purity jewelry" },
  { metal: "gold", label: "24K (pure)", purity: 1, note: "Pure gold (soft)" },

  { metal: "silver", label: ".925 (sterling)", purity: 0.925, note: "Sterling silver" },
  { metal: "silver", label: ".999 (fine)", purity: 0.999, note: "Fine silver" },

  { metal: "platinum", label: ".950", purity: 0.95, note: "Common jewelry platinum" },
  { metal: "platinum", label: ".999 (fine)", purity: 0.999, note: "Fine platinum" },
];

function metalLabel(m: MetalKey) {
  if (m === "gold") return "Gold";
  if (m === "silver") return "Silver";
  return "Platinum";
}

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * spotPrice assumed USD per troy ounce of PURE metal.
 * Then adjusted by purity and converted to grams.
 */
function pricePerGram(spotPrice: number, purity: number) {
  if (!spotPrice || spotPrice <= 0) return 0;
  return (spotPrice / GRAMS_PER_TROY_OUNCE) * purity;
}

export default function PricesHub() {
  const [spot, setSpot] = useState<SpotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSpot(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      // IMPORTANT: This hits YOUR cached endpoint.
      // Your /api/spot controls the upstream TTL so users aren't spamming the upstream feed.
      const res = await fetch("/api/spot", { cache: "no-store" });
      if (!res.ok) throw new Error(`Spot endpoint failed (${res.status})`);

      const data = (await res.json()) as SpotResponse;

      // sanity checks
      if (
        !data ||
        data.base !== "USD" ||
        data.unit !== "troy_oz" ||
        typeof data.gold !== "number" ||
        typeof data.silver !== "number" ||
        typeof data.platinum !== "number"
      ) {
        throw new Error("Spot endpoint returned unexpected data");
      }

      setSpot(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load prices");
      setSpot(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchSpot(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastUpdatedPretty = useMemo(() => {
    if (!spot?.updatedAt) return "—";
    const d = new Date(spot.updatedAt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  }, [spot?.updatedAt]);

  const spotMap = useMemo(() => {
    return {
      gold: spot?.gold ?? 0,
      silver: spot?.silver ?? 0,
      platinum: spot?.platinum ?? 0,
    } as Record<MetalKey, number>;
  }, [spot]);

  const rows = useMemo(() => {
    return PURITIES.map((p) => {
      const s = spotMap[p.metal];
      const perGram = pricePerGram(s, p.purity);
      const perOzEquivalent = perGram * GRAMS_PER_TROY_OUNCE; // same purity applied
      return {
        ...p,
        spot: s,
        perGram,
        perOzEquivalent,
      };
    });
  }, [spotMap]);

  return (
    <div className="space-y-10">
      {/* SPOT SUMMARY */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-50">Spot Prices (USD / troy oz)</h2>
            <p className="text-xs text-slate-400">
              These values come from our cached endpoint — so visitors won’t trigger upstream refreshes every time.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="text-xs text-slate-400">
              Last updated: <span className="text-slate-200">{lastUpdatedPretty}</span>
              {spot?.source ? (
                <>
                  {" "}
                  <span className="text-slate-600">•</span>{" "}
                  <span className="text-slate-400">Source:</span>{" "}
                  <span className="text-slate-200">{spot.source}</span>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => fetchSpot(true)}
              disabled={loading || refreshing}
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh prices"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { label: "Gold spot", value: spot?.gold, sub: "Per troy oz (pure)" },
            { label: "Silver spot", value: spot?.silver, sub: "Per troy oz (pure)" },
            { label: "Platinum spot", value: spot?.platinum, sub: "Per troy oz (pure)" },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">{card.label}</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">
                {loading ? "…" : spot ? formatMoney(card.value ?? 0) : "—"}
              </div>
              <div className="mt-1 text-xs text-slate-400">{card.sub}</div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            <div className="font-semibold">Couldn’t load live prices</div>
            <div className="mt-1 text-rose-100/80">{error}</div>
            <div className="mt-2 text-xs text-rose-100/70">
              The page still works — it’ll just show dashes until the feed recovers.
            </div>
          </div>
        ) : null}
      </section>
<AdSlot placement="prices_mid" />

      {/* PRICES TABLE (DARK, READABLE) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Prices by Purity</h2>
            <p className="text-xs text-slate-400">
              Estimated melt pricing based on spot × purity. Real offers can be lower due to buyer margin and refining.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/60">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-300">
                <th className="py-3 px-4">Metal</th>
                <th className="py-3 px-4">Purity</th>
                <th className="py-3 px-4">Price / gram</th>
                <th className="py-3 px-4">Price / oz</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {rows.map((r) => (
                <tr key={`${r.metal}-${r.label}`} className="hover:bg-slate-900/30">
                  <td className="py-3 px-4 font-medium text-slate-100">{metalLabel(r.metal)}</td>
                  <td className="py-3 px-4 text-slate-200">{r.label}</td>
                  <td className="py-3 px-4 text-slate-100">{r.spot > 0 ? formatMoney(r.perGram) : "—"}</td>
                  <td className="py-3 px-4 text-slate-100">{r.spot > 0 ? formatMoney(r.perOzEquivalent) : "—"}</td>
                  <td className="py-3 px-4 text-xs text-slate-300">{r.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-[12px] text-slate-400">
          Tip: Use the calculator below for an item-specific melt value estimate.
        </div>
      </section>

      {/* CALCULATOR EMBED (FORCE DROPDOWN READABILITY HERE) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-50">Estimate Your Item</h2>
          <p className="text-xs text-slate-400">
            Enter metal, purity, and weight. The spot prices above are used as the reference baseline.
          </p>
        </div>

        <div
          className={[
            "mt-4",
            // Force readable form controls inside this block (without editing GoldCalculator)
            "[&_select]:bg-slate-900 [&_select]:text-slate-100 [&_select]:border-slate-700",
            "[&_input]:bg-slate-900 [&_input]:text-slate-100 [&_input]:border-slate-700",
            "[&_label]:text-slate-300",
            "[&_option]:bg-slate-900 [&_option]:text-slate-100",
          ].join(" ")}
        >
          <GoldCalculator showHeading={false} showSaveControls={false} lockMode="none" />
        </div>
      </section>

      {/* SEO / TRUST BLOCK */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <h2 className="text-lg font-semibold text-slate-50">How to Read These Prices</h2>

        <div className="mt-3 space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>
            Spot price is quoted per <span className="text-slate-100">troy ounce</span> of{" "}
            <span className="text-slate-100">pure</span> metal. Most jewelry isn’t pure — so we adjust by purity
            (example: 14K gold is 14/24 = 58.3% pure).
          </p>
          <p>
            “Melt value” is raw metal content only — it excludes brand value, gemstones, craftsmanship, taxes, and shipping.
            Buyer offers are typically lower because buyers need margin, verification, and refining coverage.
          </p>
        </div>
      </section>
    </div>
  );
}
