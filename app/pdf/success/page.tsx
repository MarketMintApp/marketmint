"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "../../lib/analytics";

type Status = "verifying" | "generating" | "ready" | "error";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function makeTimestampName() {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `marketmint-valuation-${y}${m}${day}-${hh}${mm}.pdf`;
}

export default function PdfSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = useMemo(() => searchParams.get("session_id") || "", [searchParams]);

  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState<string>("");
  const [downloadReady, setDownloadReady] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>(() => makeTimestampName());
  const [buyerEmail, setBuyerEmail] = useState<string>("");

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function downloadFromBlobUrl(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function runFlow(autoDownload: boolean) {
    if (!sessionId) {
      setStatus("error");
      setError("Missing checkout session.");
      return;
    }

    try {
      setError("");
      setStatus("verifying");

      trackEvent("pdf_success_viewed", { source: "stripe", has_session: true });

      // 1) Verify payment
      const verifyRes = await fetch("/api/stripe/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const verify = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok || !verify?.ok) {
        throw new Error(
          verify?.error || `Payment not verified (${verify?.status || verifyRes.status})`
        );
      }

      // Optional: if your verify route returns email, show it (safe UX)
      if (verify?.customer_email && typeof verify.customer_email === "string") {
        setBuyerEmail(verify.customer_email);
      } else if (verify?.email && typeof verify.email === "string") {
        setBuyerEmail(verify.email);
      }

      // 2) Get valuation payload from sessionStorage
      const raw = sessionStorage.getItem("mm_last_valuation_payload");
      if (!raw) {
        throw new Error(
          "We couldn’t find your valuation details on this device. Please return to Gold Calc and try again."
        );
      }
      const payload = JSON.parse(raw);

      setStatus("generating");

      // 3) Generate PDF
      const pdfRes = await fetch("/api/pdf/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!pdfRes.ok) {
        throw new Error(`PDF generation failed (${pdfRes.status})`);
      }

      const blob = await pdfRes.blob();
      const url = window.URL.createObjectURL(blob);

      // Replace any previous blob URL
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);

      setBlobUrl(url);
      setDownloadReady(true);
      setStatus("ready");

      // Try auto download once (nice), but always provide a manual button
      if (autoDownload) {
        await downloadFromBlobUrl(url);
        trackEvent("pdf_download_started", { source: "success_page_auto" });
      }
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setError(e?.message ?? "Something went wrong");
      trackEvent("pdf_success_error", { message: e?.message ?? "unknown" });
    }
  }

  useEffect(() => {
    // Attempt auto-download once on first load
    runFlow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const headline =
    status === "ready" ? "Payment confirmed — your PDF is ready" : "Finalizing your PDF…";

  const subcopy =
    status === "verifying"
      ? "Verifying payment…"
      : status === "generating"
      ? "Generating your valuation PDF…"
      : status === "ready"
      ? "If your download didn’t start, use the button below."
      : "We hit a snag.";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-14">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Purchase complete
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{headline}</h1>
          <p className="mt-2 text-sm text-slate-300">{subcopy}</p>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">MarketMint Valuation PDF</p>
              <p className="mt-1 text-xs text-slate-400">
                Timestamped documentation • Includes inputs + spot price used • Shareable record
              </p>

              {buyerEmail ? (
                <p className="mt-3 text-xs text-slate-400">
                  Receipt sent to <span className="text-slate-200">{buyerEmail}</span>
                </p>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  You’ll also receive a Stripe receipt at the email you entered.
                </p>
              )}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
              <span className="text-emerald-300">$4.99</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">One-time export</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!downloadReady || !blobUrl || status !== "ready"}
              onClick={async () => {
                if (!blobUrl) return;
                await downloadFromBlobUrl(blobUrl);
                trackEvent("pdf_download_started", { source: "success_page_manual" });
              }}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "ready" ? "Download PDF" : "Preparing…"}
            </button>

            <button
              type="button"
              onClick={() => runFlow(false)}
              className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
            >
              Regenerate / Retry
            </button>
          </div>

          {status === "error" && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-500">
            Need help? Email{" "}
            <span className="text-slate-300">marketmintapp@gmail.com</span> with your receipt.
          </div>
        </div>

        {/* Secondary links */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/gold"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
          >
            Back to Gold Calc
          </Link>
          <Link
            href="/value"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
          >
            Go to Workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
