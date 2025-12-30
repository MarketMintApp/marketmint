import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Expects:
 * {
 *   source: string,
 *   payload: { ...valuation fields... }
 * }
 */

type PdfPayload = {
  metalType?: string;
  karat?: number | string;
  weightGrams?: number | string;
  spotPrice?: number | string;
  meltValue?: number | string;
  dealerLow?: number | string;
  dealerHigh?: number | string;
  notes?: string;
  createdAtISO?: string;
  spotSource?: string;
};

type PdfRequestBody = {
  source?: string;
  payload?: PdfPayload;
};

/* -------------------- helpers (UNCHANGED LOGIC) -------------------- */

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,]/g, "").trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function safeText(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s || "—";
}

function money(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function numberLike(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function titleCase(s: string): string {
  const x = (s || "").toLowerCase().trim();
  if (!x) return "—";
  return x.charAt(0).toUpperCase() + x.slice(1);
}

function makeValuationId(createdAtISO: string) {
  const d = new Date(createdAtISO);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `MM-${yyyy}${mm}${dd}-${rand}`;
}

/* -------------------- ROUTE -------------------- */

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PdfRequestBody;
    const payload = body.payload;
    if (!payload) throw new Error("Missing payload");

    const metalType = titleCase(payload.metalType || "gold");
    const karat = safeText(payload.karat);

    const weightGramsNum = toNumber(payload.weightGrams);
    const spotPriceNum = toNumber(payload.spotPrice);
    const meltValueNum = toNumber(payload.meltValue);
    const dealerLowNum = toNumber(payload.dealerLow);
    const dealerHighNum = toNumber(payload.dealerHigh);

    const notes = safeText(payload.notes);
    const createdAtISO =
      payload.createdAtISO?.trim() || new Date().toISOString();
    const valuationId = makeValuationId(createdAtISO);
    const spotSource = safeText(payload.spotSource);

    /* -------------------- PDF SETUP -------------------- */

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const ink = rgb(0.12, 0.14, 0.18);
    const muted = rgb(0.45, 0.5, 0.55);
    const rule = rgb(0.88, 0.9, 0.92);

    const margin = 56;
    let y = height - 64;

    /* -------------------- HEADER -------------------- */

    page.drawText("MarketMint", {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: ink,
    });

    y -= 22;

    page.drawText("Valuation Summary", {
      x: margin,
      y,
      size: 12,
      font,
      color: muted,
    });

    y -= 18;

    page.drawText(
      `Generated ${new Date(createdAtISO).toLocaleString("en-US")}`,
      {
        x: margin,
        y,
        size: 9,
        font,
        color: muted,
      }
    );

    y -= 22;

    page.drawText(`Valuation ID: ${valuationId}`, {
      x: margin,
      y,
      size: 9,
      font,
      color: muted,
    });

    y -= 20;

    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rule,
    });

    y -= 28;

    /* -------------------- INPUTS -------------------- */

    page.drawText("Inputs", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: ink,
    });

    y -= 18;

    const inputs: [string, string][] = [
      ["Metal", metalType],
      ["Karat / Purity", karat],
      ["Weight (g)", numberLike(weightGramsNum)],
      [
        "Spot price (USD/oz)",
        spotPriceNum ? `$${Math.round(spotPriceNum)}` : "—",
      ],
      ["Notes", notes],
    ];

    for (const [label, value] of inputs) {
      page.drawText(label, {
        x: margin,
        y,
        size: 9,
        font: fontBold,
        color: muted,
      });
      y -= 12;
      page.drawText(value, {
        x: margin,
        y,
        size: 10,
        font,
        color: ink,
        maxWidth: width - margin * 2,
      });
      y -= 20;
    }

    y -= 12;

    /* -------------------- RESULTS -------------------- */

    page.drawText("Results", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: ink,
    });

    y -= 22;

    page.drawText("Estimated melt value", {
      x: margin,
      y,
      size: 9,
      font,
      color: muted,
    });

    y -= 26;

    page.drawText(money(meltValueNum), {
      x: margin,
      y,
      size: 26,
      font: fontBold,
      color: ink,
    });

    y -= 30;

    page.drawText("Typical dealer offer band", {
      x: margin,
      y,
      size: 9,
      font,
      color: muted,
    });

    y -= 16;

    page.drawText(
      `${money(dealerLowNum)} – ${money(dealerHighNum)}`,
      {
        x: margin,
        y,
        size: 12,
        font: fontBold,
        color: ink,
      }
    );

    y -= 18;

    page.drawText(`Spot source: ${spotSource}`, {
      x: margin,
      y,
      size: 9,
      font,
      color: muted,
    });

    y -= 28;

    /* -------------------- NEXT STEPS -------------------- */

    page.drawText("Next steps", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: ink,
    });

    y -= 18;

    const steps = [
      "Get 2–3 quotes from reputable buyers (local jewelers, refiners, or online).",
      "For high-value items, verify purity with a jeweler or assay service before selling.",
      "Compare selling options and timing at marketmintapp.com (Offers Hub).",
    ];

    for (const step of steps) {
      page.drawText(`• ${step}`, {
        x: margin,
        y,
        size: 9,
        font,
        color: ink,
        maxWidth: width - margin * 2,
      });
      y -= 14;
    }

    y -= 20;

    /* -------------------- DISCLAIMER -------------------- */

    page.drawText("Important disclaimer", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: ink,
    });

    y -= 16;

    const disclaimer =
      "This document provides an informational melt value estimate based on the inputs shown and a spot price reference. " +
      "It is not an appraisal, certification, or purchase offer. Actual payouts may vary based on purity verification, " +
      "fees, shipping, insurance, local demand, and buyer margin.";

    page.drawText(disclaimer, {
      x: margin,
      y,
      size: 9,
      font,
      color: muted,
      maxWidth: width - margin * 2,
    });

    /* -------------------- FOOTER -------------------- */

    page.drawText("marketmintapp.com", {
      x: margin,
      y: 56,
      size: 9,
      font,
      color: muted,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="marketmint-valuation.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
