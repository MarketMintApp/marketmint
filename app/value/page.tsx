// path: app/value/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import GoldCalculator from "../components/GoldCalculator";
import { AnimatedDisclosure } from "../components/AnimatedDisclosure";

import { gaEvent } from "../lib/ga";
import { supabase } from "../lib/supabaseClient";
import { DEMO_VALUATIONS, DEMO_OFFERS_ALL } from "../lib/demodata";

function formatMetal(metal: string | null | undefined) {
  if (!metal) return "";
  return metal.charAt(0).toUpperCase() + metal.slice(1).toLowerCase();
}

// Shape of a row from the `valuations` table
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
  amount: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

type OfferSummary = {
  totalOffers: number;
  bestAmount: number;
  bestPct: number;
  bestStatus: "pending" | "accepted" | "rejected";
  lastUpdated: string;
};

type ValuationFilter = "all" | "withOffers" | "noOffers" | "accepted";

export default function ValuationWorkspacePage() {
  // Auth + demo flags (replaces useAuthGuard)
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [valuations, setValuations] = useState<ValuationRow[]>([]);
  const [offerSummaries, setOfferSummaries] = useState<Record<number, OfferSummary>>({});

  const [loading, setLoading] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [offers, setOffers] = useState<Record<number, string>>({});
  const [valuationFilter, setValuationFilter] = useState<ValuationFilter>("all");
  const [valuationSearch, setValuationSearch] = useState("");

  const combinedError = authError || error;

  function formatCurrency(value: number | null | undefined) {
    if (!value && value !== 0) return "—";
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatPercent(value: number) {
    return `${value.toFixed(1)}%`;
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // -------------------------------------------------------------------------
  // AUTH CHECK (sets authChecked + demoMode + user)
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        setAuthError(null);

        const { data, error: getUserError } = await supabase.auth.getUser();

        // Logged out OR session missing -> demo mode
        if (getUserError || !data.user) {
          if (!cancelled) {
            setUser(null);
            setDemoMode(true);
          }
          return;
        }

        // Logged in
        if (!cancelled) {
          setUser(data.user);
          setDemoMode(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setUser(null);
          setDemoMode(true);
          setAuthError("There was a problem checking your session.");
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // OFFER SUMMARY BUILDER (shared by demo + real)
  // Best offer = HIGHEST $ AMOUNT (consistent across both modes)
  // -------------------------------------------------------------------------
  const buildOfferSummaries = useCallback(
    (rows: ValuationRow[], offersData: OfferRow[]) => {
      if (!rows || rows.length === 0) return {};

      const valuationById = new Map<number, ValuationRow>();
      rows.forEach((v) => valuationById.set(v.id, v));

      const summaryMap: Record<number, OfferSummary> = {};

      for (const offer of offersData) {
        const val = valuationById.get(offer.valuation_id);
        if (!val || !val.melt_value || val.melt_value <= 0) continue;

        const pct = (offer.amount / val.melt_value) * 100;
        const existing = summaryMap[offer.valuation_id];

        if (!existing) {
          summaryMap[offer.valuation_id] = {
            totalOffers: 1,
            bestAmount: offer.amount,
            bestPct: pct,
            bestStatus: offer.status,
            lastUpdated: offer.created_at,
          };
          continue;
        }

        const totalOffers = existing.totalOffers + 1;

        // Best offer = highest amount
        let bestAmount = existing.bestAmount;
        let bestPct = existing.bestPct;
        let bestStatus = existing.bestStatus;

        if (offer.amount > bestAmount) {
          bestAmount = offer.amount;
          bestPct = pct;
          bestStatus = offer.status;
        }

        const lastUpdated =
          new Date(offer.created_at) > new Date(existing.lastUpdated)
            ? offer.created_at
            : existing.lastUpdated;

        summaryMap[offer.valuation_id] = {
          totalOffers,
          bestAmount,
          bestPct,
          bestStatus,
          lastUpdated,
        };
      }

      return summaryMap;
    },
    []
  );

  // -------------------------------------------------------------------------
  // DATA LOADING
  // -------------------------------------------------------------------------
  const fetchOfferSummaries = useCallback(
    async (rows: ValuationRow[]) => {
      if (!rows || rows.length === 0) {
        setOfferSummaries({});
        return;
      }

      const ids = rows.map((v) => v.id);

      try {
        setLoadingOffers(true);

        const { data, error: offersError } = await supabase
          .from("offers")
          .select("id, valuation_id, amount, status, created_at")
          .in("valuation_id", ids)
          .order("created_at", { ascending: false });

        if (offersError) {
          console.error("Error fetching offers for summaries:", offersError);
          return;
        }

        const offersData = (data || []) as OfferRow[];
        setOfferSummaries(buildOfferSummaries(rows, offersData));
      } finally {
        setLoadingOffers(false);
      }
    },
    [buildOfferSummaries]
  );

  const fetchValuations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("valuations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError) {
        console.error("Error fetching valuations:", fetchError);
        setError("Could not load saved valuations.");
        setValuations([]);
        setOfferSummaries({});
        return;
      }

      const rows = (data || []) as ValuationRow[];
      setValuations(rows);

      await fetchOfferSummaries(rows);
    } finally {
      setLoading(false);
    }
  }, [user, fetchOfferSummaries]);

  // Load valuations once auth is confirmed
  useEffect(() => {
    if (!authChecked) return;

    if (demoMode) {
      // Use demo valuations + offers in discovery mode
      setLoading(false);
      setLoadingOffers(false);
      setError(null);

      const rows = DEMO_VALUATIONS as unknown as ValuationRow[];
      setValuations(rows);

      const demoOffers = DEMO_OFFERS_ALL as OfferRow[];
      setOfferSummaries(buildOfferSummaries(rows, demoOffers));
      return;
    }

    // Logged-in → fetch from Supabase
    if (user) {
      fetchValuations();
    }
  }, [authChecked, demoMode, user, fetchValuations, buildOfferSummaries]);

  // -------------------------------------------------------------------------
  // SAVE / DELETE / COPY HANDLERS
  // -------------------------------------------------------------------------
  async function handleSave(valuation: {
    metal_type: string;
    karat: number;
    weight_gram: number;
    spot_price: number;
    melt_value: number;
    notes?: string;
  }) {
    setSaveMessage(null);
    setError(null);

    if (!user) {
      setError("Create a free MarketMint account to save valuations and track offers.");
      return;
    }

    try {
      const { error: insertError } = await supabase.from("valuations").insert([
        {
          user_id: user.id,
          metal_type: valuation.metal_type,
          karat: String(valuation.karat),
          weight_gram: valuation.weight_gram,
          spot_price: valuation.spot_price,
          melt_value: valuation.melt_value,
          notes: valuation.notes ?? null,
        },
      ]);

      if (insertError) {
        console.error("Error saving valuation:", insertError);
        setError("There was an error saving this valuation.");
        return;
      }

      // GA: valuation submitted (client-side only)
      gaEvent("valuation_submitted", {
        metal_type: valuation.metal_type,
        karat: String(valuation.karat),
        weight_gram: valuation.weight_gram,
        spot_price: valuation.spot_price,
        melt_value: valuation.melt_value,
        value: valuation.melt_value,
        currency: "USD",
      });

      setSaveMessage("Valuation saved. It’s now available in Saved Valuations and My Items.");

      fetchValuations();
    } catch (err) {
      console.error(err);
      setError("There was an error saving this valuation.");
    }
  }

  function handleCopyFromRow(v: ValuationRow) {
    const metal = formatMetal(v.metal_type) || "Unknown metal";
    const karat = v.karat ?? "—";
    const weight = v.weight_gram ?? "—";
    const melt = v.melt_value != null ? formatCurrency(v.melt_value) : "—";
    const spot = v.spot_price ?? "—";

    const text = `
${metal} Valuation — ${karat}K, ${weight} g
Melt value: ${melt}
Spot price used: $${spot}
Notes: ${v.notes || "None"}
Saved: ${formatDate(v.created_at)}
`.trim();

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("Valuation copied to clipboard!");
    }
  }

  async function handleDeleteRow(id: number) {
    setError(null);

    try {
      const { error: deleteError } = await supabase.from("valuations").delete().eq("id", id);

      if (deleteError) {
        console.error("Error deleting valuation:", deleteError);
        setError("There was an error deleting this valuation.");
        return;
      }

      setValuations((prev) => prev.filter((v) => v.id !== id));
      setOfferSummaries((prev) => {
        const clone = { ...prev };
        delete clone[id];
        return clone;
      });
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error(err);
      setError("There was an error deleting this valuation.");
    }
  }

  // -------------------------------------------------------------------------
  // DERIVED METRICS
  // -------------------------------------------------------------------------
  const savedCount = valuations.length;
  const totalMelt = valuations.reduce((sum, v) => sum + (v.melt_value ?? 0), 0);
  const averageMelt = savedCount > 0 ? totalMelt / savedCount : 0;
  const lastSaved = valuations[0]?.created_at;

  const filteredValuations = valuations.filter((v) => {
    const summary = offerSummaries[v.id];

    // Status filter
    if (valuationFilter === "withOffers") {
      if (!summary || summary.totalOffers === 0) return false;
    }
    if (valuationFilter === "noOffers") {
      if (summary && summary.totalOffers > 0) return false;
    }
    if (valuationFilter === "accepted") {
      if (!summary || summary.bestStatus !== "accepted") return false;
    }

    // Search filter
    const q = valuationSearch.trim().toLowerCase();
    if (!q) return true;

    const haystack = [formatMetal(v.metal_type), v.karat ?? "", v.weight_gram ?? "", v.notes ?? ""]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Checking your account…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">Valuation Workspace</h1>
          <p className="mt-3 text-base text-slate-300">
            MarketMint helps you estimate melt value, compare real-world offers, and track your items — this
            workspace is the foundation for the Pro SaaS you&apos;ll eventually charge for.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Ready to shop offers?{" "}
            <Link
              href="/offers/hub"
              className="font-medium text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
            >
              Open the Offers hub
            </Link>
            .
          </p>
          {demoMode && (
            <p className="mt-2 text-xs text-emerald-300">
              You&apos;re viewing sample data.{" "}
              <Link href="/login?redirect=/value" className="font-semibold underline underline-offset-2">
                Create a free account
              </Link>{" "}
              to run and save your own valuations.
            </p>
          )}
        </header>

        {/* SUMMARY STATS */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Saved valuations</p>
            <p className="mt-2 text-2xl font-semibold">{savedCount.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-500">Last {Math.min(savedCount, 20) || 0} items in your workspace.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Total melt value</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalMelt)}</p>
            {lastSaved && <p className="mt-1 text-[11px] text-slate-500">Sum of melt across these saved valuations.</p>}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Average melt per item</p>
            <p className="mt-2 text-2xl font-semibold">{savedCount > 0 ? formatCurrency(averageMelt) : "—"}</p>
            {lastSaved && (
              <p className="mt-1 text-[11px] text-slate-500">Last saved: {formatDate(lastSaved)}</p>
            )}
          </div>
        </section>

        {/* Top row: Gold + Watch/Jewelry */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Gold card – inline calculator */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Gold Value Calculator</h2>
              <p className="mt-2 text-base text-slate-300">
                Enter karat, weight, and spot price to get today&apos;s melt value. This uses the same engine as
                your dedicated calculator page.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Prefer the dedicated calculator layout?{" "}
                <Link
                  href="/gold"
                  className="font-medium text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
                >
                  Open full calculator view
                </Link>
                .
              </p>
            </div>

            <GoldCalculator showSaveControls onSave={handleSave} />

            {saveMessage && <p className="mt-2 text-xs text-emerald-300">{saveMessage}</p>}
            {combinedError && <p className="mt-2 text-xs text-red-400">{combinedError}</p>}
          </div>

          {/* Watch & Jewelry placeholder card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-xl font-semibold">Watch &amp; Jewelry Valuations</h2>
            <p className="mt-2 text-base text-slate-300">
              Coming soon: templates for Rolex, chains, rings, and more with typical dealer, auction, and
              private-party ranges so you can run full client-style valuations from one screen.
            </p>
            <button
              disabled
              className="mt-4 inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400"
            >
              Roadmap · Not yet available
            </button>
            <p className="mt-3 text-[11px] text-slate-500">
              This card is basically the placeholder for your &quot;Rolex / high-end jewelry&quot; SaaS feature set.
            </p>
          </div>
        </section>

        {/* Saved valuations list */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold">Saved Valuations</h2>
          <p className="mt-2 text-base text-slate-300">
            These are the valuations you&apos;ve saved from the workspace. Later, this becomes a full client report /
            export area and feeds into your Pro SaaS.
          </p>

          {loading && <p className="mt-3 text-xs text-slate-400">Loading valuations…</p>}

          {!loading && valuations.length === 0 && !combinedError && (
            <p className="mt-3 text-base text-slate-400">
              No valuations saved yet. Use the calculator above and click{" "}
              <span className="font-medium text-emerald-300">Save valuation</span>{" "}
              to start building your workspace.
            </p>
          )}

          {!loading && valuations.length > 0 && (
            <>
              {/* Filters + search */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setValuationFilter("all")}
                    className={`rounded-full px-3 py-1 border ${
                      valuationFilter === "all"
                        ? "bg-slate-100 text-slate-900 border-slate-100"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    All valuations
                  </button>
                  <button
                    type="button"
                    onClick={() => setValuationFilter("withOffers")}
                    className={`rounded-full px-3 py-1 border ${
                      valuationFilter === "withOffers"
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    With offers
                  </button>
                  <button
                    type="button"
                    onClick={() => setValuationFilter("noOffers")}
                    className={`rounded-full px-3 py-1 border ${
                      valuationFilter === "noOffers"
                        ? "bg-slate-700 text-slate-50 border-slate-500"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    No offers yet
                  </button>
                  <button
                    type="button"
                    onClick={() => setValuationFilter("accepted")}
                    className={`rounded-full px-3 py-1 border ${
                      valuationFilter === "accepted"
                        ? "bg-emerald-700 text-white border-emerald-500"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    Accepted offer logged
                  </button>
                </div>

                <div className="w-full sm:w-64">
                  <label className="sr-only" htmlFor="valuation-search">
                    Search valuations
                  </label>
                  <input
                    id="valuation-search"
                    type="text"
                    value={valuationSearch}
                    onChange={(e) => setValuationSearch(e.target.value)}
                    className="w-full rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-400"
                    placeholder="Search metal, karat, notes…"
                  />
                </div>
              </div>

              {filteredValuations.length === 0 && (
                <p className="mt-4 text-sm text-slate-400">
                  No valuations match this filter yet. Try switching filters or clearing the search, or log some offers
                  in the{" "}
                  <Link
                    href="/offers/hub"
                    className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
                  >
                    Offers hub
                  </Link>
                  .
                </p>
              )}

              {filteredValuations.length > 0 && (
                <div className="mt-4 space-y-2 text-sm">
                  {filteredValuations.map((v) => {
                    const isExpanded = expandedId === v.id;
                    const offerInput = offers[v.id] ?? "";
                    const melt = v.melt_value ?? null;

                    const summary = offerSummaries[v.id];

                    // Manual quick checker
                    let offerPercent: string | null = null;
                    let offerSpread: string | null = null;
                    let offerBadgeClass = "";
                    let dealLabel = "";
                    let dealLabelColorClass = "";
                    let buyerLabel = "";
                    let buyerExplanation = "";

                    if (melt && offerInput.trim() !== "") {
                      const numericOffer = parseFloat(offerInput.replace(/,/g, ""));
                      if (!Number.isNaN(numericOffer) && melt > 0) {
                        const pctNum = (numericOffer / melt) * 100;
                        const diff = melt - numericOffer;

                        offerPercent = formatPercent(pctNum);
                        offerSpread = diff.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });

                        if (pctNum >= 98) {
                          offerBadgeClass = "bg-emerald-900/70 text-emerald-200 border-emerald-700/80";
                          dealLabel = "Top-tier offer — basically full melt.";
                          dealLabelColorClass = "text-emerald-300";
                          buyerLabel = "Private buyer / marketplace";
                          buyerExplanation =
                            "You’re essentially at full melt value. A serious private buyer might match or slightly beat this if the item is desirable.";
                        } else if (pctNum >= 95) {
                          offerBadgeClass = "bg-emerald-900/60 text-emerald-200 border-emerald-700/70";
                          dealLabel = "Excellent offer — very close to melt.";
                          dealLabelColorClass = "text-emerald-300";
                          buyerLabel = "Local jeweler or private buyer";
                          buyerExplanation =
                            "This is better than what most pawn shops pay. Jewelers or informed private buyers usually sit in this range.";
                        } else if (pctNum >= 90) {
                          offerBadgeClass = "bg-emerald-900/40 text-emerald-200 border-emerald-700/70";
                          dealLabel = "Strong offer — worth serious consideration.";
                          dealLabelColorClass = "text-emerald-300";
                          buyerLabel = "Local jeweler";
                          buyerExplanation =
                            "This is typical strong jeweler pricing. You might squeeze a bit more by shopping around, but you’re in a good band.";
                        } else if (pctNum >= 80) {
                          offerBadgeClass = "bg-amber-900/40 text-amber-200 border-amber-600/70";
                          dealLabel = "Decent offer — you may be able to do better.";
                          dealLabelColorClass = "text-amber-300";
                          buyerLabel = "Pawn shop or lower-end jeweler";
                          buyerExplanation =
                            "This feels like pawn or conservative jeweler pricing. Getting quotes from a few jewelers usually improves this.";
                        } else {
                          offerBadgeClass = "bg-rose-900/40 text-rose-200 border-rose-600/70";
                          dealLabel = "Lowball offer — keep shopping around.";
                          dealLabelColorClass = "text-rose-300";
                          buyerLabel = "Pawn shop / cash-for-gold";
                          buyerExplanation =
                            "This is classic lowball territory. Treat it as a baseline only and get more quotes before selling.";
                        }
                      }
                    }

                    // Status pill from best logged offer
                    let loggedStatusLabel = "";
                    let loggedStatusClass = "bg-slate-800 text-slate-200 border-slate-600";

                    if (summary && summary.totalOffers > 0) {
                      if (summary.bestStatus === "accepted") {
                        loggedStatusLabel = "Accepted offer logged";
                        loggedStatusClass = "bg-emerald-900/70 text-emerald-200 border-emerald-600/80";
                      } else if (summary.bestStatus === "pending") {
                        loggedStatusLabel = "Offers in progress";
                        loggedStatusClass = "bg-amber-900/60 text-amber-200 border-amber-600/80";
                      } else if (summary.bestStatus === "rejected") {
                        loggedStatusLabel = "Best offer rejected";
                        loggedStatusClass = "bg-rose-900/60 text-rose-200 border-rose-600/80";
                      }
                    }

                    return (
                      <div
                        key={v.id}
                        onClick={() => setExpandedId((current) => (current === v.id ? null : v.id))}
                        className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 transition-all duration-200 cursor-pointer hover:bg-slate-800 hover:shadow-lg hover:-translate-y-[1px]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-[15px]">
                              {formatMetal(v.metal_type)} · {v.karat ?? "—"}K · {v.weight_gram ?? "—"} g
                            </p>
                            <p className="text-xs text-slate-400">Saved {formatDate(v.created_at)}</p>
                            {summary && summary.totalOffers > 0 && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                Best logged offer:{" "}
                                <span className="font-medium text-slate-100">
                                  {formatCurrency(summary.bestAmount)} ({formatPercent(summary.bestPct)} of melt)
                                </span>{" "}
                                from {summary.totalOffers} offer{summary.totalOffers === 1 ? "" : "s"}.
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[15px]">{formatCurrency(v.melt_value)}</p>
                            <p className="text-[11px] text-slate-400">Spot: {v.spot_price ?? "—"}</p>

                            {summary && summary.totalOffers > 0 && (
                              <span
                                className={`mt-1 inline-flex items-center justify-end rounded-full border px-2 py-[2px] text-[10px] font-medium ${loggedStatusClass}`}
                              >
                                {loggedStatusLabel}
                              </span>
                            )}

                            {offerPercent && offerBadgeClass && (
                              <span
                                className={`mt-1 ml-2 inline-flex items-center justify-end rounded-full border px-2 py-[2px] text-[10px] font-medium ${offerBadgeClass}`}
                              >
                                Last manual check: {offerPercent} of melt
                              </span>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 border-t border-slate-800 pt-2 text-[13px] text-slate-300 space-y-1">
                            <p>
                              <span className="text-slate-500">Metal:</span> {formatMetal(v.metal_type) || "—"}
                            </p>
                            <p>
                              <span className="text-slate-500">Karat:</span> {v.karat ?? "—"}K
                            </p>
                            <p>
                              <span className="text-slate-500">Weight:</span> {v.weight_gram ?? "—"} g
                            </p>
                            <p>
                              <span className="text-slate-500">Spot price:</span> {v.spot_price ?? "—"}
                            </p>
                            <p>
                              <span className="text-slate-500">Melt value:</span> {formatCurrency(v.melt_value)}
                            </p>

                            {v.notes && (
                              <p className="pt-1 text-[11px] text-slate-400 italic">“{v.notes}”</p>
                            )}

                            {/* Offer vs melt helper */}
                            <div
                              className="mt-3 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-[11px] font-medium text-slate-200">
                                Check an offer against this melt value
                              </p>

                              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-400">Offer amount</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={offerInput}
                                    onChange={(e) =>
                                      setOffers((prev) => ({
                                        ...prev,
                                        [v.id]: e.target.value,
                                      }))
                                    }
                                    className="h-7 w-28 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-400"
                                    placeholder="0.00"
                                  />
                                </div>

                                {melt && offerPercent && offerSpread ? (
                                  <div className="text-[11px] text-slate-300">
                                    <p>
                                      Offer is{" "}
                                      <span className="font-semibold text-emerald-300">{offerPercent}</span>{" "}
                                      of melt.
                                    </p>
                                    <p className="text-slate-400">
                                      You&apos;d be giving up{" "}
                                      <span className="font-semibold text-rose-300">${offerSpread}</span>{" "}
                                      vs melt.
                                    </p>
                                    {dealLabel && (
                                      <p className={`mt-1 text-[11px] font-medium ${dealLabelColorClass}`}>
                                        {dealLabel}
                                      </p>
                                    )}
                                    {buyerLabel && (
                                      <div className="mt-2">
                                        <p className="text-[11px] font-semibold text-slate-200">
                                          Recommended buyer:{" "}
                                          <span className="text-emerald-300">{buyerLabel}</span>
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-[2px]">{buyerExplanation}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-500">
                                    Enter an offer to see % of melt, dollar spread, and recommended buyer type.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyFromRow(v);
                                }}
                                className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-700"
                              >
                                Copy
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRow(v.id);
                                }}
                                className="inline-flex items-center rounded-full bg-red-600/90 px-3 py-1 text-[11px] font-medium text-white hover:bg-red-500"
                              >
                                Delete
                              </button>
                              <Link
                                href={`/items?focus=${v.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-700"
                              >
                                View in My Items
                              </Link>
                              <Link
                                href={`/offers?valuationId=${v.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center rounded-full bg-emerald-600/90 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-500"
                              >
                                Get offers
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {loadingOffers && !loading && valuations.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-500">Updating offer summaries…</p>
          )}
        </section>

        {/* Education / FAQs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Where should I sell my gold?</h2>
          <p className="mt-1 text-base text-slate-300">MarketMint doesn&apos;t buy your items directly.</p>
          <p className="text-base text-slate-400 max-w-3xl">
            We give you clear valuations so you can compare offers and avoid low-ball quotes.
          </p>

          <AnimatedDisclosure title="Cash-for-gold & pawn shops" subtitle="Fastest payout, usually the lowest offer">
            <ul className="space-y-1.5 text-[13px]">
              <li>• Typically pay the lowest percentage of melt value.</li>
              <li>• They count on sellers not knowing true gold weight or spot price.</li>
              <li>• Use MarketMint to see exactly how far their offer is from melt.</li>
            </ul>
          </AnimatedDisclosure>

          <AnimatedDisclosure title="Local jewelers" subtitle="Often better than pawn, but still retail-focused">
            <ul className="space-y-1.5 text-[13px]">
              <li>• Offers are usually 10–30% better than pure cash-for-gold shops.</li>
              <li>• Pricing reflects their risk, overhead, and ability to resell your item.</li>
              <li>• Walking in with a MarketMint valuation makes negotiation much easier.</li>
            </ul>
          </AnimatedDisclosure>

          <AnimatedDisclosure title="Private buyers & marketplaces" subtitle="Highest potential payout, more effort and risk">
            <ul className="space-y-1.5 text-[13px]">
              <li>• Can get closest to full value if you find a serious buyer.</li>
              <li>• Requires safety awareness: meet in public, ideally near a jeweler.</li>
              <li>• MarketMint helps you price listings realistically and justify your ask.</li>
            </ul>
          </AnimatedDisclosure>

          <AnimatedDisclosure title="How to use MarketMint in your negotiations" subtitle="Turn transparency into leverage">
            <ul className="space-y-1.5 text-[13px]">
              <li>• Get your melt value and range here before you get quotes.</li>
              <li>• Ask buyers what percentage of melt they&apos;re paying—most will answer when they realize you know the math.</li>
              <li>• Be willing to walk away from extreme low-ball offers unless you truly need instant cash.</li>
            </ul>
          </AnimatedDisclosure>
        </section>

        {/* SaaS skeleton section */}
        <section className="rounded-2xl border border-emerald-700/60 bg-emerald-500/5 p-5">
          <h2 className="text-xl font-semibold">Pro SaaS (Skeleton)</h2>
          <p className="mt-2 text-base text-slate-300 max-w-3xl">
            Soon you&apos;ll be able to log in, save valuations, and share reports with buyers. For now this section is a
            placeholder so the revenue model is baked into the UI.
          </p>

          <div className="mt-4 grid gap-6 md:grid-cols-2 text-sm">
            <div>
              <h3 className="mb-1 font-semibold text-slate-100">Free Tier (today)</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[13px]">
                <li>Unlimited use of public calculators</li>
                <li>Manual outreach to buyers via admin dashboard</li>
                <li>Great for casual sellers &amp; testing</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-slate-100">Pro Tier (future)</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[13px]">
                <li>Saved valuations by item &amp; client</li>
                <li>Exportable PDFs for buyers / sellers</li>
                <li>Priority matching to partner buyers</li>
                <li>Advanced pricing templates (Rolex, chains, etc.)</li>
              </ul>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            This page is just the skeleton. As we add Supabase tables, auth, and Stripe, this becomes your paid valuation workspace.
          </p>
        </section>
      </div>
    </main>
  );
}
