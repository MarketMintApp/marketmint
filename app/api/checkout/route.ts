// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

type CheckoutBody = {
  source?: string;
  payload?: Record<string, unknown>;
};

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 1) Env checks (LOCAL DEV uses .env.local)
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY in .env.local" },
        { status: 500 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_SITEURL ||
      "http://localhost:3000";

    // 2) Parse body safely
    let body: CheckoutBody;
    try {
      body = (await req.json()) as CheckoutBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const source = body.source || "unknown";
    const payload = body.payload || {};

    // 3) Stripe session
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia" as any,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      allow_promotion_codes: false,
      success_url: `${siteUrl}/pdf/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/gold`,
      metadata: {
        product: "gold_pdf",
        source,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "MarketMint Valuation PDF",
              description:
                "Timestamped documentation • includes inputs + spot price used • shareable record",
            },
            unit_amount: 499,
          },
          quantity: 1,
        },
      ],
    });

    // 4) Store payload keyed by session_id
    const { error: dbErr } = await supabaseAdmin
      .from("mm_valuation_sessions")
      .upsert({
        session_id: session.id,
        source,
        payload,
        created_at: new Date().toISOString(),
      });

    if (dbErr) {
      return NextResponse.json(
        { error: "Supabase insert failed", details: dbErr.message },
        { status: 500 }
      );
    }

    // 5) Return JSON (so the client res.json() works)
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    // Always return JSON (no HTML _error page)
    return NextResponse.json(
      {
        error: "Checkout route crashed",
        details: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}
