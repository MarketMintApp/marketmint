// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

type CheckoutBody = {
  source?: string;
  payload?: Record<string, unknown>;
};

export const runtime = "nodejs";

function jsonError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    // 1) Env checks
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return jsonError("Missing STRIPE_SECRET_KEY", 500);
    }

    const stripePriceId = process.env.STRIPE_PRICE_ID;
    if (!stripePriceId) {
      return jsonError("Missing STRIPE_PRICE_ID", 500);
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
      return jsonError("Invalid JSON body", 400);
    }

    const source = body.source || "unknown";
    const payload = body.payload || {};

    // 3) Stripe session (no pinned apiVersion; use Stripe account default)
    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Stripe can infer payment methods; leaving this out reduces config drift.
      allow_promotion_codes: false,
      success_url: `${siteUrl}/pdf/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/gold`,
      metadata: {
        product: "gold_pdf",
        source,
      },
      line_items: [
        {
          price: stripePriceId,
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
      return jsonError("Supabase insert failed", 500, dbErr.message);
    }

    // 5) Return JSON
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    return jsonError("Checkout route crashed", 500, e?.message || String(e));
  }
}
