"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../lib/analytics";

type Props = {
  locked: boolean;

  /** Where this lock is shown, helps analytics segmentation */
  placement?: string;

  /** Pricing display only (no Stripe yet) */
  priceText?: string;

  /** Optional: what the user gets */
  bullets?: string[];

  /** The content you want to blur/lock */
  children: React.ReactNode;
};

function sessionKey(placement: string) {
  return `mm_unlock_viewed:${placement}`;
}

export default function ValuationUnlockPanel({
  locked,
  placement = "value_results",
  priceText = "$4.99 unlock",
  bullets = [
    "Full valuation details",
    "Confidence range + comps",
    "Export + save to dashboard (coming next)",
  ],
  children,
}: Props) {
  const [clicked, setClicked] = useState(false);

  // Fire "viewed" once per session per placement
  useEffect(() => {
    if (!locked) return;
    if (typeof window === "undefined") return;

    try {
      const key = sessionKey(placement);
      if (sessionStorage.getItem(key)) return;

      sessionStorage.setItem(key, "1");
      trackEvent("valuation_unlock_viewed", { placement });
    } catch {
      // If sessionStorage is blocked, still track once on mount
      trackEvent("valuation_unlock_viewed", { placement });
    }
  }, [locked, placement]);

  const blurClass = useMemo(() => {
    return locked ? "blur-sm pointer-events-none select-none" : "";
  }, [locked]);

  return (
    <div className="relative">
      {/* The content being locked */}
      <div className={blurClass}>{children}</div>

      {/* Overlay */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-950/90 p-5 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  Premium valuation
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-50">
                  Unlock the full result
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  One-time unlock for this valuation.
                </p>
              </div>
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200">
                {priceText}
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                onClick={() => {
                  setClicked(true);
                  trackEvent("valuation_checkout_started", {
                    placement,
                    product: "valuation_unlock",
                    price_text: priceText,
                  });
                }}
              >
                Unlock now
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-emerald-500/40 bg-slate-950 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-slate-900"
                onClick={() => {
                  trackEvent("waitlist_submit", { placement: `${placement}_learn_more` });
                  // Optional: scroll to waitlist if you have it on the page
                  const el = document.getElementById("pro-waitlist");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Learn more
              </button>
            </div>

            {clicked && (
              <p className="mt-3 text-xs text-slate-300">
                ✅ Checkout coming next. For now this click is tracked so we can validate demand.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
