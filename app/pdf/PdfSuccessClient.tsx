"use client";

import { useEffect, useState } from "react";
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
      {children}
    </span>
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

  const valuationPayload = (() => {
  try {
    const raw = sessionStorage.getItem("mm_last_valuation");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();


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
   * STEP 2 — DOWNLOAD PDF
   */
  async function handleDownloadPdf() {
    setDownloadError(null);

    if (!sessionId) {
      setDownloadError(
        "Missing session_id. Please return to the Gold Calculator and try again."
      );
      return;
    }
  // 🔽 STEP 3 — ADD THIS BLOCK EXACTLY HERE
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
  // 🔼 END STEP 3
    try {
      setDownloading(true);

      if (!valuationPayload) {
  setDownloadError("Valuation data not found. Please return to the Gold Calculator and try again.");
  setDownloading(false);
  return;
}
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

  /**
   * STEP 3 — UI
   */
  return (
    <main className="min-h-[80vh] bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4">
            {verified ? <Pill>Purchase complete</Pill> : <Pill>Secure download</Pill>}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            {verified
              ? "Payment confirmed — your PDF is ready"
              : "PDF delivery"}
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            {verifying
              ? "Verifying your purchase…"
              : verified
              ? "Your download is ready. Click below if it didn’t start automatically."
              : "We couldn’t verify this session. If you just paid, try refreshing once."}
          </p>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div>
                <div className="text-base font-semibold">
                  MarketMint Valuation PDF
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Timestamped documentation • Inputs + spot price • Shareable record
                </div>

                <div className="mt-4 text-sm text-slate-300">
                  {verifyResult && "ok" in verifyResult && verifyResult.ok ? (
                    <>
                      Receipt sent to{" "}
                      <span className="font-medium text-slate-100">
                        {verifyResult.email ?? supportEmail}
                      </span>
                    </>
                  ) : (
                    <>
                      Need help? Email{" "}
                      <span className="font-medium text-slate-100">
                        {supportEmail}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  $4.99
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
                  One-time export
                </span>
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
                Refresh / Retry
              </button>
            </div>

            {downloadError && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {downloadError}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="/gold"
              className="rounded-full border border-slate-800 bg-slate-900/40 px-5 py-2.5 text-sm font-semibold"
            >
              Back to Gold Calc
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
