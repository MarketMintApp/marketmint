"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
   * New paywall model:
   * - "none": everything free
   * - "pdf": melt value stays free, PDF export is premium (Option 1)
   * - "afterN": reserved for later (not enforced in this step)
   */
  lockMode?: LockMode;
  freeValuations?: number;

  /**
   * Legacy switch (do not use to lock melt value anymore).
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

  // NEW
  lockMode = "pdf",
  freeValuations = 1,
  pdfPriceText = "$4.99",

  // LEGACY (ignored for melt locking)
  lockResults = false,
}: GoldCalculatorProps) {
  const [metalType, setMetalType] = useState<string>("gold");
  const [karat, setKarat] = useState<number>(14);
  const [weightGrams, setWeightGrams] = useState<string>("");
  const [spotPrice, setSpotPrice] = useState<string>("2400");
  const [notes, setNotes] = useState<string>("");

  // V1: no Stripe yet — local unlock for PDF only
  const [pdfUnlocked, setPdfUnlocked] = useState<boolean>(false);

  const meltValue = calculateMeltValue(
    karat,
    Number(weightGrams),
    Number(spotPrice)
  );

  // Simple dealer offer band: ~85–90% of melt value
  const dealerLow = meltValue * 0.85;
  const dealerHigh = meltValue * 0.9;

  const canSave = meltValue > 0 && weightGrams !== "" && spotPrice !== "";

  /**
   * IMPORTANT: Do NOT lock melt value in Option 1.
   * We only lock the PDF export panel.
   */
  const pdfLocked = useMemo(() => {
    if (lockMode === "none") return false;
    if (lockMode === "pdf") return !pdfUnlocked;
    // "afterN" not enforced yet; treat as locked until explicitly unlocked
    return !pdfUnlocked;
  }, [lockMode, pdfUnlocked]);

  // Track "viewed" once per session when premium PDF panel is shown
  const premiumPanelRef = useRef<HTMLDivElement | null>(null);
  const firedViewedRef = useRef<boolean>(false);

  useEffect(() => {
    if (lockMode !== "pdf") return;
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
            product: "pdf_export",
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
  }, [lockMode, freeValuations, pdfPriceText, metalType]);

  function handleSave() {
    if (!onSave || !canSave) return;

    // Saving stays free in Option 1 (PDF is the paid feature)
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

    const melt = meltValue > 0 ? formatMoney(meltValue) : "—";
    const dealerLowLocal = meltValue * 0.85;
    const dealerHighLocal = meltValue * 0.9;

    const text = `
${metalType.charAt(0).toUpperCase() + metalType.slice(1)} Valuation — ${karat}K, ${weightGrams}g
Melt value: ${melt}
Dealer offer (85–90%): ${formatMoney(dealerLowLocal)} – ${formatMoney(dealerHighLocal)}
Spot price used: $${spotPrice}
Notes: ${notes || "None"}
`.trim();

    navigator.clipboard.writeText(text);
    alert("Valuation copied to clipboard!");
  }

  function handleCheckoutStart() {
    trackEvent("valuation_checkout_started", {
      placement: "gold_calc_pdf_panel",
      product: "pdf_export",
      price_text: pdfPriceText,
      lock_mode: lockMode,
      free_valuations: freeValuations,
      metal_type: metalType,
    });

    // V1: no Stripe yet — simulate unlock to validate flow
    setPdfUnlocked(true);
  }

  function handleDownloadPdf() {
    // Placeholder: wire real PDF export in Step 6.B.
    // This gives a “download-ish” action now.
    window.print();
  }

  return (
    <div className="space-y-4">
      {showHeading && (
        <h2 className="text-xl font-semibold">Metal Value Calculator</h2>
      )}

      {/* Inputs row */}
      <div className="grid gap-3 md:grid-cols-4">
        {/* Metal */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">
            Metal
          </label>
          <select
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none 
           focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            value={metalType}
            onChange={(e) => {
              const value = e.target.value;
              setMetalType(value);
              // For non-gold metals, default to pure metal for now
              if (value !== "gold") {
                setKarat(24);
              }
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
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide leading-tight">
            {metalType === "gold" ? (
              "Karat"
            ) : (
              <>
                PURITY
                <span className="block text-[10px] text-slate-400 normal-case">
                  (assuming 24K / pure for now)
                </span>
              </>
            )}
          </label>
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
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">
            Weight (grams)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            placeholder="e.g. 45"
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value)}
          />
        </div>

        {/* Spot price */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">
            Spot Price (USD / troy oz)
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

      {/* Results + save area (NEVER locked in Option 1) */}
      <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-300">
          Estimated melt value
        </p>

        {/* Animated melt value */}
        <p
          key={meltValue} // force remount when value changes
          className="mt-1 text-2xl font-semibold"
          style={{
            animation: meltValue > 0 ? "fadeSlide 0.4s ease-out" : "none",
          }}
        >
          {meltValue > 0 ? formatMoney(meltValue) : "—"}
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          This is an estimate based on melt value only. Buyers typically pay less
          to cover refining, risk, and margin.
        </p>

        {meltValue > 0 && (
          <p className="mt-1 text-[11px] text-emerald-300">
            Typical dealer offer (~85–90% of melt):{" "}
            <span className="font-semibold">
              {formatMoney(dealerLow)} – {formatMoney(dealerHigh)}
            </span>
          </p>
        )}

        {showSaveControls && (
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1 w-full md:w-1/2">
              <p className="text-[11px] text-slate-400">
                Save this valuation into your workspace to track items and build
                reports later.
              </p>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wide">
                Notes (optional)
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                placeholder="e.g. Mom&apos;s necklace"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Buttons: Save + Copy */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium transition
                  ${
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
                className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium transition
                  ${
                    canSave
                      ? "bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "bg-slate-900/40 border border-slate-800 text-slate-600 cursor-not-allowed"
                  }`}
              >
                Copy valuation
              </button>
            </div>
          </div>
        )}

        {lockResults ? (
          <p className="mt-3 text-[11px] text-slate-400">
            Note: lockResults is enabled, but melt value is intentionally not locked in Step 6.A (PDF export is the paid feature).
          </p>
        ) : null}
      </div>

      {/* Premium “Download PDF” panel (this is the ONLY paid gate) */}
      <div
        ref={premiumPanelRef}
        className="rounded-2xl border border-emerald-500/20 bg-slate-950/40 p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Premium export
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-50">
              Download PDF valuation
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Clean, shareable PDF summary for records or sending to a buyer/jeweler.
            </p>
          </div>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200">
            {pdfPriceText}
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-slate-200">
          <li className="flex gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Includes melt value + dealer band + inputs</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Timestamped valuation for documentation</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>More export formats later (Pro)</span>
          </li>
        </ul>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {pdfLocked ? (
            <button
              type="button"
              onClick={handleCheckoutStart}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Unlock PDF
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Download PDF
            </button>
          )}

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

        <p className="mt-2 text-[12px] text-slate-400">
          No Stripe yet — “Unlock” is tracked for demand and simulates access locally.
        </p>
      </div>
    </div>
  );
}
