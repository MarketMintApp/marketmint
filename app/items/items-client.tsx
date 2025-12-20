"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../lib/supabaseClient";
import { fetchValuationsAndOffers } from "../lib/dataLoaders";

type ValuationRow = {
  id: number;
  created_at: string;
  metal_type: string | null;
  karat: string | null;
  weight_gram: number | null;
  spot_price: number | null;
  melt_value: number | null;
  notes: string | null;
};

type OfferRow = {
  id: number;
  valuation_id: number;
  buyer_name: string;
  buyer_type: "jeweler" | "pawn" | "private";
  amount: number;
  status: "accepted" | "pending" | "rejected";
  notes: string | null;
  created_at: string;
};

type BestOfferMap = Record<
  number,
  | {
      offer: OfferRow;
      pctOfMelt: number;
    }
  | null
>;

type FilterMode = "all" | "withOffers" | "noOffers" | "accepted";
type SortMode = "newest" | "oldest" | "highestMelt" | "highestOffer";

function formatCurrency(value: number | null | undefined) {
  if (!value && value !== 0) return "—";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(num: number | null | undefined) {
  if (num == null || Number.isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
}

function formatMetal(metal: string | null | undefined) {
  if (!metal) return "";
  return metal.charAt(0).toUpperCase() + metal.slice(1).toLowerCase();
}

// Use same date style as Value / Offers pages
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOfferStatus(status: OfferRow["status"]) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

function getOfferStatusChipClass(status: OfferRow["status"]) {
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

export default function ItemsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");
  const focusedId = focusParam ? Number(focusParam) : null;

  // Auth state
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Data state
  const [valuations, setValuations] = useState<ValuationRow[]>([]);
  const [loadingValuations, setLoadingValuations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bestOffers, setBestOffers] = useState<BestOfferMap>({});
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersByValuation, setOffersByValuation] = useState<
    Record<number, OfferRow[]>
  >({});

  // UI state
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [rowActionLoadingId, setRowActionLoadingId] = useState<number | null>(
    null
  );

  const userId = user?.id ?? null;

  // 1) Check auth on mount
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          if (!cancelled) {
            router.push("/login?redirect=/items");
          }
          return;
        }

        if (!cancelled) {
          setUser(data.user);
        }
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 2) Load valuations + offers (once user is set)
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function loadAll(uid: string) {
      try {
        setLoadingValuations(true);
        setOffersLoading(true);
        setError(null);

        const { valuations: vRows, offers: oRows } =
          await fetchValuationsAndOffers(uid);

        if (cancelled) return;

        setValuations(vRows);

        // Build offersByValuation in one pass (avoids O(n*m) filters)
        const offersMap: Record<number, OfferRow[]> = {};
        for (const o of oRows) {
          if (!o.amount || o.amount <= 0) continue;
          (offersMap[o.valuation_id] ||= []).push(o);
        }

        const bestMap: BestOfferMap = {};

        for (const v of vRows) {
          const melt = v.melt_value ?? 0;
          const offersForVal = offersMap[v.id] ?? [];
          offersMap[v.id] = offersForVal; // ensure key exists

          if (!melt || melt <= 0 || offersForVal.length === 0) {
            bestMap[v.id] = null;
            continue;
          }

          // Best offer = highest $ amount (consistent with Value Workspace)
          let best = offersForVal[0];
          for (const o of offersForVal.slice(1)) {
            if (o.amount > best.amount) best = o;
          }

          const pctOfMelt = (best.amount / melt) * 100;
          bestMap[v.id] = { offer: best, pctOfMelt };
        }

        setOffersByValuation(offersMap);
        setBestOffers(bestMap);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not load your items.");
      } finally {
        if (!cancelled) {
          setLoadingValuations(false);
          setOffersLoading(false);
        }
      }
    }

    loadAll(userId);

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 4) Stats (across all items)
  const stats = useMemo(() => {
    if (valuations.length === 0) {
      return {
        totalMelt: 0,
        totalBestOffers: 0,
        avgBestPct: null as number | null,
        itemsWithAccepted: 0,
      };
    }

    let totalMelt = 0;
    let totalBestOffers = 0;
    let sumPct = 0;
    let countPct = 0;
    let itemsWithAccepted = 0;

    for (const v of valuations) {
      const melt = v.melt_value ?? 0;
      if (melt > 0) totalMelt += melt;

      const best = bestOffers[v.id];
      if (best && melt > 0) {
        totalBestOffers += best.offer.amount;
        sumPct += best.pctOfMelt;
        countPct += 1;
        if (best.offer.status === "accepted") itemsWithAccepted += 1;
      }
    }

    return {
      totalMelt,
      totalBestOffers,
      avgBestPct: countPct > 0 ? sumPct / countPct : null,
      itemsWithAccepted,
    };
  }, [valuations, bestOffers]);

  // 5) Filter + sort for visible rows
  const visibleValuations = useMemo(() => {
    let list = [...valuations];

    // Filter
    list = list.filter((v) => {
      const best = bestOffers[v.id];
      switch (filterMode) {
        case "withOffers":
          return !!best;
        case "noOffers":
          return !best;
        case "accepted":
          return !!best && best.offer.status === "accepted";
        case "all":
        default:
          return true;
      }
    });

    // Sort
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
      if (sortMode === "highestMelt") {
        const am = a.melt_value ?? 0;
        const bm = b.melt_value ?? 0;
        return bm - am;
      }
      if (sortMode === "highestOffer") {
        const aBest = bestOffers[a.id];
        const bBest = bestOffers[b.id];
        const aAmt = aBest?.offer.amount ?? 0;
        const bAmt = bBest?.offer.amount ?? 0;
        return bAmt - aAmt;
      }
      return 0;
    });

    return list;
  }, [valuations, bestOffers, filterMode, sortMode]);

  // 6) Row actions (duplicate / delete)
  async function handleDuplicateValuation(v: ValuationRow) {
    if (!userId) return;

    try {
      setRowActionLoadingId(v.id);
      setOpenMenuId(null);

      const { data, error } = await supabase
        .from("valuations")
        .insert({
          user_id: userId,
          metal_type: v.metal_type,
          karat: v.karat,
          weight_gram: v.weight_gram,
          spot_price: v.spot_price,
          melt_value: v.melt_value,
          notes: v.notes,
        })
        .select()
        .single();

      if (error) {
        console.error("Error duplicating valuation:", error);
        window.alert("Could not duplicate this item.");
        return;
      }

      setValuations((prev) => [data as ValuationRow, ...prev]);
    } finally {
      setRowActionLoadingId(null);
    }
  }

  async function handleDeleteValuation(id: number) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Delete this item and all of its offers? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      setRowActionLoadingId(id);
      setOpenMenuId(null);

      // delete offers first
      const { error: offersError } = await supabase
        .from("offers")
        .delete()
        .eq("user_id", userId)
        .eq("valuation_id", id);

      if (offersError) {
        console.error("Error deleting offers for valuation:", offersError);
      }

      const { error: valError } = await supabase
        .from("valuations")
        .delete()
        .eq("user_id", userId)
        .eq("id", id);

      if (valError) {
        console.error("Error deleting valuation:", valError);
        window.alert("Could not delete this item.");
        return;
      }

      setValuations((prev) => prev.filter((v) => v.id !== id));
      setBestOffers((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setOffersByValuation((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      if (expandedId === id) setExpandedId(null);
    } finally {
      setRowActionLoadingId(null);
    }
  }

  // 7) Scroll to focused row when coming from /value?focus=
  useEffect(() => {
    if (!focusedId) return;
    const el = document.querySelector<HTMLElement>(
      `[data-valuation-id="${focusedId}"]`
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedId, visibleValuations.length]);

  // 8) Rendering
  if (authChecking) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <p className="text-sm text-slate-300">Checking your session…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              My Items
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl">
              This is your inventory of saved valuations. Scan melt value and
              best offers at a glance, then jump into the workspace or Offers
              Hub when you want more detail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/value"
              className="inline-flex items-center rounded-full bg-emerald-600/90 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              + New gold valuation
            </Link>
            <Link
              href="/offers/hub"
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Open Offers Hub
            </Link>
          </div>
        </header>

        {/* Summary tiles */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
            <p className="text-xs text-slate-400">Total melt value</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCurrency(stats.totalMelt)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Sum of melt across all items in My Items.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
            <p className="text-xs text-slate-400">Total of best offers</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCurrency(stats.totalBestOffers)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Adding up the strongest offer you&apos;ve logged for each item.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
            <p className="text-xs text-slate-400">
              Average best offer (% of melt)
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatPercent(stats.avgBestPct)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Quick sense of how your buyers are pricing you overall.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
            <p className="text-xs text-slate-400">
              Items with accepted offers
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {stats.itemsWithAccepted}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Deals you&apos;ve already locked in.
            </p>
          </div>
        </section>

        {/* Filters + sort */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`rounded-full px-3 py-1 font-medium ${
                filterMode === "all"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-slate-200 border border-slate-700 hover:border-emerald-500/70"
              }`}
            >
              All items
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("withOffers")}
              className={`rounded-full px-3 py-1 font-medium ${
                filterMode === "withOffers"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-slate-200 border border-slate-700 hover:border-emerald-500/70"
              }`}
            >
              With offers
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("noOffers")}
              className={`rounded-full px-3 py-1 font-medium ${
                filterMode === "noOffers"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-slate-200 border border-slate-700 hover:border-emerald-500/70"
              }`}
            >
              No offers yet
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("accepted")}
              className={`rounded-full px-3 py-1 font-medium ${
                filterMode === "accepted"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-slate-200 border border-slate-700 hover:border-emerald-500/70"
              }`}
            >
              Accepted offer
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Sort by</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highestMelt">Highest melt value</option>
              <option value="highestOffer">Highest best offer</option>
            </select>
          </div>
        </section>

        {/* Items table + sliders */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Inventory</h2>
              <p className="mt-1 text-xs text-slate-400">
                Click any row to see its offer history and timeline.
              </p>
            </div>
            {offersLoading && (
              <p className="text-xs text-slate-500">Updating best offers…</p>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-rose-400">
              {error} Try refreshing the page.
            </p>
          )}

          {loadingValuations ? (
            <p className="mt-4 text-sm text-slate-500">Loading items…</p>
          ) : visibleValuations.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No items yet. Head to the{" "}
              <Link
                href="/value"
                className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
              >
                Valuation Workspace
              </Link>{" "}
              to create your first melt valuation and start building your
              inventory.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
              {/* header */}
              <div className="grid grid-cols-[2.2fr,1fr,1fr,1.4fr,1.4fr] gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300">
                <div>Item</div>
                <div className="text-right">Melt value</div>
                <div className="text-right">Best offer</div>
                <div className="text-right">% of melt / Status</div>
                <div className="text-right">Actions</div>
              </div>

              {visibleValuations.map((v) => {
                const best = bestOffers[v.id] ?? null;
                const melt = v.melt_value ?? 0;
                const offersForVal = offersByValuation[v.id] ?? [];

                let statusLabel = "No offers logged yet";
                let statusClass = "bg-slate-900 text-slate-300 border-slate-600";

                if (best) {
                  if (best.offer.status === "accepted") {
                    statusLabel = "Accepted offer";
                    statusClass =
                      "bg-emerald-900/70 text-emerald-200 border-emerald-600/80";
                  } else if (best.offer.status === "pending") {
                    statusLabel = "Offers in progress";
                    statusClass =
                      "bg-amber-900/70 text-amber-200 border-amber-600/80";
                  } else if (best.offer.status === "rejected") {
                    statusLabel = "All logged offers rejected";
                    statusClass =
                      "bg-rose-900/70 text-rose-200 border-rose-600/80";
                  }
                }

                const isExpanded = expandedId === v.id;
                const isRowBusy = rowActionLoadingId === v.id;
                const isFocused = focusedId === v.id;

                return (
                  <div
                    key={v.id}
                    data-valuation-id={v.id}
                    className={`grid grid-cols-[2.2fr,1fr,1fr,1.4fr,1.4fr] gap-2 border-t border-slate-900 px-4 text-xs text-slate-200 cursor-pointer transition-colors ${
                      isFocused
                        ? "bg-slate-900/90 ring-1 ring-emerald-500/60"
                        : "bg-transparent hover:bg-slate-900/80"
                    }`}
                    onClick={() =>
                      setExpandedId((current) =>
                        current === v.id ? null : v.id
                      )
                    }
                  >
                    {/* Row main content */}
                    <div className="py-3">
                      <p className="text-sm font-medium">
                        {formatMetal(v.metal_type) || "Gold"} • {v.karat ?? "—"}K
                        • {v.weight_gram ?? "—"} g
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Saved {formatDate(v.created_at)}
                      </p>
                      {v.notes && (
                        <p className="mt-[2px] text-[11px] text-slate-500">
                          “{v.notes}”
                        </p>
                      )}
                    </div>

                    {/* Melt */}
                    <div className="py-3 text-right text-sm">
                      {formatCurrency(v.melt_value)}
                    </div>

                    {/* Best offer amount */}
                    <div className="py-3 text-right text-sm">
                      {best ? formatCurrency(best.offer.amount) : "—"}
                    </div>

                    {/* % of melt + status */}
                    <div className="py-3 text-right space-y-1">
                      <p className="text-[11px] text-slate-100">
                        {best && melt > 0 ? formatPercent(best.pctOfMelt) : "—"}
                      </p>
                      <span
                        className={`inline-flex items-center justify-end rounded-full border px-2 py-[2px] text-[11px] ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* Actions + menu */}
                    <div className="relative py-3 text-right space-y-1">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Link
                          href={`/value?valuationId=${v.id}`}
                          className="inline-flex items-center rounded-full bg-slate-800 px-3 py-[3px] text-[11px] font-medium text-slate-100 hover:bg-slate-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View in workspace
                        </Link>
                        <Link
                          href={`/offers?valuationId=${v.id}`}
                          className="inline-flex items-center rounded-full bg-emerald-600/90 px-3 py-[3px] text-[11px] font-medium text-white hover:bg-emerald-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Get offers
                        </Link>
                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((current) =>
                              current === v.id ? null : v.id
                            );
                          }}
                          className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[16px] leading-none text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                          aria-label="Open item actions"
                        >
                          ⋯
                        </button>
                      </div>

                      {openMenuId === v.id && (
                        <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-slate-800 bg-slate-950/95 p-1 text-left text-[11px] shadow-lg">
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateValuation(v);
                            }}
                            className="block w-full rounded-md px-2 py-1 text-slate-100 hover:bg-slate-800 disabled:opacity-60"
                          >
                            {isRowBusy ? "Working…" : "Duplicate item"}
                          </button>
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteValuation(v.id);
                            }}
                            className="mt-[2px] block w-full rounded-md px-2 py-1 text-rose-300 hover:bg-rose-900/40 disabled:opacity-60"
                          >
                            Delete item
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expandable slider / offers timeline */}
                    <div
                      className={`col-span-5 overflow-hidden border-t border-slate-800/80 bg-slate-950/80 transition-all duration-300 ease-out ${
                        isExpanded
                          ? "max-h-64 py-3 opacity-100"
                          : "max-h-0 py-0 opacity-0"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {offersForVal.length > 0 ? (
                        <div className="space-y-2 text-[11px] text-slate-300">
                          <p className="font-semibold text-slate-200">
                            Offers for this item
                          </p>

                          {/* mini-table header */}
                          <div className="grid grid-cols-[minmax(0,1.4fr),minmax(0,1fr),minmax(0,1fr),minmax(0,1fr)] gap-2 text-[10px] text-slate-400">
                            <span>Buyer</span>
                            <span className="text-right">Amount</span>
                            <span className="text-right">% of melt</span>
                            <span className="text-right">Status / Date</span>
                          </div>

                          {[...offersForVal]
                            .sort(
                              (a, b) =>
                                new Date(b.created_at).getTime() -
                                new Date(a.created_at).getTime()
                            )
                            .map((o) => {
                              const pct =
                                melt > 0 ? (o.amount / melt) * 100 : null;
                              const isBest = best && best.offer.id === o.id;
                              const chipClass = getOfferStatusChipClass(
                                o.status
                              );

                              return (
                                <div
                                  key={o.id}
                                  className={`grid grid-cols-[minmax(0,1.4fr),minmax(0,1fr),minmax(0,1fr),minmax(0,1fr)] gap-2 rounded-lg px-1 py-1 ${
                                    isBest
                                      ? "bg-emerald-900/20 border border-emerald-700/60"
                                      : ""
                                  }`}
                                >
                                  {/* Buyer + type */}
                                  <div className="truncate">
                                    <span className="font-medium">
                                      {o.buyer_name || "Unnamed buyer"}
                                    </span>
                                    <span className="ml-1 text-slate-500">
                                      • {o.buyer_type}
                                    </span>
                                  </div>

                                  {/* Amount + best badge */}
                                  <div className="text-right">
                                    <span>{formatCurrency(o.amount)}</span>
                                    {isBest && (
                                      <span className="ml-2 inline-flex items-center rounded-full border border-emerald-500/80 bg-emerald-900/80 px-2 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-emerald-100">
                                        Best offer
                                      </span>
                                    )}
                                  </div>

                                  {/* % of melt */}
                                  <div className="text-right">
                                    {pct != null ? formatPercent(pct) : "—"}
                                  </div>

                                  {/* Status + date */}
                                  <div className="text-right space-y-0.5">
                                    <span
                                      className={`inline-flex items-center justify-end rounded-full border px-2 py-[1px] text-[10px] ${chipClass}`}
                                    >
                                      {formatOfferStatus(o.status)}
                                    </span>
                                    <p className="text-[10px] text-slate-500">
                                      {formatDate(o.created_at)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          No offers logged yet. Use{" "}
                          <span className="font-medium">Get offers</span> to
                          start tracking buyer quotes for this item.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
