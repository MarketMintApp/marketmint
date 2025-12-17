"use client";

import Link from "next/link";
import { gaEvent } from "../lib/ga";

export default function HomeCtas() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Link
        href="/value"
        onClick={() => gaEvent("start_valuation")}
        className="inline-flex items-center rounded-full bg-emerald-600/90 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
      >
        Start a free valuation
      </Link>

      <Link
        href="/offers"
        onClick={() => gaEvent("view_offers_demo")}
        className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500/70 hover:text-emerald-300"
      >
        Explore the offers demo
      </Link>

      <Link
        href="/login?redirect=/value"
        onClick={() => gaEvent("create_account_click")}
        className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100"
      >
        Create an account
      </Link>
    </div>
  );
}
