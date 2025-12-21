// app/components/HomeCtas.tsx
"use client";

import Link from "next/link";
import { trackEvent } from "../lib/analytics";

type Props = {
  placement?: string;
  className?: string;
};

export default function HomeCtas({ placement = "home_final", className = "" }: Props) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/value"
          onClick={() => trackEvent("start_valuation_click", { placement })}
          className="inline-flex items-center rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Start free valuation
        </Link>

        <Link
          href="/offers"
          onClick={() => trackEvent("offers_demo_click", { placement })}
          className="inline-flex items-center rounded-full border border-emerald-500/60 bg-slate-950 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-slate-900"
        >
          Explore offers demo
        </Link>
      </div>
    </div>
  );
}
