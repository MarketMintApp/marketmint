"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../lib/analytics";

type Props = {
  /** Whether the PDF/export is locked */
  locked: boolean;

  /** Analytics placement identifier */
  placement?: string;

  /** Price display text */
  priceText?: string;

  /** Bullet points describing value */
  bullets?: string[];

  /** Content being blurred/locked */
  children: React.ReactNode;
};

function sessionKey(placement: string) {
  return `mm_unlock_viewed:${placement}`;
}

export default function ValuationUnlockPanel({
  locked,
  placement = "gold_results",
  priceText = "$4.99 one-time",
  bullets = [
    "Professional PDF valuation",
    "Exact melt value with spot price",
    "Timestamped, shareable document",
  ],
  children,
}: Props) {
  const [loading, setLoading] = useState(false);

  /**
   * Fire a single "viewed" event per session per placement
   */
  useEffect(() => {
    if (!locked) return;
    if (typeof window === "undefined") return;

    try {
      const key = sessionKey(placement);
      if (sessionStorage.getItem(key)) return;

      sessionStorage.setItem(key, "1");
      trackEvent("valuation_unlock_viewed", { placement });
    } catch {
      trackEvent("valuation_unlock_viewed", { placement });
    }
  }, [locked, placement]);

  const blurClass = useMemo(
    () => (locked ? "blur-sm pointer-events-none select-none" : ""),
    [locked]
  );

  /**
   * Stripe Checkout redirect
   */
  const handleCheckout = async () => {
    try {
      setLoading(true);

      trackEvent("valuation_checkout_started", {
        placement,
        product: "gold_pdf",
        price: 4.99,
      });

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "gold" }),
      });

      const data = await res.json();

      if (!res.ok || !data?.url) {
        throw new Error("Checkout session failed");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Unable to start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Locked content */}
      <div className={blurClass}>{children}</div>

      {/* Paywall overlay */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-950/90 p-5 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  Professional valuation
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-50">
                  Download your gold valuation PDF
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  One-time purchase. Instant access.
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

            <div className="mt-5">
              <button
                type="button"
                disabled={loading}
                onClick={handleCheckout}
                className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition
                  ${
                    loading
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-500 text-black hover:bg-emerald-400"
                  }`}
              >
                {loading
                  ? "Redirecting to secure checkout…"
                  : "Get Professional PDF Valuation ($4.99)"}
              </button>

              <p className="mt-2 text-xs text-slate-400 text-center">
                One-time purchase • Instant download • No account required
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
