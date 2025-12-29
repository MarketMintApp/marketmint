"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PdfSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    const run = async () => {
      if (!sessionId) {
        setStatus("error");
        return;
      }

      setStatus("loading");
      try {
        // If you already have a verify route, keep using it
        const res = await fetch("/api/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Verification failed");

        // Trigger your PDF download flow here (if you already do)
        // Example: fetch("/api/pdf/valuation", { ... })
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };

    run();
  }, [sessionId]);

  return (
    <main className="min-h-[70vh] mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-slate-50">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-200">
          Purchase complete
        </div>

        <h1 className="mt-4 text-3xl font-semibold">
          Payment confirmed — your PDF is ready
        </h1>

        <p className="mt-2 text-sm text-slate-300">
          {status === "loading" && "Finishing verification and preparing your download..."}
          {status === "ready" && "Your download should start automatically. If not, use the button below."}
          {status === "error" && "We couldn’t verify this session. Try refreshing once, or contact support with your receipt."}
          {status === "idle" && "Preparing..."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            onClick={() => window.location.reload()}
          >
            Download PDF
          </button>

          <button
            className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-50"
            onClick={() => window.location.reload()}
          >
            Regenerate / Retry
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/gold"
            className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-50"
          >
            Back to Gold Calc
          </Link>
          <Link
            href="/value"
            className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-50"
          >
            Go to Workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
