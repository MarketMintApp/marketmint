"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../../lib/supabaseClient";
import { useAuthGuard } from "../../lib/useAuthGuard";
import {
  fetchValuations,
  fetchOffers,
  type ValuationRow,
  type OfferRow,
} from "../../lib/dataLoaders";
import { DEMO_VALUATIONS, DEMO_OFFERS_ALL } from "../../lib/demodata";

/** ---------- Types ---------- */

type OfferWithPct = OfferRow & {
  pctOfMelt: number | null;
  valuation: ValuationRow | null;
};

type StatusFilter = "all" | "pending" | "accepted" | "rejected";
type BuyerFilter = "all" | "jeweler" | "pawn" | "private";
type SortMode = "newest" | "oldest" | "highestAmount" | "highestPct";

const STATUS_LABEL: Record<OfferRow["status"], string> = {
  accepted: "Accepted",
  pending: "Pending",
  rejected: "Rejected",
};

const BUYER_TYPE_LABEL: Record<OfferRow["buyer_type"], string> = {
  jeweler: "Jeweler",
  pawn: "Pawn / cash-for-gold",
  private: "Private buyer",
};

const BUYER_TYPE_ICON: Record<OfferRow["buyer_type"], string> = {
  jeweler: "💎",
  pawn: "🏦",
  private: "👤",
};

const BUYER_TYPE_BADGE_CLASSES: Record<OfferRow["buyer_type"], string> = {
  jeweler:
    "border-emerald-500/60 bg-emerald-500/10 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]",
  pawn:
    "border-amber-400/70 bg-amber-500/10 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]",
  private:
    "border-sky-400/60 bg-sky-500/10 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.28)]",
};

function getStatusChipClass(status: OfferRow["status"]) {
  switch (status) {
    case "accepted":
      return "bg-emerald-900/70 text-emerald-200 border-emerald-500/80";
    case "pending":
      return "bg-amber-900/70 text-amber-100 border-amber-500/80";
    case "rejected":
      return "bg-rose-900/70 text-rose-200 border-rose-500/80";
    default:
      return "bg-slate-900 text-slate-300 border-slate-600";
  }
}

