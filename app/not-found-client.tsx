// app/not-found-client.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

function safeRedirectPath(input: string | null, fallback: string) {
  if (!input) return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//")) return fallback;
  return input;
}

export default function NotFoundClient() {
  const searchParams = useSearchParams();

  // Optional: if you ever pass ?redirect=/somewhere, we’ll use it. Otherwise go home.
  const backTo = useMemo(() => {
    return safeRedirectPath(searchParams.get("redirect"), "/");
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          MarketMint
        </p>

        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
          Page not found
        </h1>

        <p className="mt-3 max-w-md text-sm text-slate-300">
          The page you’re looking for doesn’t exist (or the link is outdated).
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Link
            href={backTo}
            className="inline-flex items-center rounded-full bg-emerald-600/90 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
          >
            Go back
          </Link>

          <Link
            href="/value"
            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 font-medium text-slate-100 hover:bg-slate-800"
          >
            Open Valuation Workspace
          </Link>

          <Link
            href="/items"
            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 font-medium text-slate-100 hover:bg-slate-800"
          >
            My Items
          </Link>
        </div>

        <p className="mt-6 text-[11px] text-slate-500">
          Tip: If this came from a saved link, try starting from the Workspace.
        </p>
      </div>
    </main>
  );
}
