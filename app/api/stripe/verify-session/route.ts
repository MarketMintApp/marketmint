import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const { session_id } = await req.json();

    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing session_id" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Require payment success
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { ok: false, status: session.payment_status },
        { status: 402 }
      );
    }

    // Optional: verify it's our intended product
    const product = session.metadata?.product || session.metadata?.product_id;
    // In your checkout route you set metadata.product = "gold_pdf"
    if (product && product !== "gold_pdf") {
      return NextResponse.json(
        { ok: false, error: "Invalid product" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Verify failed" },
      { status: 500 }
    );
  }
}
