"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdSlot from "./AdSlot";
import { trackEvent } from "../lib/analytics";

type LockMode = "none" | "pdf" | "afterN";

type GoldCalculatorProps = {
  showHeading?: boolean;
  showSaveControls?: boolean;

  onSave?: (valuation: {
    metal_type: string;
    karat: number; // for non-gold, we store "karat-equivalent" (purity * 24)
    weight_gram: number;
    spot_price: number;
    melt_value: number;
    notes?: string;
  }) => void;

  lockMode?: LockMode;
  freeValuations?: number;

  /** Legacy switch (ignored for melt locking). Kept for compatibility. */
  lockResults?: boolean;

  /** Price shown in UI + sent in events */
  pdfPriceText?: string;
};

const METAL_OPTIONS = [
  { label: "Gold", value: "gold" },
  { label: "Silver", value: "silver" },
  { label: "Platinum", value: "platinum" },
];

const GRAMS_PER_TROY_OUNCE = 31.1035;

// Gold uses true karat labels
const GOLD_PURITY_OPTIONS = [
  { label: "10K", value: 10 },
  { label: "14K", value: 14 },
  { label: "18K", value: 18 },
  { label: "22K", value: 22 },
  { label: "24K", value: 24 },
];

// Silver/platinum use “purity” options, stored as karat-equivalent (purity * 24)
// so calculateMeltValue stays unchanged (purity = karat/24).
//
// Labels intentionally short so they fit in the UI cleanly.
const SILVER_PURITY_OPTIONS = [
  { label: "999", value: 0.999 * 24 }, // 23.976
  { label: "925", value: 0.925 * 24 }, // 22.2
  { label: "900", value: 0.9 * 24 }, // 21.6
  { label: "800", value: 0.8 * 24 }, // 19.2
];

const PLATINUM_PURITY_OPTIONS = [
  { label: "999", value: 0.999 * 24 }, // 23.976
  { label: "950", value: 0.95 * 24 }, // 22.8
  { label: "900", value: 0.9 * 24 }, // 21.6
  { label: "850", value: 0.85 * 24 }, // 20.4
];

/**
 * IMPORTANT: pricing math stays exactly the same.
 * Do not change this function unless we explicitly revise assumptions.
 */
