import { NextResponse } from "next/server";

async function fetchStooqClose(symbol: string): Promise<number | null> {
  try {
    // Example symbols:
    // S&P 500 index (Stooq): ^spx
    // Bitcoin USD (Stooq): btcusd
    const url = `https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    const headers = lines[0].split(",");
    const values = lines[1].split(",");
    const closeIdx = headers.indexOf("Close");
    if (closeIdx === -1) return null;

    const close = Number(values[closeIdx]);
    return Number.isFinite(close) ? close : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const spotUrl = new URL("/api/spot", req.url);

    const [spotRes, spx, btc] = await Promise.all([
      fetch(spotUrl, { cache: "no-store" }),
      fetchStooqClose("^spx"),
      fetchStooqClose("btcusd"),
    ]);

    // keep the rest of your existing logic BELOW this line


    let spot: any = null;
    if (spotRes.ok) spot = await spotRes.json();

    return NextResponse.json(
      {
        gold: typeof spot?.gold === "number" ? spot.gold : null,
        silver: typeof spot?.silver === "number" ? spot.silver : null,
        sp500: spx,
        bitcoin: btc,
        asOf: typeof spot?.updatedAt === "string" ? spot.updatedAt : null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { gold: null, silver: null, sp500: null, bitcoin: null, asOf: null },
      { status: 200 }
    );
  }
}
