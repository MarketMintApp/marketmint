// app/lib/dataLoaders.ts
import { supabase } from "./supabaseClient";

/**
 * Shared row types so Workspace, My Items, Offers Hub, etc.
 * can all agree on shapes.
 */
export type ValuationRow = {
  id: number;
  user_id?: string | null;
  created_at: string;

  metal_type: string | null;
  karat: string | null;
  weight_gram: number | null;
  spot_price: number | null;
  melt_value: number | null;
  notes: string | null;
};

export type OfferRow = {
  id: number;
  valuation_id: number;
  user_id: string | null;
  created_at: string;

  buyer_name: string;
  buyer_type: "jeweler" | "pawn" | "private";
  amount: number;
  status: "accepted" | "pending" | "rejected";
  notes: string | null;
};

function errorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "object" && error && "message" in (error as any)) {
    return String((error as any).message);
  }
  return String(error);
}

/**
 * Normalize Supabase list responses:
 * - throw on error
 * - return [] on null
 */
function ensureList<T>(data: T[] | null, error: unknown, context: string): T[] {
  if (error) {
    throw new Error(`${context}: ${errorMessage(error)}`);
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Load valuations for a single user, newest first.
 */
export async function fetchValuations(userId: string): Promise<ValuationRow[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("valuations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return ensureList<ValuationRow>(
    data as ValuationRow[] | null,
    error,
    "Could not load valuations"
  );
}

/**
 * Load ALL offers for a user (used by dashboards / hubs).
 */
export async function fetchOffers(userId: string): Promise<OfferRow[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return ensureList<OfferRow>(
    data as OfferRow[] | null,
    error,
    "Could not load offers"
  );
}

/**
 * Load offers for ONE valuation, scoped to the user.
 * This is what Offer Inbox should use.
 */
export async function fetchOffersForValuation(
  userId: string,
  valuationId: number
): Promise<OfferRow[]> {
  if (!userId || !Number.isFinite(valuationId)) return [];

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("user_id", userId)
    .eq("valuation_id", valuationId)
    .order("created_at", { ascending: false });

  return ensureList<OfferRow>(
    data as OfferRow[] | null,
    error,
    "Could not load offers for this valuation"
  );
}

/**
 * Convenience helper: load valuations + offers in parallel.
 * Useful for Workspace, My Items, Offers Hub.
 */
export async function fetchValuationsAndOffers(userId: string): Promise<{
  valuations: ValuationRow[];
  offers: OfferRow[];
}> {
  const [valuations, offers] = await Promise.all([
    fetchValuations(userId),
    fetchOffers(userId),
  ]);

  return { valuations, offers };
}
