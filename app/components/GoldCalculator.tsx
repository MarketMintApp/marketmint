"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdSlot from "./AdSlot";
import { trackEvent } from "../lib/analytics";

type LockMode = "none" | "pdf" | "afterN";

type GoldCalculatorProps = {
  /** Optional heading above the calculator */
  showHeading?: boolean;

  /** Should we show the Save button + helper text? */
  showSaveControls?: boolean;

  /** Called when the user clicks “Save valuation” */
  onSave?: (valuation: {
    metal_type: string;
    karat: number;
    weight_gram: number;
    spot_price: number;
    melt_value: number;
    notes?: string;
  }) => void;

  /**
   * Paywall model:
   * - "none": no premium panel, no PDF upsell
   * - "pdf": melt value stays free, PDF export is paid
   * - "afterN": reserved for later
   *
   * IMPORTANT: default is "none" so the calculator can be embedded anywhere
   * (Prices page, Workspace page) without showing the PDF monetization panel.
   */
  lockMode?: LockMode;

  /** Reserved for later */
  freeValuations?: number;

  /**
   * Legacy switch (ignored for melt locking).
   * Kept for compatibility with existing callsites.
   */
  lockResults?: boolean;

  /** Price shown in UI + sent in events */
  pdfPriceText?: string;
};

const KARAT_OPTIONS = [
  { label: "10K", value: 10 },
  { label: "14K", value: 14 },
  { label: "18K", value: 18 },
  { label: "22K", value: 22 },
  { label: "24K (pure)", value: 24 },
];

const METAL_OPTIONS = [
  { label: "Gold", value: "gold" },
  { label: "Silver", value: "silver" },
  { label: "Platinum", value: "platinum" },
];

/**
 * IMPORTANT: pricing math stays exactly the same.
 * Do not change this function unless we explicitly revise assumptions.
 */
function calculateMeltValue(karat: number, grams: number, spotPrice: number) {
  if (!karat || !grams || !spotPrice) return 0;

  const purity = karat / 24; // e.g. 14K → 14/24
  const gramsPerTroyOunce = 31.1035;

  const value = (grams * purity * spotPrice) / gramsPerTroyOunce;
  return value;
}

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