/** ---------- Helpers ---------- */

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value.toFixed(0)}%`;
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMetal(metal: string | null | undefined) {
  if (!metal) return "";
  return metal.charAt(0).toUpperCase() + metal.slice(1).toLowerCase();
}

/** ---------- Component ---------- */

export default function OffersHubPage() {
  const router = useRouter();

  // ✅ Standardized auth guard (handles demo mode + “no session”)
  const { user, authChecked, demoMode, error: authError } = useAuthGuard();

  const [valuations, setValuations] = useState<ValuationRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [buyerFilter, setBuyerFilter] = useState<BuyerFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedOffer, setSelectedOffer] = useState<OfferWithPct | null>(null);
  const [drawerBusy, setDrawerBusy] = useState(false);

  /** 1) Load data (standardized) */
  useEffect(() => {
    if (!authChecked) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (authError) {
          setError(authError);
          return;
        }

        // Demo mode: use demo arrays
        if (demoMode) {
          if (!cancelled) {
            setValuations(DEMO_VALUATIONS as unknown as ValuationRow[]);
            setOffers(DEMO_OFFERS_ALL as unknown as OfferRow[]);
          }
          return;
        }

        if (!user) {
          // logged out with no error → demo mode should be true, but keep safe
          if (!cancelled) {
            setValuations(DEMO_VALUATIONS as unknown as ValuationRow[]);
            setOffers(DEMO_OFFERS_ALL as unknown as OfferRow[]);
          }
          return;
        }

        const [vRows, oRows] = await Promise.all([
          fetchValuations(user.id),
          fetchOffers(user.id),
        ]);

        if (!cancelled) {
          setValuations(vRows || []);
          setOffers(oRows || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("There was an unexpected problem loading your offers.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authChecked, demoMode, user, authError]);

  /** 2) Derived offers with melt % + attached valuation */
  const offersWithPct = useMemo<OfferWithPct[]>(() => {
    if (!offers.length) return [];

    if (!valuations.length) {
      return offers.map((o) => ({
        ...o,
        pctOfMelt: null,
        valuation: null,
      }));
    }

    const valuationMap = new Map<number, ValuationRow>();
    for (const v of valuations) valuationMap.set(v.id, v);

    return offers.map((o) => {
      const v = valuationMap.get(o.valuation_id) ?? null;
      const melt = v?.melt_value ?? null;
      const pct =
        melt && melt > 0 ? Math.round((o.amount / melt) * 100 * 10) / 10 : null;

      return {
        ...o,
        pctOfMelt: pct,
        valuation: v,
      };
    });
  }, [offers, valuations]);

  /** 3) Filters + sorting + search */
  const filteredOffers = useMemo(() => {
    let list = [...offersWithPct];

    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (buyerFilter !== "all") {
      list = list.filter((o) => o.buyer_type === buyerFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((o) => {
        const valuation = o.valuation;
        const metal = valuation?.metal_type ?? "";
        const karat = valuation?.karat ?? "";
        const weight = valuation?.weight_gram?.toString() ?? "";
        const notes = o.notes ?? "";

        return (
          (o.buyer_name || "").toLowerCase().includes(q) ||
          metal.toLowerCase().includes(q) ||
          karat.toLowerCase().includes(q) ||
          weight.includes(q) ||
          notes.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (sortMode === "newest") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sortMode === "oldest") {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      if (sortMode === "highestAmount") {
        return b.amount - a.amount;
      }
      if (sortMode === "highestPct") {
        const ap = a.pctOfMelt ?? 0;
        const bp = b.pctOfMelt ?? 0;
        return bp - ap;
      }
      return 0;
    });

    return list;
  }, [offersWithPct, statusFilter, buyerFilter, sortMode, searchTerm]);

  /** 4) Summary stats */
  const summary = useMemo(() => {
    if (!offersWithPct.length) return null;

    let pendingCount = 0;
    let acceptedCount = 0;
    let totalPct = 0;
    let pctCount = 0;
    let bestPct: number | null = null;

    const buyerTypeStats: Record<
      OfferRow["buyer_type"],
      { offers: number; sumPct: number; pctCount: number }
    > = {
      jeweler: { offers: 0, sumPct: 0, pctCount: 0 },
      pawn: { offers: 0, sumPct: 0, pctCount: 0 },
      private: { offers: 0, sumPct: 0, pctCount: 0 },
    };

    for (const o of offersWithPct) {
      if (o.status === "pending") pendingCount += 1;
      if (o.status === "accepted") acceptedCount += 1;

      const pct = o.pctOfMelt;
      if (pct != null) {
        totalPct += pct;
        pctCount += 1;
        if (bestPct == null || pct > bestPct) bestPct = pct;

        const t = o.buyer_type;
        buyerTypeStats[t].offers += 1;
        buyerTypeStats[t].sumPct += pct;
        buyerTypeStats[t].pctCount += 1;
      }
    }

    const avgPct = pctCount ? totalPct / pctCount : null;

    let bestType: OfferRow["buyer_type"] | null = null;
    let bestTypeAvg = 0;

    (["jeweler", "pawn", "private"] as OfferRow["buyer_type"][]).forEach((t) => {
      const stat = buyerTypeStats[t];
      if (!stat.pctCount) return;
      const avg = stat.sumPct / stat.pctCount;
      if (!bestType || avg > bestTypeAvg) {
        bestType = t;
        bestTypeAvg = avg;
      }
    });

    return {
      totalOffers: offersWithPct.length,
      pendingCount,
      acceptedCount,
      avgPct,
      bestPct,
      bestType,
      bestTypeAvg: bestType ? bestTypeAvg : null,
    };
  }, [offersWithPct]);

  /** 5) Mutations (status + delete) */
  async function updateOfferStatus(offerId: number, status: OfferRow["status"]) {
    if (!user || demoMode) return;

    try {
      setDrawerBusy(true);
      const { error: updateError } = await supabase
        .from("offers")
        .update({ status })
        .eq("id", offerId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating offer:", updateError);
        alert("Could not update this offer. Please try again.");
        return;
      }

      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status } : o))
      );

      setSelectedOffer((prev) =>
        prev && prev.id === offerId ? { ...prev, status } : prev
      );
    } finally {
      setDrawerBusy(false);
    }
  }

  async function deleteOffer(offerId: number) {
    if (!user || demoMode) return;

    const confirmDelete = window.confirm(
      "Delete this offer? This cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      setDrawerBusy(true);
      const { error: deleteError } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerId)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error deleting offer:", deleteError);
        alert("Could not delete this offer. Please try again.");
        return;
      }

      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      setSelectedOffer((prev) => (prev && prev.id === offerId ? null : prev));
    } finally {
      setDrawerBusy(false);
    }
  }

  /** ---------- Render ---------- */

  if (!authChecked && loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <p className="text-sm text-slate-400">
            Checking your session and loading offers…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">
            Offers Hub unavailable
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-6 inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const hasOffers = !!offers.length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* HEADER */}
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                Offers Hub
              </h1>
              <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-200">
                Beta
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              See every quote from jewelers, cash-for-gold shops, and private
              buyers in one place. Sort by offer strength, buyer type, or
              status to decide where to sell.
            </p>

            {demoMode && (
              <p className="mt-2 text-xs text-emerald-300">
                You&apos;re viewing sample offers based on a demo workspace.{" "}
                <Link
                  href="/login?redirect=/offers/hub"
                  className="font-semibold underline underline-offset-2"
                >
                  Create a free account
                </Link>{" "}
                to log and track your own offers and buyers.
              </p>
            )}

            {summary && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="font-medium">
                    {summary.totalOffers} total offer
                    {summary.totalOffers === 1 ? "" : "s"}
                  </span>
                  {summary.pendingCount > 0 && (
                    <span className="text-slate-400">
                      • {summary.pendingCount} pending
                    </span>
                  )}
                  {summary.acceptedCount > 0 && (
                    <span className="text-slate-400">
                      • {summary.acceptedCount} accepted
                    </span>
                  )}
                </div>

                {summary.avgPct != null && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/70 bg-emerald-500/10 px-3 py-1 text-emerald-100">
                    <span className="text-[10px] uppercase tracking-wide opacity-80">
                      Avg offer vs melt
                    </span>
                    <span className="text-sm font-semibold">
                      {formatPercent(summary.avgPct)}
                    </span>
                    {summary.bestPct != null && (
                      <span className="text-slate-300">
                        (best seen: {formatPercent(summary.bestPct)})
                      </span>
                    )}
                  </div>
                )}

                {summary.bestType && summary.bestTypeAvg != null && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-slate-200">
                    <span className="text-[10px] uppercase tracking-wide opacity-80">
                      Strongest category
                    </span>
                    <span className="font-medium">
                      {BUYER_TYPE_LABEL[summary.bestType]}
                    </span>
                    <span className="text-slate-400">
                      ({formatPercent(summary.bestTypeAvg)} avg)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <Link
              href="/items"
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/60 hover:text-emerald-100"
            >
              View items &amp; best offers
            </Link>
            <Link
              href="/offers"
              className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-sm hover:bg-emerald-400"
            >
              Open Offer Inbox
            </Link>
          </div>
        </header>

        {/* CONTROLS */}
        <section className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap gap-2">
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Status</span>
              <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 p-1 text-[11px]">
                {(["all", "pending", "accepted", "rejected"] as StatusFilter[]).map(
                  (val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setStatusFilter(val)}
                      className={`rounded-full px-2.5 py-1 font-medium transition ${
                        statusFilter === val
                          ? "bg-emerald-500 text-slate-950"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {val === "all"
                        ? "All"
                        : val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Buyer filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Buyer</span>
              <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 p-1 text-[11px]">
                {(["all", "jeweler", "pawn", "private"] as BuyerFilter[]).map(
                  (val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBuyerFilter(val)}
                      className={`rounded-full px-2.5 py-1 font-medium transition ${
                        buyerFilter === val
                          ? "bg-slate-100 text-slate-950"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {val === "all" ? "All" : BUYER_TYPE_LABEL[val]}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Sort + search */}
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Sort</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="h-8 rounded-full border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 outline-none focus:border-emerald-400"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highestAmount">Highest amount</option>
                <option value="highestPct">Highest % of melt</option>
              </select>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-full rounded-full border border-slate-700 bg-slate-950 pl-8 pr-3 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 md:w-56"
                placeholder="Search buyer, metal, notes…"
              />
              <span className="pointer-events-none absolute left-2 top-1.5 text-[12px] text-slate-500">
                🔍
              </span>
            </div>
          </div>
        </section>

        {/* LIST / EMPTY STATES */}
        <section className="mt-6 grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                All offers
              </h2>
              <span className="text-[11px] text-slate-400">
                {filteredOffers.length} shown
                {hasOffers && filteredOffers.length !== offers.length
                  ? ` of ${offers.length}`
                  : ""}
              </span>
            </div>

            <div className="mt-3 h-px bg-gradient-to-r from-emerald-500/40 via-slate-700 to-slate-800" />

            {loading && (
              <div className="flex h-40 items-center justify-center">
                <p className="text-xs text-slate-400">
                  Loading offers from your buyers…
                </p>
              </div>
            )}

            {!loading && !hasOffers && (
              <div className="mt-4 space-y-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                <p className="font-medium text-slate-100">
                  No offers logged yet.
                </p>
                <p className="text-xs text-slate-400">
                  Track your quotes here so you can see who&apos;s really
                  paying the best percentage of melt value.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link
                    href="/value"
                    className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 font-medium text-slate-950 hover:bg-emerald-400"
                  >
                    Run a new valuation
                  </Link>
                  <Link
                    href="/offers"
                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-3 py-1 font-medium text-slate-100 hover:border-emerald-400"
                  >
                    Open Offer Inbox
                  </Link>
                </div>
              </div>
            )}

            {!loading && hasOffers && filteredOffers.length === 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-xs text-slate-300">
                <p className="font-medium text-slate-100">
                  No offers match your filters.
                </p>
                <p className="mt-1 text-slate-400">
                  Try resetting the status, buyer type, or search term above.
                </p>
              </div>
            )}

            {!loading && filteredOffers.length > 0 && (
              <div className="mt-3 space-y-2">
                {filteredOffers.map((offer) => {
                  const v = offer.valuation;
                  const metal = formatMetal(v?.metal_type);
                  const melt = v?.melt_value ?? null;
                  const pct = offer.pctOfMelt;

                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => setSelectedOffer(offer)}
                      className="group flex w-full items-stretch justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3 text-left text-xs transition hover:border-emerald-500/60 hover:bg-slate-900"
                    >
                      {/* Left: buyer + status */}
                      <div className="flex flex-1 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-base">
                          {BUYER_TYPE_ICON[offer.buyer_type]}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-100">
                              {offer.buyer_name || "Unnamed buyer"}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                BUYER_TYPE_BADGE_CLASSES[offer.buyer_type]
                              }`}
                            >
                              {BUYER_TYPE_LABEL[offer.buyer_type]}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                            <span>{formatDate(offer.created_at)}</span>
                            {metal && (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-[3px] w-[3px] rounded-full bg-slate-600" />
                                <span>
                                  {metal}
                                  {v?.karat ? ` • ${v.karat}` : ""}
                                  {v?.weight_gram
                                    ? ` • ${v.weight_gram.toFixed(1)} g`
                                    : ""}
                                </span>
                              </span>
                            )}
                            {offer.notes && (
                              <span className="line-clamp-1 text-slate-500">
                                “{offer.notes}”
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: money + status */}
                      <div className="flex flex-col items-end justify-between gap-2">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-emerald-200">
                            {formatCurrency(offer.amount)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {melt != null && melt > 0 ? (
                              <>
                                vs {formatCurrency(melt)} melt •{" "}
                                <span
                                  className={
                                    pct != null && pct >= 80
                                      ? "text-emerald-200"
                                      : pct != null && pct >= 60
                                      ? "text-amber-200"
                                      : "text-rose-200"
                                  }
                                >
                                  {pct != null ? formatPercent(pct) : "—"}
                                </span>
                              </>
                            ) : (
                              "Melt value missing"
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusChipClass(
                              offer.status
                            )}`}
                          >
                            {STATUS_LABEL[offer.status]}
                          </span>
                          <span className="text-[11px] text-slate-500 group-hover:text-emerald-300">
                            Details →
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* DRAWER / DETAILS */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            {!selectedOffer && (
              <div className="flex h-full flex-col justify-center gap-3 text-sm text-slate-300">
                <p className="font-medium text-slate-100">
                  Select an offer to see the full breakdown.
                </p>
                <ul className="space-y-1 text-xs text-slate-400">
                  <li>• Compare buyer types side-by-side.</li>
                  <li>• Mark offers accepted, pending, or rejected.</li>
                  <li>• Use % of melt to anchor your negotiations.</li>
                </ul>
              </div>
            )}

            {selectedOffer && (
              <aside className="flex h-full flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Offer from
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-lg font-semibold text-slate-50">
                          {selectedOffer.buyer_name || "Unnamed buyer"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            BUYER_TYPE_BADGE_CLASSES[selectedOffer.buyer_type]
                          }`}
                        >
                          {BUYER_TYPE_ICON[selectedOffer.buyer_type]}{" "}
                          <span className="ml-1">
                            {BUYER_TYPE_LABEL[selectedOffer.buyer_type]}
                          </span>
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Logged on {formatDate(selectedOffer.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOffer(null)}
                      className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:border-emerald-500 hover:text-emerald-100"
                    >
                      Close
                    </button>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Offer amount
                    </p>
                    <div className="mt-1 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-2xl font-semibold text-emerald-200">
                          {formatCurrency(selectedOffer.amount)}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          Status:{" "}
                          <span className="font-medium text-slate-100">
                            {STATUS_LABEL[selectedOffer.status]}
                          </span>
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-300">
                        {selectedOffer.valuation?.melt_value != null &&
                        selectedOffer.valuation.melt_value > 0 ? (
                          <>
                            <p className="text-[11px] text-slate-400">
                              Melt value:{" "}
                              {formatCurrency(selectedOffer.valuation.melt_value)}
                            </p>
                            <p className="mt-1 text-sm">
                              {selectedOffer.pctOfMelt != null ? (
                                <>
                                  Paying{" "}
                                  <span
                                    className={
                                      selectedOffer.pctOfMelt >= 80
                                        ? "text-emerald-200 font-semibold"
                                        : selectedOffer.pctOfMelt >= 60
                                        ? "text-amber-200 font-semibold"
                                        : "text-rose-200 font-semibold"
                                    }
                                  >
                                    {formatPercent(selectedOffer.pctOfMelt)}
                                  </span>{" "}
                                  of melt
                                </>
                              ) : (
                                "Missing % of melt"
                              )}
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-slate-400">
                            Melt value not available for this item.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedOffer.valuation && (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Underlying item
                      </p>
                      <div className="mt-1 text-xs text-slate-200">
                        <p className="font-medium">
                          {formatMetal(selectedOffer.valuation.metal_type)}{" "}
                          {selectedOffer.valuation.karat &&
                            `• ${selectedOffer.valuation.karat}`}
                        </p>
                        <p className="mt-1 text-slate-400">
                          {selectedOffer.valuation.weight_gram != null
                            ? `${selectedOffer.valuation.weight_gram.toFixed(
                                1
                              )} g • Spot ${formatCurrency(
                                selectedOffer.valuation.spot_price
                              )}`
                            : "No weight recorded"}
                        </p>
                      </div>
                      {selectedOffer.valuation.notes && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Notes: {selectedOffer.valuation.notes}
                        </p>
                      )}
                      <Link
                        href={`/items?focus=${selectedOffer.valuation.id}`}
                        className="mt-3 inline-flex items-center text-[11px] font-medium text-emerald-300 hover:text-emerald-200"
                      >
                        View full item record →
                      </Link>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Status controls
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        disabled={drawerBusy || demoMode}
                        onClick={() =>
                          updateOfferStatus(selectedOffer.id, "accepted")
                        }
                        className={`rounded-full px-3 py-1 font-medium ${
                          selectedOffer.status === "accepted"
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                        } ${demoMode ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        Mark accepted
                      </button>
                      <button
                        type="button"
                        disabled={drawerBusy || demoMode}
                        onClick={() =>
                          updateOfferStatus(selectedOffer.id, "pending")
                        }
                        className={`rounded-full px-3 py-1 font-medium ${
                          selectedOffer.status === "pending"
                            ? "bg-amber-400 text-slate-950"
                            : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                        } ${demoMode ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        Mark pending
                      </button>
                      <button
                        type="button"
                        disabled={drawerBusy || demoMode}
                        onClick={() =>
                          updateOfferStatus(selectedOffer.id, "rejected")
                        }
                        className={`rounded-full px-3 py-1 font-medium ${
                          selectedOffer.status === "rejected"
                            ? "bg-rose-500 text-slate-50"
                            : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                        } ${demoMode ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        Mark rejected
                      </button>
                    </div>

                    {selectedOffer.notes && (
                      <p className="mt-2 text-[11px] text-slate-400">
                        Buyer notes: {selectedOffer.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
                  <button
                    type="button"
                    disabled={drawerBusy || demoMode}
                    onClick={() => deleteOffer(selectedOffer.id)}
                    className={`text-rose-400 hover:text-rose-300 ${
                      demoMode ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    Delete this offer
                  </button>
                  {demoMode && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Demo mode: changes are disabled.
                    </p>
                  )}
                </div>
              </aside>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
