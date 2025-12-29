import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const { source } = await req.json().catch(() => ({ source: "gold" }));

    // Prefer request origin; fall back to env; then localhost for dev
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      allow_promotion_codes: false,

      // ✅ Redirect after payment
      success_url: `${origin}/pdf/success?session_id={CHECKOUT_SESSION_ID}`,

      // ✅ Redirect if they cancel
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