function calculateMeltValue(karat: number, grams: number, spotPrice: number) {
  if (!karat || !grams || !spotPrice) return 0;

  const purity = karat / 24; // gold karat OR "karat-equivalent" for other metals
  const gramsPerTroyOunce = 31.1035;

  const value = (grams * purity * spotPrice) / gramsPerTroyOunce;
  return value;
}

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatNumberInt(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function formatCurrencyInt(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `$${formatNumberInt(n)}`;
}

function titleCase(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type SpotResponse = {
  base: "USD";
  unit: "troy_oz";
  gold: number;
  silver: number;
  platinum: number;
  updatedAt: string;
  source: string;
};

function getPurityOptions(metalType: string) {
  if (metalType === "gold") return GOLD_PURITY_OPTIONS;
  if (metalType === "silver") return SILVER_PURITY_OPTIONS;
  return PLATINUM_PURITY_OPTIONS;
}

function getDefaultPurityValue(metalType: string) {
  if (metalType === "gold") return 14;
  if (metalType === "silver") return 0.925 * 24; // sterling default feels “normal”
  return 0.95 * 24; // Pt 950 default
}

function findOptionLabel(options: { label: string; value: number }[], value: number) {
  // handle float values (22.2 etc.) with a tolerance
  const hit = options.find((o) => Math.abs(o.value - value) < 0.0005);
  return hit?.label ?? null;
}

export default function GoldCalculator({
  showHeading = false,
  showSaveControls = false,
  onSave,

  lockMode = "none",
  freeValuations = 1,

  pdfPriceText = "$4.99",
  lockResults = false,
}: GoldCalculatorProps) {
  const [metalType, setMetalType] = useState<string>("gold");
  const [karat, setKarat] = useState<number>(14);
  const [weightGrams, setWeightGrams] = useState<string>("");

  // Spot price input remains a string (same as before)
  const [spotPrice, setSpotPrice] = useState<string>("2400");

  const [notes, setNotes] = useState<string>("");

  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Inline tips toggle
  const [showWeightTips, setShowWeightTips] = useState(false);

  // Live spot wiring (from /api/spot)
  const [spotFeed, setSpotFeed] = useState<SpotResponse | null>(null);
  const [spotLoading, setSpotLoading] = useState(false);
  const [spotError, setSpotError] = useState<string | null>(null);

  // Spot mode: live (auto-updates) vs manual override
  const [spotMode, setSpotMode] = useState<"live" | "manual">("live");

  const purityOptions = useMemo(() => getPurityOptions(metalType), [metalType]);
  const purityLabel = metalType === "gold" ? "Karat" : "Purity";

  const meltValue = calculateMeltValue(karat, Number(weightGrams), Number(spotPrice));

  // Dealer offer band (existing behavior)
  const dealerLow = meltValue * 0.85;
  const dealerHigh = meltValue * 0.9;

  const resultsReady = meltValue > 0;
  const canSave = resultsReady && weightGrams !== "" && spotPrice !== "";
  const canExportPdf = resultsReady && weightGrams !== "" && spotPrice !== "";

  const showPremiumPdfPanel = lockMode === "pdf";

  const premiumPanelRef = useRef<HTMLDivElement | null>(null);
  const firedViewedRef = useRef<boolean>(false);

  // --- Live spot fetch (shared backend as PricesHub) ---
  async function fetchSpot() {
    try {
      setSpotLoading(true);
      setSpotError(null);

      const res = await fetch("/api/spot", { cache: "no-store" });
      if (!res.ok) throw new Error(`Spot endpoint failed (${res.status})`);

      const data = (await res.json()) as SpotResponse;

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

      setSpotFeed(data);
      return data;
    } catch (e: any) {
      setSpotError(e?.message ?? "Failed to load live spot");
      setSpotFeed(null);
      return null;
    } finally {
      setSpotLoading(false);
    }
  }

  // Fetch once on mount
  useEffect(() => {
    fetchSpot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When metal changes:
  // - set a sensible default purity for that metal
  useEffect(() => {
    setKarat((prev) => {
      const opts = getPurityOptions(metalType);
      const stillValid = opts.some((o) => Math.abs(o.value - prev) < 0.0005);
      return stillValid ? prev : getDefaultPurityValue(metalType);
    });
  }, [metalType]);

  // When metal changes and we're in live mode, sync spotPrice to the feed
  useEffect(() => {
    if (spotMode !== "live") return;
    if (!spotFeed) return;

    const map: Record<string, number> = {
      gold: spotFeed.gold,
      silver: spotFeed.silver,
      platinum: spotFeed.platinum,
    };

    const next = map[metalType] ?? 0;
    if (next > 0) {
      setSpotPrice(String(Math.round(next)));
    }
  }, [metalType, spotFeed, spotMode]);

  // If user manually edits spot, flip to manual
  function handleSpotChange(v: string) {
    if (spotMode !== "manual") setSpotMode("manual");
    setSpotPrice(v);
  }

  function useLiveSpotNow() {
    setSpotMode("live");
    if (!spotFeed) return;

    const map: Record<string, number> = {
      gold: spotFeed.gold,
      silver: spotFeed.silver,
      platinum: spotFeed.platinum,
    };
    const next = map[metalType] ?? 0;
    if (next > 0) setSpotPrice(String(Math.round(next)));
  }

  // Premium panel viewed tracking (unchanged behavior)
  useEffect(() => {
    if (!showPremiumPdfPanel) return;
    if (!premiumPanelRef.current) return;

    const el = premiumPanelRef.current;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && !firedViewedRef.current) {
          firedViewedRef.current = true;

          trackEvent("valuation_unlock_viewed", {
            placement: "gold_calc_pdf_panel",
            product: "gold_pdf",
            price_text: pdfPriceText,
            lock_mode: lockMode,
            free_valuations: freeValuations,
            metal_type: metalType,
          });
        }
      },
      { threshold: 0.35 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [showPremiumPdfPanel, pdfPriceText, lockMode, freeValuations, metalType]);

  function handleSave() {
    if (!onSave || !canSave) return;

    onSave({
      metal_type: metalType,
      karat,
      weight_gram: Number(weightGrams),
      spot_price: Number(spotPrice),
      melt_value: Number(meltValue),
      notes: notes.trim() || undefined,
    });
  }

  function handleCopy() {
    if (!canSave) return;

    const purityText =
      metalType === "gold"
        ? `${karat}K`
        : findOptionLabel(purityOptions, karat) ?? `${(karat / 24).toFixed(3)} purity`;

    const spotNum = Number(spotPrice);
    const spotPretty = Number.isFinite(spotNum) ? formatCurrencyInt(spotNum) : `$${spotPrice}`;

    const text = `
${titleCase(metalType)} Valuation — ${purityText}, ${weightGrams}g
Melt value: ${formatMoney(meltValue)}
Dealer offer (85–90%): ${formatMoney(dealerLow)} – ${formatMoney(dealerHigh)}
Spot price used: ${spotPretty}
Notes: ${notes || "None"}
`.trim();

    navigator.clipboard.writeText(text);
    alert("Valuation copied to clipboard!");
  }

  async function handleCheckoutStart() {
    if (!canExportPdf || isRedirectingToCheckout) return;

    setIsRedirectingToCheckout(true);

    trackEvent("valuation_checkout_started", {
      placement: "gold_calc_pdf_panel",
      product: "gold_pdf",
      price_text: pdfPriceText,
      metal_type: metalType,
      karat,
      weight_grams: Number(weightGrams || 0),
      spot_price: Number(spotPrice || 0),
      melt_value: Number(meltValue || 0),
    });

    const payload = {
      metalType,
      karat,
      weightGrams: weightGrams || "",
      spotPrice: spotPrice || "",
      meltValue: resultsReady ? formatMoney(meltValue) : "—",
      dealerLow: resultsReady ? formatMoney(dealerLow) : "—",
      dealerHigh: resultsReady ? formatMoney(dealerHigh) : "—",
      notes: notes || "",
      createdAtISO: new Date().toISOString(),
      spotSource: spotMode === "live" ? "live_spot_feed" : "manual_override",
    };

    try {
      sessionStorage.setItem("mm_last_valuation_payload", JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "gold",
          payload,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.url) {
        throw new Error("Checkout session failed");
      }

      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      alert("Unable to start checkout. Please try again.");
      setIsRedirectingToCheckout(false);
    }
  }

  async function handleDownloadPdf() {
    if (!canExportPdf || isGeneratingPdf) return;

    setIsGeneratingPdf(true);

    try {
      const payload = {
        metalType,
        karat,
        weightGrams: weightGrams || "",
        spotPrice: spotPrice || "",
        meltValue: resultsReady ? formatMoney(meltValue) : "—",
        dealerLow: resultsReady ? formatMoney(dealerLow) : "—",
        dealerHigh: resultsReady ? formatMoney(dealerHigh) : "—",
        notes: notes || "",
        createdAtISO: new Date().toISOString(),
      };

      const res = await fetch("/api/pdf/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`PDF request failed: ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "marketmint-valuation.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Could not generate the PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  // Details helpers (layout-only; no changes to pricing logic)
  const purity = karat / 24;
  const spot = Number(spotPrice);
  const pricePerGram = Number.isFinite(spot) && spot > 0 ? spot / GRAMS_PER_TROY_OUNCE : 0;
  const effectivePerGram = pricePerGram * purity;
  const purityAdjustedOz = effectivePerGram * GRAMS_PER_TROY_OUNCE;

  const liveUpdatedPretty = useMemo(() => {
    if (!spotFeed?.updatedAt) return null;
    const d = new Date(spotFeed.updatedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString();
  }, [spotFeed?.updatedAt]);

  const selectedPurityLabel = useMemo(() => {
    const label = findOptionLabel(purityOptions, karat);
    return label ?? (metalType === "gold" ? `${karat}K` : `${(purity * 100).toFixed(1)}%`);
  }, [purityOptions, karat, metalType, purity]);

  return (
    <div className="space-y-5">
      {showHeading && <h2 className="text-xl font-semibold text-slate-50">Metal Value Calculator</h2>}

      {/* INPUTS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="grid gap-3 md:grid-cols-[0.75fr_0.75fr_1.05fr_1.45fr]">
          {/* Metal */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">Metal</label>
            <select
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              value={metalType}
              onChange={(e) => setMetalType(e.target.value)}
            >
              {METAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Purity / Karat */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">{purityLabel}</label>

            <select
              className="w-full truncate rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              value={karat}
              onChange={(e) => setKarat(Number(e.target.value))}
            >
              {purityOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="text-[10px] text-slate-500 leading-tight">Purity affects melt value (we apply purity × weight × spot).</p>
          </div>

          {/* Weight */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">Weight (grams)</label>

              <button
                type="button"
                onClick={() => setShowWeightTips((v) => !v)}
                className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 whitespace-nowrap"
              >
                Quick tips
              </button>
            </div>

            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              placeholder="e.g. 45"
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
            />

            {showWeightTips && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2">
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                  <li>Best: use a kitchen scale and weigh in grams.</li>
                  <li>No scale: try scenarios (5g, 10g, 20g) to estimate.</li>
                  <li>1 oz ≈ 28.35 g.</li>
                </ul>
                <p className="mt-2 text-[11px] text-slate-500">Stones/clasps can inflate weight—melt value is for metal content only.</p>
              </div>
            )}
          </div>

          {/* Spot price */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide whitespace-nowrap">
                Spot price (USD / troy oz)
              </label>

              <Link href="/prices" className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 whitespace-nowrap">
                Prices hub →
              </Link>
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 pr-24 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                placeholder="e.g. 2400"
                value={spotPrice}
                onChange={(e) => handleSpotChange(e.target.value)}
              />

              <button
                type="button"
                onClick={() => (spotMode === "live" ? setSpotMode("manual") : useLiveSpotNow())}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-900 whitespace-nowrap"
              >
                {spotMode === "live" ? "Manual" : "Use live"}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-slate-500">
                {spotMode === "live"
                  ? spotFeed
                    ? `Live feed • ${spotFeed.source}${liveUpdatedPretty ? ` • ${liveUpdatedPretty}` : ""}`
                    : spotLoading
                    ? "Loading live spot…"
                    : spotError
                    ? "Live spot unavailable (using your input)"
                    : "Live spot unavailable (using your input)"
                  : "Manual override (won’t auto-update)"}
              </p>

              {spotMode === "live" && !spotFeed && !spotLoading ? (
                <button
                  type="button"
                  onClick={() => fetchSpot()}
                  className="text-[10px] font-semibold text-emerald-300 hover:text-emerald-200 whitespace-nowrap"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Melt value is a baseline estimate from spot price × purity × weight. Real offers can be lower due to testing, refining, and buyer margin.
        </p>
      </div>

      {/* RESULTS */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        {/* 1) Centered headline result */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Estimated melt value</p>

          <p
            key={meltValue}
            className="mt-2 text-4xl font-semibold text-slate-50"
            style={{ animation: resultsReady ? "fadeSlide 0.4s ease-out" : "none" }}
          >
            {resultsReady ? formatMoney(meltValue) : "—"}
          </p>

          <p className="mt-2 text-[12px] text-slate-400">Melt value only — not a guaranteed payout. Use it to sanity-check buyer offers.</p>

          {resultsReady && (
            <p className="mt-2 text-[13px] text-emerald-200">
              Typical dealer offer (~85–90% of melt):{" "}
              <span className="font-semibold text-emerald-100">
                {formatMoney(dealerLow)} – {formatMoney(dealerHigh)}
              </span>
            </p>
          )}
        </div>

        {/* 2) Calculation details */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Calculation details</p>
            <Link href="/prices" className="text-xs font-semibold text-emerald-200 hover:text-emerald-100 whitespace-nowrap">
              View prices hub →
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-[11px] text-slate-400">Market spot used</div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="text-lg font-semibold text-slate-100">{spot > 0 ? formatCurrencyInt(spot) : "—"}</div>
                <div className="text-[11px] text-slate-500 whitespace-nowrap">/ troy oz</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-[11px] text-slate-400">Metal</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{titleCase(metalType)}</div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-[11px] text-slate-400">Purity</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">
                {selectedPurityLabel}{" "}
                <span className="text-[12px] font-normal text-slate-400">({purity.toFixed(3)})</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-[11px] text-slate-400">Weight</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{weightGrams ? `${weightGrams} g` : "—"}</div>
            </div>
          </div>
        </div>

        {/* 3) What this means */}
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">What this means</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-[11px] text-slate-400">Price / gram (market)</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{pricePerGram > 0 ? `$${pricePerGram.toFixed(2)}` : "—"}</div>
              <div className="text-[10px] text-slate-500">Derived from spot ÷ 31.1035</div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-[11px] text-slate-400">Effective / gram (purity-adjusted)</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">
                {effectivePerGram > 0 ? `$${effectivePerGram.toFixed(2)}` : "—"}
              </div>
              <div className="text-[10px] text-slate-500">This is what changes with purity</div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-[11px] text-slate-400">Purity-adjusted / oz</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{purityAdjustedOz > 0 ? formatCurrencyInt(purityAdjustedOz) : "—"}</div>
              <div className="text-[10px] text-slate-500">Useful for comparing purities</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12px] text-slate-400">
              Tip: changing purity updates the **purity-adjusted** numbers (spot stays the same market reference).
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/prices"
                className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-slate-900"
              >
                Compare prices by purity →
              </Link>

              <Link
                href="/offers"
                className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-900"
              >
                Track offers →
              </Link>

              {showPremiumPdfPanel ? (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("mm_pdf_panel");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                >
                  Export PDF →
                </button>
              ) : null}
            </div>
          </div>

          {lockResults ? (
            <p className="mt-3 text-[11px] text-slate-500">
              Note: lockResults is enabled, but melt value is intentionally not locked (PDF export is the paid feature).
            </p>
          ) : null}
        </div>
      </div>

      {/* ADS (gated) */}
      {process.env.NEXT_PUBLIC_ADS_ENABLED === "true" ? (
        <div className="pt-2">
          <AdSlot placement="gold_calc_mid" />
        </div>
      ) : null}

      {/* PREMIUM PDF */}
      {showPremiumPdfPanel && (
        <div
          id="mm_pdf_panel"
          ref={premiumPanelRef}
          className="rounded-2xl border border-emerald-500/20 bg-slate-950/40 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Export a timestamped PDF valuation
              </p>
              <h3 className="text-lg font-semibold text-slate-50">Download a PDF valuation</h3>
              <p className="text-sm text-slate-300 leading-relaxed">Clean, shareable summary for your records or sending to a jeweler/buyer.</p>
            </div>

            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200">
              {pdfPriceText}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <p className="text-xs font-semibold text-slate-200">What’s inside</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Melt value + dealer band</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Inputs used (metal, purity, grams, spot)</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Timestamped valuation for documentation</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <p className="text-xs font-semibold text-slate-200">Why it helps</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Share with buyers without screenshots</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Keep records for multiple items</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>More export formats later (Pro)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleCheckoutStart}
              disabled={!canExportPdf || isRedirectingToCheckout}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {isRedirectingToCheckout
                ? "Redirecting to secure checkout…"
                : !canExportPdf
                ? "Enter weight to generate PDF"
                : "Get Professional PDF Valuation ($4.99)"}
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("pro-waitlist");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex items-center justify-center rounded-full border border-emerald-500/40 bg-slate-950 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-slate-900"
            >
              Learn more
            </button>
          </div>

          <p className="mt-2 text-[12px] text-slate-400 leading-relaxed">One-time purchase • Instant download • No account required</p>
        </div>
      )}

      {/* SAVE CONTROLS (moved below Ad + PDF so monetization is seen first) */}
      {showSaveControls && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <p className="text-[12px] text-slate-400 leading-relaxed">
            Save valuations to your workspace so you can compare offers later.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wide">
                Notes (optional)
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                placeholder="e.g. Mom’s necklace"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition ${
                canSave ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              Save valuation
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!canSave}
              className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition ${
                canSave
                  ? "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  : "border border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed"
              }`}
            >
              Copy valuation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
