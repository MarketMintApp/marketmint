"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type VerifyResponse =
  | {
      ok: true;
      email?: string | null;
      product?: string | null;
      source?: string | null;
    }
  | {
      ok: false;
      error?: string | null;
      status?: number | null;
    };

function Pill({
  tone = "emerald",
  children,
}: {
  tone?: "emerald" | "slate" | "rose";
  children: React.ReactNode;
}) {
  const styles =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : "border-slate-700 bg-slate-900/40 text-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3">
      <div className="text-xs font-semibold tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

export default function PdfSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const supportEmail = "marketmintapp@gmail.com";

  const receiptEmail = useMemo(() => {
    if (verifyResult && "ok" in verifyResult && verifyResult.ok) {
      return verifyResult.email ?? supportEmail;
    }
    return supportEmail;
  }, [verifyResult]);

  /**
   * STEP 1 — VERIFY STRIPE SESSION
   */
  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      if (!sessionId) {
        setVerifyResult({
          ok: false,
          error: "Missing session_id",
          status: 400,
        });
        setVerified(false);
        setVerifying(false);
        return;
      }

      try {
        setVerifying(true);

        const res = await fetch("/api/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data?.ok) {
          setVerified(true);
          setVerifyResult({
            ok: true,
            email: data.email ?? null,
            product: data.product ?? null,
            source: data.source ?? null,
          });
        } else {
          setVerified(false);
          setVerifyResult({
            ok: false,
            error: data?.error ?? "Verification failed",
            status: res.status,
          });
        }
      } catch (err: any) {
        if (cancelled) return;
        setVerified(false);
        setVerifyResult({
          ok: false,
          error: err?.message ?? "Verification error",
          status: 500,
        });
      } finally {
        if (!cancelled) setVerifying(false);
      }
    }

    verifySession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  /**
   * STEP 2 — DOWNLOAD PDF (unchanged behavior)
   */
  async function handleDownloadPdf() {
    setDownloadError(null);

    if (!sessionId) {
      setDownloadError(
        "Missing session_id. Please return to the Gold Calculator and try again."
      );
      return;
    }

    // Pull the payload from sessionStorage (current system behavior)
    let valuationPayload: any = null;
    try {
      const raw = sessionStorage.getItem("mm_last_valuation_payload");
      if (raw) valuationPayload = JSON.parse(raw);
    } catch {}

    if (!valuationPayload) {
      setDownloadError(
        "Valuation data not found. Please return to the Gold Calculator and try again."
      );
      return;
    }

    try {
      setDownloading(true);

      const res = await fetch("/api/pdf/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "gold_calc",
          payload: valuationPayload,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "PDF generation failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "marketmint-valuation.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err?.message ?? "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  const statusPill = verifying ? (
    <Pill tone="slate">Verifying purchase…</Pill>
  ) : verified ? (
    <Pill tone="emerald">Payment confirmed</Pill>
  ) : (
    <Pill tone="rose">Verification needed</Pill>
  );

  const headline = verifying
    ? "Confirming your purchase"
    : verified
    ? "Your PDF valuation is ready"
    : "We couldn’t verify this purchase";

  const subhead = verifying
    ? "This usually takes a couple seconds. Please keep this tab open."
    : verified
    ? "Download your valuation report below. If it doesn’t download, check your browser’s downloads folder and try again."
    : "If you just completed checkout, refresh once. If it still fails, contact support and include the session ID below.";

  return (
    <main className="min-h-[80vh] bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center gap-2">{statusPill}</div>

          <h1 className="text-3xl font-semibold tracking-tight">{headline}</h1>
          <p className="mt-2 text-sm text-slate-300">{subhead}</p>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-base font-semibold">
                  MarketMint Valuation PDF
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Timestamped report • Inputs + spot price • Shareable record
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Pill tone="emerald">$4.99</Pill>
                <Pill tone="slate">One-time export</Pill>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <MetaRow
                label="Receipt"
                value={
                  verified ? (
                    <span className="text-slate-100">
                      Sent to{" "}
                      <span className="font-semibold">{receiptEmail}</span>
                    </span>
                  ) : (
                    <span className="text-slate-200">
                      Support:{" "}
                      <a
                        className="font-semibold text-slate-100 underline underline-offset-4"
                        href={`mailto:${supportEmail}`}
                      >
                        {supportEmail}
                      </a>
                    </span>
                  )
                }
              />

              <MetaRow
                label="Session ID"
                value={
                  sessionId ? (
                    <span className="font-mono text-xs text-slate-200">
                      {sessionId}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />

              <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
                <div className="text-sm font-semibold">What you received</div>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  <li>• Melt value estimate and dealer offer band</li>
                  <li>• Inputs used (weight, karat, spot reference)</li>
                  <li>• A clean PDF record you can save or share</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleDownloadPdf}
                disabled={verifying || downloading}
                className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {downloading ? "Preparing download…" : "Download PDF"}
              </button>

              <button
                onClick={() => window.location.reload()}
                className="rounded-full border border-slate-700 bg-slate-900/40 px-5 py-3 text-sm font-semibold"
              >
                Refresh verification
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Having trouble? Try downloading again, then check your browser’s
              downloads folder. If it still fails, email{" "}
              <a
                className="text-slate-200 underline underline-offset-4"
                href={`mailto:${supportEmail}`}
              >
                {supportEmail}
              </a>{" "}
              and include the session ID.
            </div>

            {downloadError && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {downloadError}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/gold"
              className="rounded-full border border-slate-800 bg-slate-900/40 px-5 py-2.5 text-sm font-semibold"
            >
              Back to Gold Calc
            </Link>

            <Link
              href="/offers"
              className="rounded-full border border-slate-800 bg-slate-900/40 px-5 py-2.5 text-sm font-semibold"
            >
              Compare offers
            </Link>

            <Link
              href="/value"
              className="rounded-full border border-slate-800 bg-slate-900/40 px-5 py-2.5 text-sm font-semibold"
            >
              Go to Workspace
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
