// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;

  // IMPORTANT: don't throw at module eval time in Next builds
  if (!key) return null;

  return new Stripe(key, {
 
  });
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY (server env var not set)." },
        { status: 500 }
      );
    }

    const { source } = await req.json().catch(() => ({ source: "gold" }));
    const origin = new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      allow_promotion_codes: false,
      success_url: `${origin}/pdf/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/gold`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: 499,
            product_data: {
              name: "MarketMint Valuation PDF",
              description: "One-time download (digital product).",
            },
          },
        },
      ],
      metadata: { source },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Checkout session failed" },
      { status: 500 }
    );
  }
}