export default function GoldCalculator({
  showHeading = false,
  showSaveControls = false,
  onSave,

  // KEY CHANGE: default to "none" so embedding doesn't show premium panel.
  lockMode = "none",
  freeValuations = 1,

  // Used only for UI text + analytics
  pdfPriceText = "$4.99",

  // Legacy (ignored for melt locking)
  lockResults = false,
}: GoldCalculatorProps) {
  const [metalType, setMetalType] = useState<string>("gold");
  const [karat, setKarat] = useState<number>(14);
  const [weightGrams, setWeightGrams] = useState<string>("");
  const [spotPrice, setSpotPrice] = useState<string>("2400");
  const [notes, setNotes] = useState<string>("");

  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const meltValue = calculateMeltValue(karat, Number(weightGrams), Number(spotPrice));

  // Simple dealer offer band: ~85–90% of melt value
  const dealerLow = meltValue * 0.85;
  const dealerHigh = meltValue * 0.9;

  const resultsReady = meltValue > 0;
  const canSave = resultsReady && weightGrams !== "" && spotPrice !== "";
  const canExportPdf = resultsReady && weightGrams !== "" && spotPrice !== "";

  /**
   * Option A: melt value always free.
   * PDF is paid when lockMode === "pdf".
   */
  const showPremiumPdfPanel = lockMode === "pdf";

  /**
   * Track "viewed" once per session when premium PDF panel is shown.
   */
  const premiumPanelRef = useRef<HTMLDivElement | null>(null);
  const firedViewedRef = useRef<boolean>(false);

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

    const text = `
${metalType.charAt(0).toUpperCase() + metalType.slice(1)} Valuation — ${karat}K, ${weightGrams}g
Melt value: ${formatMoney(meltValue)}
Dealer offer (85–90%): ${formatMoney(dealerLow)} – ${formatMoney(dealerHigh)}
Spot price used: $${spotPrice}
Notes: ${notes || "None"}
`.trim();

    navigator.clipboard.writeText(text);
    alert("Valuation copied to clipboard!");
  }

  /**
   * STEP 2: Redirect to Stripe Checkout.
   * (Success page + paid PDF download comes in Step 3.)
   */
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
  spotSource: "manual_or_live",
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
  payload, // <-- the exact payload you just built + stored
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

  /**
   * NOTE: In Step 2, we do NOT allow PDF download without payment.
   * This function remains for Step 3 success page wiring.
   */
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

  const karatLabel = metalType === "gold" ? "Karat" : "Purity (assumes pure for now)";
  const showPurityHelper = metalType !== "gold";

  return (
    <div className="space-y-5">
      {showHeading && <h2 className="text-xl font-semibold text-slate-50">Metal Value Calculator</h2>}

      {/* INPUTS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          {/* Metal */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">Metal</label>
            <select
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              value={metalType}
              onChange={(e) => {
                const value = e.target.value;
                setMetalType(value);
                if (value !== "gold") setKarat(24);
              }}
            >
              {METAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Karat / purity */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">{karatLabel}</label>

            {showPurityHelper && (
              <p className="text-[10px] text-slate-400 leading-tight">
                Silver &amp; platinum are treated as pure for now (24K equivalent).
              </p>
            )}

            <select
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-60"
              value={karat}
              onChange={(e) => setKarat(Number(e.target.value))}
              disabled={metalType !== "gold"}
            >
              {KARAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Weight */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">Weight (grams)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              placeholder="e.g. 45"
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
            />

            <details className="mt-2 rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-slate-300 hover:text-slate-200">
                Don’t know the weight? Quick tips
              </summary>

              <div className="mt-2 space-y-2 text-xs text-slate-300">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Best: use a kitchen scale and weigh in grams.</li>
                  <li>No scale: try a few scenarios (5g, 10g, 20g) to get a range.</li>
                  <li>1 oz ≈ 28.35 g.</li>
                </ul>
                <p className="text-slate-500">
                  Stones/clasps can inflate weight—melt value is for metal content only.
                </p>
              </div>
            </details>
          </div>

          {/* Spot price */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">
              Spot price (USD / troy oz)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              placeholder="e.g. 2400"
              value={spotPrice}
              onChange={(e) => setSpotPrice(e.target.value)}
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Melt value is a baseline estimate from spot price × purity × weight. Real offers can be lower due to testing,
          refining, and buyer margin.
        </p>
      </div>

      {/* RESULTS (NEVER locked in Option A) */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Estimated melt value</p>

            <p
              key={meltValue}
              className="mt-1 text-3xl font-semibold text-slate-50"
              style={{ animation: resultsReady ? "fadeSlide 0.4s ease-out" : "none" }}
            >
              {resultsReady ? formatMoney(meltValue) : "—"}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">This estimate is melt value only — not a guaranteed payout.</p>

            {resultsReady && (
              <p className="mt-2 text-[12px] text-emerald-200">
                Typical dealer offer (~85–90% of melt):{" "}
                <span className="font-semibold text-emerald-100">
                  {formatMoney(dealerLow)} – {formatMoney(dealerHigh)}
                </span>
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-[11px] text-slate-400">Spot used</p>
            <p className="text-sm font-semibold text-slate-200">{spotPrice ? `$${spotPrice}` : "—"}</p>
          </div>
        </div>

        {showSaveControls && (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Save valuations to your workspace so you can compare offers later.
              </p>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wide">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  placeholder="e.g. Mom’s necklace"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                  canSave
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                Save valuation
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!canSave}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${
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

        {lockResults ? (
          <p className="mt-3 text-[11px] text-slate-500">
            Note: lockResults is enabled, but melt value is intentionally not locked (PDF export is the paid feature).
          </p>
        ) : null}
      </div>

      {/* ADS (gated) */}
      {process.env.NEXT_PUBLIC_ADS_ENABLED === "true" ? (
        <div className="pt-2">
          <AdSlot placement="gold_calc_mid" />
        </div>
      ) : null}

      {/* PREMIUM PDF (only on pages where lockMode === "pdf") */}
      {showPremiumPdfPanel && (
        <div
          ref={premiumPanelRef}
          className="rounded-2xl border border-emerald-500/20 bg-slate-950/40 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Export a timestamped PDF valuation
              </p>
              <h3 className="text-lg font-semibold text-slate-50">Download a PDF valuation</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Clean, shareable summary for your records or sending to a jeweler/buyer.
              </p>
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
                  <span>Inputs used (metal, karat, grams, spot)</span>
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

          <p className="mt-2 text-[12px] text-slate-400 leading-relaxed">
            One-time purchase • Instant download • No account required
          </p>
        </div>
      )}
    </div>
  );
}
