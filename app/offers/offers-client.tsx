// app/offers/offers-client.tsx
"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import { gaEvent } from "../lib/ga";
import { supabase } from "../lib/supabaseClient";
import { useAuthGuard } from "../lib/useAuthGuard";
import {
  fetchValuations,
  fetchOffersForValuation,
  type ValuationRow,
  type OfferRow,
} from "../lib/dataLoaders";
import { DEMO_VALUATIONS, DEMO_OFFERS_ALL } from "../lib/demodata";

type BuyerFilterState = {
  jeweler: boolean;
  pawn: boolean;
  privateBuyer: boolean;
};

const BUYER_TYPE_LABEL: Record<OfferRow["buyer_type"], string> = {
  jeweler: "Jeweler",
  pawn: "Pawn / cash-for-gold",
  private: "Private buyer",
};

/** ---------- SMALL HELPERS ---------- */

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(0)}%`;
}

function formatMetal(metal: string | null | undefined) {
  if (!metal) return "";
  const lower = metal.toLowerCase();
  if (lower === "gold") return "Gold";
  if (lower === "silver") return "Silver";
  if (lower === "platinum") return "Platinum";
  return metal.charAt(0).toUpperCase() + metal.slice(1);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function pickBestOfferByAmount(list: OfferRow[]) {
  const valid = list.filter((o) => Number.isFinite(o.amount) && o.amount > 0);
  if (!valid.length) return null;
  return valid.reduce((best, cur) => (cur.amount > best.amount ? cur : best));
}

/** ---------- CLIENT PAGE COMPONENT ---------- */

export default function OffersClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const valuationIdParam = searchParams.get("valuationId") ?? undefined;

  // Centralized auth logic (demo vs real)
  const { user, authChecked, demoMode, error: authError } = useAuthGuard();

  // Data state
  const [allValuations, setAllValuations] = useState<ValuationRow[]>([]);
  const [valuation, setValuation] = useState<ValuationRow | null>(null);

  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loadingValuations, setLoadingValuations] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [valuationsError, setValuationsError] = useState<string | null>(null);
  const [offersError, setOffersError] = useState<string | null>(null);

  // UI state
  const [buyerFilters, setBuyerFilters] = useState<BuyerFilterState>({
    jeweler: true,
    pawn: true,
    privateBuyer: true,
  });

  const [userOfferForSummary, setUserOfferForSummary] = useState<string>("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  // New offer form state
  const [newBuyerName, setNewBuyerName] = useState("");
  const [newBuyerType, setNewBuyerType] = useState<"jeweler" | "pawn" | "private">("jeweler");
  const [newAmount, setNewAmount] = useState("");
  const [newStatus, setNewStatus] = useState<"pending" | "accepted" | "rejected">("pending");
  const [newNotes, setNewNotes] = useState("");
  const [newOfferError, setNewOfferError] = useState<string | null>(null);
  const [updatingOfferId, setUpdatingOfferId] = useState<number | null>(null);
  const [expandedOfferId, setExpandedOfferId] = useState<number | null>(null);

  const meltValue = valuation?.melt_value ?? null;

  // GA param helper (keeps naming consistent + revenue-oriented)
  function gaBaseParams() {
    return {
      valuation_id: valuation?.id ?? null,
      metal_type: valuation?.metal_type ?? null,
      karat: valuation?.karat ?? null,
      weight_gram: valuation?.weight_gram ?? null,
      melt_value: valuation?.melt_value ?? null,
    };
  }

  /** 1) Load valuations list + choose selected valuation (demo OR real) */
  useEffect(() => {
    if (!authChecked) return;

    let cancelled = false;

    async function loadValuationsList() {
      setValuationsError(null);
      setOffersError(null);

      // Auth error takes precedence
      if (authError) {
        setValuationsError(authError);
        return;
      }

      // DEMO MODE
      if (demoMode) {
        const demoVals = (DEMO_VALUATIONS as unknown as ValuationRow[]) ?? [];
        setAllValuations(demoVals);

        let selected: ValuationRow | null = null;
        if (valuationIdParam) {
          const match = demoVals.find((v) => v.id.toString() === valuationIdParam);
          if (match) selected = match;
        }
        if (!selected) selected = demoVals[0] ?? null;

        setValuation(selected);
        setExpandedOfferId(null);

        // Offers will load in effect #2 (from DEMO_OFFERS_ALL)
        return;
      }

      // REAL MODE
      if (!user) {
        // Shouldn't happen because demoMode would be true, but safe fallback
        setAllValuations([]);
        setValuation(null);
        return;
      }

      try {
        setLoadingValuations(true);

        const vals = await fetchValuations(user.id);
        if (cancelled) return;

        setAllValuations(vals);

        let selected: ValuationRow | null = null;
        if (valuationIdParam) {
          const match = vals.find((v) => v.id.toString() === valuationIdParam);
          if (match) selected = match;
        }
        if (!selected) selected = vals[0] ?? null;

        setValuation(selected);
        setExpandedOfferId(null);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setValuationsError("Could not load your items.");
          setAllValuations([]);
          setValuation(null);
        }
      } finally {
        if (!cancelled) setLoadingValuations(false);
      }
    }

    loadValuationsList();

    return () => {
      cancelled = true;
    };
  }, [authChecked, demoMode, user, authError, valuationIdParam]);

  /** 2) Load offers for selected valuation (demo OR real) */
  useEffect(() => {
    if (!authChecked) return;

    let cancelled = false;

    async function loadOffersForSelected() {
      setOffersError(null);
      setOffers([]);

      if (!valuation?.id) return;

      // DEMO MODE
      if (demoMode) {
        const allDemoOffers = (DEMO_OFFERS_ALL as unknown as OfferRow[]) ?? [];
        const rows = allDemoOffers
          .filter((o) => o.valuation_id === valuation.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOffers(rows);
        return;
      }

      // REAL MODE
      if (!user) return;

      try {
        setLoadingOffers(true);
        const rows = await fetchOffersForValuation(user.id, valuation.id);
        if (cancelled) return;
        setOffers(rows);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setOffersError("Could not load offers for this item.");
        }
      } finally {
        if (!cancelled) setLoadingOffers(false);
      }
    }

    loadOffersForSelected();

    return () => {
      cancelled = true;
    };
  }, [authChecked, demoMode, user, valuation?.id]);

  /** 3) Keep URL in sync when user selects a valuation */
  function handleSelectValuation(idStr: string) {
    const id = Number(idStr);
    if (!Number.isFinite(id)) return;

    const match = allValuations.find((v) => v.id === id);
    if (!match) return;

    setValuation(match);
    setExpandedOfferId(null);

    const params = new URLSearchParams(searchParams.toString());
    params.set("valuationId", id.toString());
    router.replace(`/offers?${params.toString()}`);
  }

  /** 4) Filtered offers for inbox view */
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      if (offer.buyer_type === "jeweler" && !buyerFilters.jeweler) return false;
      if (offer.buyer_type === "pawn" && !buyerFilters.pawn) return false;
      if (offer.buyer_type === "private" && !buyerFilters.privateBuyer) return false;
      return true;
    });
  }, [offers, buyerFilters]);

  /** 5) Best offer insights — BEST BY $ AMOUNT */
  const offerInsights = useMemo(() => {
    if (!meltValue || meltValue <= 0) return null;
    if (!offers.length) return null;

    const bestOverall = pickBestOfferByAmount(offers);
    if (!bestOverall) return null;

    const validOffers = offers.filter((o) => Number.isFinite(o.amount) && o.amount > 0);

    const pctList = validOffers.map((o) => (o.amount / meltValue) * 100);
    const minPct = Math.min(...pctList);
    const maxPct = Math.max(...pctList);
    const avgAll = pctList.reduce((acc, v) => acc + v, 0) / (pctList.length || 1);

    const bestPct = (bestOverall.amount / meltValue) * 100;
    const pctSpread = maxPct - minPct;

    const typeStats: Record<OfferRow["buyer_type"], { offers: number; sumPct: number; maxPct: number }> = {
      jeweler: { offers: 0, sumPct: 0, maxPct: 0 },
      pawn: { offers: 0, sumPct: 0, maxPct: 0 },
      private: { offers: 0, sumPct: 0, maxPct: 0 },
    };

    for (const o of validOffers) {
      const pct = (o.amount / meltValue) * 100;
      const t = o.buyer_type;
      typeStats[t].offers += 1;
      typeStats[t].sumPct += pct;
      if (pct > typeStats[t].maxPct) typeStats[t].maxPct = pct;
    }

    const typeAverages: Record<OfferRow["buyer_type"], number | null> = {
      jeweler: typeStats.jeweler.offers > 0 ? typeStats.jeweler.sumPct / typeStats.jeweler.offers : null,
      pawn: typeStats.pawn.offers > 0 ? typeStats.pawn.sumPct / typeStats.pawn.offers : null,
      private: typeStats.private.offers > 0 ? typeStats.private.sumPct / typeStats.private.offers : null,
    };

    let coachHeadline = "";
    let coachDetail = "";

    if (bestPct >= 97) {
      coachHeadline = "You already have an A+ offer on the table.";
      coachDetail =
        "This is very close to full melt. Most sellers would take this unless the piece has strong retail or designer premium.";
    } else if (bestPct >= 93) {
      coachHeadline = "You have a strong mid-90s offer.";
      coachDetail =
        "This is solid. You can try for a small bump, but you’re already in the zone where a clean, fast deal makes sense.";
    } else if (bestPct >= 85) {
      coachHeadline = "Decent offers, but there’s likely still upside.";
      coachDetail =
        "Good jewelers often land in the high-80s to mid-90s for straightforward gold. Getting a few more quotes could move you up meaningfully.";
    } else if (bestPct >= 75) {
      coachHeadline = "Offers are a bit light compared to melt.";
      coachDetail =
        "This is typical pawn / bulk pricing. Treat these as baseline numbers and keep shopping, especially with reputable local jewelers.";
    } else {
      coachHeadline = "Classic lowball territory.";
      coachDetail =
        "These numbers are more like ‘we hope you don’t know the melt value.’ Use MarketMint to anchor higher and be ready to walk away.";
    }

    return {
      bestOverall,
      bestPct,
      avgAll,
      pctSpread,
      typeAverages,
      typeStats,
      coachHeadline,
      coachDetail,
    };
  }, [offers, meltValue]);

  /** 6) Shareable summary text (best offer by $) */
  const summaryText = useMemo(() => {
    if (!valuation) {
      return "No valuation selected yet. Go back to the Valuation Workspace to create one.";
    }

    const lines: string[] = [];

    const metal = formatMetal(valuation.metal_type) || "Gold";
    const karat = valuation.karat ?? "—";
    const weight = valuation.weight_gram ?? "—";
    const melt = formatCurrency(valuation.melt_value);
    const notes = valuation.notes?.trim();

    lines.push("Gold Valuation Summary");
    lines.push(`${metal} • ${karat}K • ${weight} g (${formatDate(valuation.created_at)})`);
    lines.push(`Estimated melt value: ${melt}`);

    if (userOfferForSummary.trim() !== "") {
      const offerNum = Number(userOfferForSummary);
      if (Number.isFinite(offerNum) && meltValue && meltValue > 0) {
        const pct = (offerNum / meltValue) * 100;
        lines.push(`Offer on the table: ${formatCurrency(offerNum)} (~${pct.toFixed(0)}% of melt value)`);
      } else if (Number.isFinite(offerNum)) {
        lines.push(`Offer on the table: ${formatCurrency(offerNum)}`);
      }
    }

    if (notes) {
      lines.push("");
      lines.push(`Item notes: ${notes}`);
    }

    if (offers.length > 0 && meltValue && meltValue > 0) {
      const best = pickBestOfferByAmount(offers);
      if (best) {
        const pct = (best.amount / meltValue) * 100;
        lines.push("");
        lines.push(
          `Best recorded offer so far: ${formatCurrency(best.amount)} (~${pct.toFixed(0)}% of melt value) from ${
            best.buyer_name || BUYER_TYPE_LABEL[best.buyer_type]
          }.`
        );
      }
    }

    lines.push("");
    lines.push("Looking for competitive offers from serious buyers. Please include your best price and how quickly you can pay.");

    return lines.join("\n");
  }, [valuation, userOfferForSummary, meltValue, offers]);

  /** 7) UI handlers */

  function handleToggleBuyer(type: keyof BuyerFilterState) {
    setBuyerFilters((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  }

  async function handleNewOfferSubmit(e: FormEvent) {
    e.preventDefault();
    setNewOfferError(null);

    if (!valuation) {
      setNewOfferError("No valuation selected.");
      return;
    }

    if (!newBuyerName.trim()) {
      setNewOfferError("Please enter a buyer name.");
      return;
    }

    const amountNum = Number(newAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setNewOfferError("Enter a valid offer amount.");
      return;
    }

    // Demo mode: mutate local list only
    if (demoMode) {
      const newDemoOffer: OfferRow = {
        id: Date.now(),
        valuation_id: valuation.id,
        user_id: null,
        buyer_name: newBuyerName.trim(),
        buyer_type: newBuyerType,
        amount: Math.round(amountNum),
        status: newStatus,
        notes: newNotes.trim() || null,
        created_at: new Date().toISOString(),
      };

      setOffers((prev) => [newDemoOffer, ...prev]);

      // GA: offer added
      gaEvent("offer_added", {
        ...gaBaseParams(),
        offer_id: newDemoOffer.id,
        buyer_type: newBuyerType,
        buyer_name: newBuyerName.trim(),
        status: newStatus,
        amount: Math.round(amountNum),
        value: Math.round(amountNum),
        currency: "USD",
        demo_mode: true,
      });

      // GA: offer accepted (only if this new offer is created as accepted)
      if (newStatus === "accepted") {
        gaEvent("offer_accepted", {
          ...gaBaseParams(),
          offer_id: newDemoOffer.id,
          buyer_type: newBuyerType,
          buyer_name: newBuyerName.trim(),
          amount: Math.round(amountNum),
          value: Math.round(amountNum),
          currency: "USD",
          demo_mode: true,
        });
      }

      setNewBuyerName("");
      setNewAmount("");
      setNewNotes("");
      setNewStatus("pending");
      setNewBuyerType("jeweler");
      return;
    }

    if (!user) {
      setNewOfferError("You need to be logged in to add offers.");
      return;
    }

    try {
      setUpdatingOfferId(-1);

      const { data, error } = await supabase
        .from("offers")
        .insert({
          valuation_id: valuation.id,
          user_id: user.id,
          buyer_name: newBuyerName.trim(),
          buyer_type: newBuyerType,
          amount: Math.round(amountNum),
          status: newStatus,
          notes: newNotes.trim() || null,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Error inserting offer:", error);
        setNewOfferError("Could not save this offer.");
        return;
      }

      setOffers((prev) => [data as OfferRow, ...prev]);

      // GA: offer added
      gaEvent("offer_added", {
        ...gaBaseParams(),
        offer_id: (data as OfferRow)?.id ?? null,
        buyer_type: newBuyerType,
        buyer_name: newBuyerName.trim(),
        status: newStatus,
        amount: Math.round(amountNum),
        value: Math.round(amountNum),
        currency: "USD",
        demo_mode: false,
      });

      // GA: offer accepted (only if created as accepted)
      if (newStatus === "accepted") {
        gaEvent("offer_accepted", {
          ...gaBaseParams(),
          offer_id: (data as OfferRow)?.id ?? null,
          buyer_type: newBuyerType,
          buyer_name: newBuyerName.trim(),
          amount: Math.round(amountNum),
          value: Math.round(amountNum),
          currency: "USD",
          demo_mode: false,
        });
      }

      setNewBuyerName("");
      setNewAmount("");
      setNewNotes("");
      setNewStatus("pending");
      setNewBuyerType("jeweler");
    } catch (err) {
      console.error("Unexpected error saving offer:", err);
      setNewOfferError("There was a problem saving this offer.");
    } finally {
      setUpdatingOfferId(null);
    }
  }

  async function handleUpdateOfferStatus(offerId: number, newStatusValue: OfferRow["status"]) {
    const current = offers.find((o) => o.id === offerId);
    const wasAccepted = current?.status === "accepted";

    if (demoMode) {
      setOffers((prev) => prev.map((offer) => (offer.id === offerId ? { ...offer, status: newStatusValue } : offer)));

      // GA: offer accepted only when transitioning into accepted
      if (!wasAccepted && newStatusValue === "accepted" && current) {
        gaEvent("offer_accepted", {
          ...gaBaseParams(),
          offer_id: current.id,
          buyer_type: current.buyer_type,
          buyer_name: current.buyer_name ?? null,
          amount: current.amount,
          value: current.amount,
          currency: "USD",
          demo_mode: true,
        });
      }

      return;
    }

    if (!user) return;

    try {
      setUpdatingOfferId(offerId);

      const { error } = await supabase
        .from("offers")
        .update({ status: newStatusValue })
        .eq("id", offerId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating offer:", error);
        setNewOfferError("Could not update this offer.");
        return;
      }

      setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: newStatusValue } : o)));

      // GA: offer accepted only when transitioning into accepted
      if (!wasAccepted && newStatusValue === "accepted" && current) {
        gaEvent("offer_accepted", {
          ...gaBaseParams(),
          offer_id: current.id,
          buyer_type: current.buyer_type,
          buyer_name: current.buyer_name ?? null,
          amount: current.amount,
          value: current.amount,
          currency: "USD",
          demo_mode: false,
        });
      }
    } finally {
      setUpdatingOfferId(null);
    }
  }

  async function handleDeleteOffer(offerId: number) {
    const ok = window.confirm("Delete this offer? This can’t be undone.");
    if (!ok) return;

    if (demoMode) {
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      if (expandedOfferId === offerId) setExpandedOfferId(null);
      return;
    }

    if (!user) return;

    try {
      setUpdatingOfferId(offerId);

      const { error } = await supabase.from("offers").delete().eq("id", offerId).eq("user_id", user.id);

      if (error) {
        console.error("Error deleting offer:", error);
        setNewOfferError("Could not delete this offer.");
        return;
      }

      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      if (expandedOfferId === offerId) setExpandedOfferId(null);
    } finally {
      setUpdatingOfferId(null);
    }
  }

  function handleCopySummary() {
    if (!summaryText) return;
    navigator.clipboard
      .writeText(summaryText)
      .then(() => {
        setCopyMessage("Summary copied to clipboard.");
        setTimeout(() => setCopyMessage(null), 2500);
      })
      .catch(() => {
        setCopyMessage("Could not copy. Try selecting text manually.");
        setTimeout(() => setCopyMessage(null), 2500);
      });
  }

  /** ---------- RENDER ---------- */

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <p className="text-sm text-slate-400">Checking your session…</p>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">Offer Inbox unavailable</h1>
          <p className="mt-3 max-w-md text-sm text-slate-400">{authError}</p>
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

  const meltDisplay = meltValue != null ? formatCurrency(meltValue) : "—";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Offer Inbox</h1>
            <p className="mt-2 text-base text-slate-300">
              Log and track quotes from pawn shops, jewelers, and private buyers in one place. Share clean summaries and see everything in one inbox.
            </p>
            {demoMode && (
              <p className="mt-2 text-xs text-emerald-300">
                You&apos;re viewing sample data.{" "}
                <Link href="/login?redirect=/offers" className="underline underline-offset-2 font-semibold">
                  Create a free account
                </Link>{" "}
                to track your own items, offers, and buyers.
              </p>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 text-xs">
            <Link
              href="/value"
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-100 hover:border-emerald-500 hover:text-emerald-100"
            >
              ← Back to Workspace
            </Link>
            <Link
              href="/offers/hub"
              className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1.5 font-semibold text-slate-950 shadow hover:bg-emerald-400"
            >
              Open Offers Hub
            </Link>
          </div>
        </header>

        {/* Selected valuation overview */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Selected item</h2>
              {loadingValuations && <p className="mt-1 text-xs text-slate-400">Loading your items…</p>}
              {valuationsError && <p className="mt-1 text-xs text-red-400">{valuationsError}</p>}
            </div>

            <div className="flex flex-col items-end gap-2">
              {allValuations.length > 1 && (
                <select
                  value={valuation?.id?.toString() ?? ""}
                  onChange={(e) => handleSelectValuation(e.target.value)}
                  className="h-8 max-w-xs rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
                >
                  {allValuations.map((v) => (
                    <option key={v.id} value={v.id}>
                      {formatMetal(v.metal_type) || "Gold"} • {v.karat ?? "—"}K • {v.weight_gram ?? "—"} g
                    </option>
                  ))}
                </select>
              )}
              {valuation && <p className="text-xs text-slate-400">Created {formatDate(valuation.created_at)}</p>}
            </div>
          </div>

          {valuation ? (
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Metal &amp; karat</p>
                <p className="text-sm font-medium text-slate-100">
                  {formatMetal(valuation.metal_type) || "Gold"}{" "}
                  {valuation.karat && <span className="text-slate-300">• {valuation.karat}K</span>}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Weight</p>
                <p className="text-sm font-medium text-slate-100">
                  {valuation.weight_gram != null ? `${valuation.weight_gram.toFixed(1)} g` : "—"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Estimated melt value</p>
                <p className="text-sm font-semibold text-emerald-300">{meltDisplay}</p>
                <p className="text-[11px] text-slate-500">
                  Buyers typically pay less than melt to cover refining, risk, and margin.
                </p>
              </div>
            </div>
          ) : !loadingValuations ? (
            <div className="mt-3 text-sm text-slate-400">
              <p>
                No valuation selected. Go back to the{" "}
                <Link href="/value" className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200">
                  Valuation Workspace
                </Link>{" "}
                to create one, then click <span className="font-medium">Get offers</span> on that item.
              </p>
            </div>
          ) : null}
        </section>

        {/* Buyer filters + summary + new offer + insights + inbox + upsell */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Buyer type selection */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Choose which buyers to target</h2>
              <p className="mt-1 text-sm text-slate-400">
                Use these checkboxes to plan who you’ll message and who you want offers from. This doesn’t contact anyone
                automatically—it just guides your outreach.
              </p>

              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={buyerFilters.jeweler}
                    onChange={() => handleToggleBuyer("jeweler")}
                    className="h-3 w-3 rounded border border-slate-600 bg-slate-900"
                  />
                  <span>
                    <span className="font-medium text-slate-100">Local jewelers</span>{" "}
                    <span className="text-slate-400">— often 90–95% of melt for good items.</span>
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={buyerFilters.pawn}
                    onChange={() => handleToggleBuyer("pawn")}
                    className="h-3 w-3 rounded border border-slate-600 bg-slate-900"
                  />
                  <span>
                    <span className="font-medium text-slate-100">Pawn / cash-for-gold</span>{" "}
                    <span className="text-slate-400">— fast cash, but often lower percentages.</span>
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={buyerFilters.privateBuyer}
                    onChange={() => handleToggleBuyer("privateBuyer")}
                    className="h-3 w-3 rounded border border-slate-600 bg-slate-900"
                  />
                  <span>
                    <span className="font-medium text-slate-100">Private buyers</span>{" "}
                    <span className="text-slate-400">— can pay up for special pieces, but more coordination.</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Shareable summary */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">Shareable summary message</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Paste this into email, text, or DMs when you reach out to buyers. You can also tweak the amount below to
                    preview how a specific offer looks vs. melt.
                  </p>
                </div>
                {copyMessage && <p className="text-[11px] text-emerald-300">{copyMessage}</p>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400">Optional: include a specific offer amount in this summary</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={userOfferForSummary}
                  onChange={(e) => setUserOfferForSummary(e.target.value)}
                  placeholder="e.g. 1950"
                  className="h-8 w-40 rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                />
              </div>

              <textarea
                readOnly
                className="mt-3 h-44 w-full resize-none rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                value={summaryText}
              />

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleCopySummary()}
                  className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 font-medium text-slate-100 hover:bg-slate-700"
                >
                  Copy summary
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center rounded-full border border-emerald-600/60 bg-slate-950 px-3 py-1 font-medium text-slate-300 opacity-80 cursor-not-allowed"
                >
                  Generate PDF (Pro)
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-3 py-1 font-medium text-slate-300 opacity-80 cursor-not-allowed"
                >
                  Send to buyers (Pro)
                </button>
              </div>
            </div>

            {/* Insights card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Offer coaching</h2>
              <p className="mt-1 text-sm text-slate-400">
                See how your best offer stacks up against melt and where different buyer types are landing.
              </p>

              {!offers.length ? (
                <p className="mt-3 text-sm text-slate-400">
                  Once you add a few offers, we’ll show where your best deals are and how far apart the quotes are.
                </p>
              ) : offerInsights ? (
                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Snapshot</p>
                    <p className="mt-1 text-sm text-slate-100">
                      Best offer:{" "}
                      <span className="font-semibold text-emerald-300">
                        {formatCurrency(offerInsights.bestOverall.amount)}
                      </span>{" "}
                      ({formatPercent(offerInsights.bestPct)} of melt)
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Across {offers.length} recorded offer{offers.length === 1 ? "" : "s"}, the average is{" "}
                      <span className="font-medium text-slate-100">{formatPercent(offerInsights.avgAll)} of melt</span>.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Spread between highest and lowest:{" "}
                      <span className="font-medium text-slate-100">{formatPercent(offerInsights.pctSpread)}</span>.
                    </p>
                  </div>

                  <div className="grid gap-3 text-xs sm:grid-cols-3">
                    {(["jeweler", "pawn", "private"] as OfferRow["buyer_type"][])
                      .filter((type) => offerInsights.typeStats[type].offers > 0)
                      .map((type) => (
                        <div key={type} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {BUYER_TYPE_LABEL[type]}
                          </p>
                          <p className="mt-1 text-slate-100">
                            Avg:{" "}
                            <span className="font-semibold">
                              {offerInsights.typeAverages[type] != null
                                ? formatPercent(offerInsights.typeAverages[type]!)
                                : "—"}
                            </span>{" "}
                            of melt
                          </p>
                          <p className="mt-1 text-slate-400">
                            Best seen:{" "}
                            <span className="font-semibold text-emerald-300">
                              {formatPercent(offerInsights.typeStats[type].maxPct)}
                            </span>
                          </p>
                          <p className="mt-1 text-slate-500">Offers logged: {offerInsights.typeStats[type].offers}</p>
                        </div>
                      ))}
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coach’s note</p>
                    <p className="mt-1 text-sm text-slate-100">{offerInsights.coachHeadline}</p>
                    <p className="mt-1 text-xs text-slate-400">{offerInsights.coachDetail}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  Once you add a few offers, we’ll show where your best deals are and how far apart the quotes are.
                </p>
              )}
            </div>
          </div>

          {/* Right column: new offer + inbox */}
          <div className="space-y-6">
            {/* New offer form */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Log an offer you received</h2>

              {demoMode ? (
                <>
                  <p className="text-sm text-slate-400">
                    This is demo data so you can see how MarketMint tracks real-world quotes.
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Create a free account to log your own offers, track multiple items, and see live insights on your best deals.
                  </p>
                  <Link
                    href="/login?redirect=/offers"
                    className="mt-3 inline-flex items-center rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Create free account
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-400">
                    As you get quotes from shops or private buyers, record them here so you can see who’s giving the strongest offers.
                  </p>

                  <form onSubmit={handleNewOfferSubmit} className="mt-2 space-y-3 text-sm">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Buyer name</label>
                      <input
                        type="text"
                        value={newBuyerName}
                        onChange={(e) => setNewBuyerName(e.target.value)}
                        placeholder="e.g. Downtown Gold & Coin, Local pawn, FB Marketplace buyer"
                        className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Buyer type</label>
                        <select
                          value={newBuyerType}
                          onChange={(e) => setNewBuyerType(e.target.value as "jeweler" | "pawn" | "private")}
                          className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                        >
                          <option value="jeweler">Jeweler</option>
                          <option value="pawn">Pawn / cash-for-gold</option>
                          <option value="private">Private buyer</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Offer amount</label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          placeholder="e.g. 1850"
                          className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Status</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value as "pending" | "accepted" | "rejected")}
                          className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                        >
                          <option value="pending">Pending / considering</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected / skipped</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Notes (optional)</label>
                      <textarea
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="Appointment details, why the offer was high or low, special terms, etc."
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-400"
                        rows={3}
                      />
                    </div>

                    {newOfferError && <p className="text-xs text-red-400">{newOfferError}</p>}

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={updatingOfferId === -1}
                        className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-70"
                      >
                        {updatingOfferId === -1 ? "Saving offer..." : "Add offer"}
                      </button>
                      <p className="text-[11px] text-slate-500">Tip: log every quote, even low ones. It helps you see the spread.</p>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Offers inbox */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Offer inbox</h2>
                <span className="text-xs text-slate-400">
                  {filteredOffers.length} shown{offers.length !== filteredOffers.length ? ` of ${offers.length} total` : ""}
                </span>
              </div>

              {loadingOffers && <p className="mt-3 text-sm text-slate-400">Loading offers for this item…</p>}
              {offersError && <p className="mt-3 text-xs text-red-400">{offersError}</p>}

              {!loadingOffers && valuation && !offers.length && (
                <p className="mt-3 text-sm text-slate-400">
                  No offers logged yet. When you start getting quotes, record each one here so you can compare them against your melt value.
                </p>
              )}

              {!loadingOffers && !valuation && (
                <p className="mt-3 text-sm text-slate-400">Select an item above to view and log offers.</p>
              )}

              {!loadingOffers && offers.length > 0 && (
                <div className="mt-3 space-y-2 text-sm">
                  {filteredOffers.map((offer) => {
                    const isExpanded = expandedOfferId === offer.id;
                    const pct = meltValue && meltValue > 0 ? (offer.amount / meltValue) * 100 : null;

                    return (
                      <div key={offer.id} className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setExpandedOfferId((prev) => (prev === offer.id ? null : offer.id))}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-xs text-slate-300">
                              {(offer.buyer_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-100">
                                {offer.buyer_name || BUYER_TYPE_LABEL[offer.buyer_type]}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {BUYER_TYPE_LABEL[offer.buyer_type]} • {formatDateTime(offer.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 text-xs">
                            <span className="text-sm font-semibold text-emerald-300">{formatCurrency(offer.amount)}</span>
                            <span className="text-[11px] text-slate-400">
                              {pct != null ? `${formatPercent(pct)} of melt` : "vs melt: —"}
                            </span>

                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                                offer.status === "accepted"
                                  ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-200"
                                  : offer.status === "rejected"
                                  ? "border-rose-500/70 bg-rose-500/10 text-rose-200"
                                  : "border-amber-500/70 bg-amber-500/10 text-amber-200"
                              }`}
                            >
                              {offer.status === "accepted" ? "Accepted" : offer.status === "rejected" ? "Rejected" : "Pending"}
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 border-t border-slate-800 pt-2 text-xs text-slate-300 space-y-2">
                            {offer.notes && (
                              <p className="text-slate-300">
                                <span className="font-medium">Notes:</span> {offer.notes}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-slate-500">Adjust status:</span>
                              <button
                                type="button"
                                disabled={updatingOfferId === offer.id}
                                onClick={() => handleUpdateOfferStatus(offer.id, "pending")}
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  offer.status === "pending" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-200"
                                }`}
                              >
                                Pending
                              </button>
                              <button
                                type="button"
                                disabled={updatingOfferId === offer.id}
                                onClick={() => handleUpdateOfferStatus(offer.id, "accepted")}
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  offer.status === "accepted" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-200"
                                }`}
                              >
                                Accepted
                              </button>
                              <button
                                type="button"
                                disabled={updatingOfferId === offer.id}
                                onClick={() => handleUpdateOfferStatus(offer.id, "rejected")}
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  offer.status === "rejected" ? "bg-rose-500 text-slate-50" : "bg-slate-800 text-slate-200"
                                }`}
                              >
                                Rejected
                              </button>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                disabled={updatingOfferId === offer.id}
                                onClick={() => handleDeleteOffer(offer.id)}
                                className="text-[11px] text-rose-400 hover:text-rose-300"
                              >
                                Delete offer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {offers.length > 0 && filteredOffers.length === 0 && (
                <p className="mt-3 text-sm text-slate-400">
                  No offers match your buyer filters. Try toggling the buyer types above.
                </p>
              )}
            </div>

            {/* Upsell / Pro banner */}
            <div className="rounded-2xl border border-emerald-700/70 bg-gradient-to-r from-slate-950 via-slate-950 to-emerald-950 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    MarketMint Pro (coming soon)
                  </p>
                  <p className="mt-1 text-sm text-slate-50">
                    Auto-generate outreach messages, email templates, and PDFs that anchor every conversation to your melt value.
                  </p>
                </div>
                <div className="mt-2 flex flex-col items-start sm:items-end gap-1 text-xs">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center rounded-full border border-emerald-500/80 bg-emerald-500/10 px-4 py-1.5 font-semibold text-emerald-100 opacity-80 cursor-not-allowed"
                  >
                    Start free trial (coming soon)
                  </button>
                  <p className="text-[11px] text-emerald-200/80">Expected pricing: around $9.99/month for active sellers.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
