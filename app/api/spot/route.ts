// app/api/spot/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Spot = {
  base: "USD";
  unit: "troy_oz";
  gold: number;     // USD per troy oz
  silver: number;   // USD per troy oz
  platinum: number; // USD per troy oz
  updatedAt: string;
  source: "stooq";
};

/**
 * CEO-friendly: This is the throttle.
 * We will fetch upstream prices at most once per TTL per server instance.
 * Everyone else gets cached values.
 */
const TTL_MS = 10 * 60 * 1000; // 10 minutes (change to 15m, 30m, etc.)

/**
 * Upstream source:
 * Stooq provides CSV quotes via this pattern (from their FAQ):
 * https://stooq.com/q/l/?s=SYMBOL&f=sd2t2ohlcv&h&e=csv
 */
const UPSTREAM = {
  gold: "xauusd",
  silver: "xagusd",
  platinum: "xptusd",
} as const;

let cache: { spot: Spot; fetchedAtMs: number } | null = null;

function buildUpstreamUrl(symbol: string) {
  // "Close" is the value we use from the returned CSV
  return `https://stooq.com/q/l/?s=${encodeURIComponent(
    symbol
  )}&f=sd2t2ohlcv&h&e=csv`;
}

function parseStooqCloseFromCsv(csv: string): number {
  // CSV looks like:
  // Symbol,Date,Time,Open,High,Low,Close,Volume
  // XAUUSD,2025-12-25,17:11:51,....,....,....,4479.325,0
  const lines = csv.trim().split("\n").filter(Boolean);
  if (lines.length < 2) throw new Error("Upstream CSV missing data rows");

  const headers = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const row = lines[1].split(",").map((s) => s.trim());

  const closeIdx = headers.indexOf("close");
  if (closeIdx === -1) throw new Error("Upstream CSV missing Close column");

  const close = Number(row[closeIdx]);
  if (!Number.isFinite(close) || close <= 0) {
    throw new Error("Upstream Close value invalid");
  }

  return close;
}

async function fetchOne(symbol: string): Promise<number> {
  const url = buildUpstreamUrl(symbol);

  // Important: we DO NOT want Next caching to do anything surprising here.
  // Our own TTL logic controls frequency.
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "MarketMint/1.0 (spot-cache)",
      Accept: "text/csv",
    },
  });

  if (!res.ok) throw new Error(`Upstream fetch failed (${res.status})`);
  const csv = await res.text();
  return parseStooqCloseFromCsv(csv);
}

export async function GET() {
  const now = Date.now();

  // 1) Serve cached if fresh
  if (cache && now - cache.fetchedAtMs < TTL_MS) {
    return NextResponse.json(cache.spot, {
      status: 200,
      headers: {
        // Browser/CDN caching (extra layer):
        // - allow CDNs to cache for 5 minutes
        // - browsers cache for 60s
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        "X-Spot-Cache": "HIT",
      },
    });
  }

  // 2) Otherwise refresh cache (one upstream call per metal)
  try {
    const [gold, silver, platinum] = await Promise.all([
      fetchOne(UPSTREAM.gold),
      fetchOne(UPSTREAM.silver),
      fetchOne(UPSTREAM.platinum),
    ]);

    const spot: Spot = {
      base: "USD",
      unit: "troy_oz",
      gold,
      silver,
      platinum,
      updatedAt: new Date().toISOString(),
      source: "stooq",
    };

    cache = { spot, fetchedAtMs: now };

    return NextResponse.json(spot, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        "X-Spot-Cache": "MISS",
      },
    });
  } catch (err: any) {
    // 3) If upstream fails, serve stale cache (better UX than breaking)
    if (cache) {
      return NextResponse.json(cache.spot, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
          "X-Spot-Cache": "STALE",
        },
      });
    }

    return NextResponse.json(
      { error: "spot_fetch_failed", message: err?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
