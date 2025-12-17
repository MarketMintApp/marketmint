// /app/lib/demoData.ts

// Shared demo valuation + offers for logged-out "discovery mode" experience.
// These are plain objects so pages can import them and cast to their own types if needed.

export type DemoValuation = {
  id: number;
  created_at: string;
  metal_type: string | null;
  karat: string | null;
  weight_gram: number | null;
  spot_price: number | null;
  melt_value: number | null;
  notes: string | null;
};

export type DemoOffer = {
  id: number;
  valuation_id: number;
  buyer_name: string;
  buyer_type: "jeweler" | "pawn" | "private";
  amount: number;
  status: "pending" | "accepted" | "rejected";
  notes: string | null;
  created_at: string;
};

// ---------- Base timestamp helper so all demo data "looks" recent ----------

const nowIso = new Date().toISOString();

// ---------- Primary demo valuation (used in Offers / Offers Hub / Value) ----------

export const DEMO_VALUATION_MAIN: DemoValuation = {
  id: 0,
  created_at: nowIso,
  metal_type: "gold",
  karat: "14",
  weight_gram: 45,
  spot_price: 2400,
  melt_value: 2025.5,
  notes: "Sample 14K gold necklace (demo)",
};

// ---------- Additional demo valuations for My Items / Workspace lists ----------

export const DEMO_VALUATIONS: DemoValuation[] = [
  DEMO_VALUATION_MAIN,
  {
    id: 1,
    created_at: nowIso,
    metal_type: "gold",
    karat: "18",
    weight_gram: 12.5,
    spot_price: 2400,
    melt_value: 720.25,
    notes: "18K gold ring with small diamonds (demo)",
  },
  {
    id: 2,
    created_at: nowIso,
    metal_type: "gold",
    karat: "10",
    weight_gram: 60,
    spot_price: 2400,
    melt_value: 1600.0,
    notes: "10K mixed scrap pieces (demo)",
  },
];

// ---------- Demo offers (for valuation id 0 by default) ----------

export const DEMO_OFFERS_MAIN: DemoOffer[] = [
  {
    id: 1,
    valuation_id: 0,
    buyer_name: "GoldTown Jewelers",
    buyer_type: "jeweler",
    amount: 1950,
    status: "accepted",
    notes: "Local shop, includes cleaning and resizing.",
    created_at: nowIso,
  },
  {
    id: 2,
    valuation_id: 0,
    buyer_name: "Cash4Gold Express",
    buyer_type: "pawn",
    amount: 1250,
    status: "pending",
    notes: "Walk-in offer, no appointment.",
    created_at: nowIso,
  },
  {
    id: 3,
    valuation_id: 0,
    buyer_name: "Facebook Marketplace buyer",
    buyer_type: "private",
    amount: 2050,
    status: "pending",
    notes: "Wants to meet at local jeweler to verify.",
    created_at: nowIso,
  },
];

// ---------- Optional: offers attached to other demo valuations (for Items / Hub) ----------

export const DEMO_OFFERS_ALL: DemoOffer[] = [
  ...DEMO_OFFERS_MAIN,
  {
    id: 4,
    valuation_id: 1,
    buyer_name: "Downtown Estate Buyer",
    buyer_type: "jeweler",
    amount: 680,
    status: "pending",
    notes: "Interested because of diamond side stones.",
    created_at: nowIso,
  },
  {
    id: 5,
    valuation_id: 2,
    buyer_name: "Local pawn shop",
    buyer_type: "pawn",
    amount: 950,
    status: "rejected",
    notes: "Baseline scrap offer — used as a comparison point.",
    created_at: nowIso,
  },
];

// Convenience map: valuationId -> offers[]
export const DEMO_OFFERS_BY_VALUATION: Record<number, DemoOffer[]> = (() => {
  const map: Record<number, DemoOffer[]> = {};
  for (const offer of DEMO_OFFERS_ALL) {
    if (!map[offer.valuation_id]) {
      map[offer.valuation_id] = [];
    }
    map[offer.valuation_id].push(offer);
  }
  return map;
})();
