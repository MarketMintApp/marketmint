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
    const createdAtISO = payload.createdAtISO?.trim() || new Date().toISOString();
    const valuationId = makeValuationId(createdAtISO);
    const spotSource = safeText(payload.spotSource);

    /* -------------------- PDF SETUP -------------------- */

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Palette (subtle, premium)
    const ink = rgb(0.12, 0.14, 0.18);
    const muted = rgb(0.45, 0.5, 0.55);
    const rule = rgb(0.88, 0.9, 0.92);
    const surface = rgb(0.97, 0.975, 0.98);
    const surface2 = rgb(0.945, 0.955, 0.965);
    const accent = rgb(0.12, 0.22, 0.40); // deep blue, restrained

    const margin = 56;
    const contentW = width - margin * 2;

    const fmtGenerated = new Date(createdAtISO).toLocaleString("en-US");

    const drawRule = (y: number) => {
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: rule,
      });
    };

    const drawSectionTitle = (title: string, y: number) => {
      page.drawText(title, {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: ink,
      });
      page.drawLine({
        start: { x: margin, y: y - 8 },
        end: { x: width - margin, y: y - 8 },
        thickness: 1,
        color: rule,
      });
      return y - 26;
    };

    // Value/label row helper (supports wrapping values)
    const drawField = (label: string, value: string, x: number, y: number, w: number) => {
      page.drawText(label, {
        x,
        y,
        size: 8.5,
        font: fontBold,
        color: muted,
      });
      page.drawText(value, {
        x,
        y: y - 12,
        size: 10,
        font,
        color: ink,
        maxWidth: w,
        lineHeight: 12,
      });
      // allocate space: label(0) + value(~24) baseline
      return y - 36;
    };

    /* -------------------- HEADER -------------------- */

    let y = height - 64;

    // Top brand line
    page.drawText("MarketMint", {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: ink,
    });

    // Small brand accent bar
    page.drawRectangle({
      x: margin,
      y: y - 10,
      width: 62,
      height: 2,
      color: accent,
      borderColor: accent,
    });

    // Right-side meta
    const rightX = width - margin;
    page.drawText("Valuation Report", {
      x: rightX - 120,
      y: y + 2,
      size: 10,
      font: fontBold,
      color: muted,
    });

    page.drawText(`Valuation ID: ${valuationId}`, {
      x: rightX - 180,
      y: y - 14,
      size: 9,
      font,
      color: muted,
    });

    page.drawText(`Generated: ${fmtGenerated}`, {
      x: rightX - 180,
      y: y - 28,
      size: 9,
      font,
      color: muted,
    });

    y -= 46;
    drawRule(y);
    y -= 26;

    /* -------------------- HERO VALUE CARD -------------------- */

    const cardH = 122;
    page.drawRectangle({
      x: margin,
      y: y - cardH + 10,
      width: contentW,
      height: cardH,
      color: surface,
      borderColor: rule,
      borderWidth: 1,
    });

    // Left: item summary
    page.drawText("Item summary", {
      x: margin + 16,
      y: y - 18,
      size: 9,
      font: fontBold,
      color: muted,
    });

    page.drawText(`${metalType} • ${karat}`, {
      x: margin + 16,
      y: y - 38,
      size: 14,
      font: fontBold,
      color: ink,
      maxWidth: contentW * 0.55,
    });

    const wtLine =
      weightGramsNum !== null ? `${numberLike(weightGramsNum)} g` : "—";
    const spotLine =
      spotPriceNum ? `$${Math.round(spotPriceNum)} / oz` : "—";

    page.drawText(`Weight: ${wtLine}`, {
      x: margin + 16,
      y: y - 60,
      size: 10,
      font,
      color: ink,
    });

    page.drawText(`Spot price: ${spotLine}`, {
      x: margin + 16,
      y: y - 76,
      size: 10,
      font,
      color: ink,
    });

    // Right: melt value
    const meltX = margin + contentW * 0.60;
    page.drawText("Estimated melt value", {
      x: meltX,
      y: y - 18,
      size: 9,
      font: fontBold,
      color: muted,
    });

    page.drawText(money(meltValueNum), {
      x: meltX,
      y: y - 52,
      size: 28,
      font: fontBold,
      color: ink,
    });

    page.drawText("Typical dealer offer band", {
      x: meltX,
      y: y - 76,
      size: 9,
      font,
      color: muted,
    });

    page.drawText(`${money(dealerLowNum)} – ${money(dealerHighNum)}`, {
      x: meltX,
      y: y - 94,
      size: 12,
      font: fontBold,
      color: ink,
    });

    y -= cardH + 18;

    /* -------------------- INPUTS (TWO COLUMN) -------------------- */

    y = drawSectionTitle("Inputs", y);

    const colGap = 18;
    const colW = (contentW - colGap) / 2;
    const leftColX = margin;
    const rightColX = margin + colW + colGap;

    const yStart = y;

    // Left column
    let yL = yStart;
    yL = drawField("METAL", metalType, leftColX, yL, colW);
    yL = drawField("KARAT / PURITY", safeText(karat), leftColX, yL, colW);
    yL = drawField("WEIGHT (GRAMS)", numberLike(weightGramsNum), leftColX, yL, colW);

    // Right column
    let yR = yStart;
    yR = drawField(
      "SPOT PRICE (USD/OZ)",
      spotPriceNum ? `$${Math.round(spotPriceNum)}` : "—",
      rightColX,
      yR,
      colW
    );
    yR = drawField("SPOT SOURCE", spotSource, rightColX, yR, colW);

    // Notes spans full width (with light background)
    const notesBoxY = Math.min(yL, yR) - 6;
    const notesBoxH = 74;

    page.drawRectangle({
      x: margin,
      y: notesBoxY - notesBoxH + 14,
      width: contentW,
      height: notesBoxH,
      color: surface2,
      borderColor: rule,
      borderWidth: 1,
    });

    page.drawText("NOTES", {
      x: margin + 14,
      y: notesBoxY,
      size: 8.5,
      font: fontBold,
      color: muted,
    });

    page.drawText(notes, {
      x: margin + 14,
      y: notesBoxY - 14,
      size: 10,
      font,
      color: ink,
      maxWidth: contentW - 28,
      lineHeight: 12,
    });

    y = notesBoxY - notesBoxH - 8;

    /* -------------------- NEXT STEPS -------------------- */

    y = drawSectionTitle("Recommended next steps", y);

    const steps = [
      "Get 2–3 quotes from reputable buyers (local jewelers, refiners, or online).",
      "For high-value items, verify purity with a jeweler or assay service before selling.",
      "Compare selling options and timing at marketmintapp.com (Offers Hub).",
    ];

    const bulletX = margin + 10;
    const textX = margin + 24;

    for (const step of steps) {
      // bullet
      page.drawText("•", { x: bulletX, y, size: 12, font: fontBold, color: accent });
      // text
      page.drawText(step, {
        x: textX,
        y,
        size: 10,
        font,
        color: ink,
        maxWidth: contentW - 24,
        lineHeight: 13,
      });
      y -= 18;
    }

    y -= 8;

    /* -------------------- DISCLAIMER (BOTTOM CARD) -------------------- */

    const footerY = 56;

    const disclaimer =
      "This document provides an informational melt value estimate based on the inputs shown and a spot price reference. " +
      "It is not an appraisal, certification, or purchase offer. Actual payouts may vary based on purity verification, " +
      "fees, shipping, insurance, local demand, and buyer margin.";

    // Keep disclaimer above footer no matter what
    const disclaimerCardH = 88;
    const disclaimerY = Math.max(y - disclaimerCardH, footerY + 72);

    page.drawRectangle({
      x: margin,
      y: disclaimerY,
      width: contentW,
      height: disclaimerCardH,
      color: surface,
      borderColor: rule,
      borderWidth: 1,
    });

    page.drawText("Important disclaimer", {
      x: margin + 14,
      y: disclaimerY + disclaimerCardH - 22,
      size: 10,
      font: fontBold,
      color: ink,
    });

    page.drawText(disclaimer, {
      x: margin + 14,
      y: disclaimerY + disclaimerCardH - 40,
      size: 9,
      font,
      color: muted,
      maxWidth: contentW - 28,
      lineHeight: 12,
    });

    /* -------------------- FOOTER -------------------- */

    drawRule(footerY + 18);

    page.drawText("marketmintapp.com", {
      x: margin,
      y: footerY,
      size: 9,
      font: fontBold,
      color: muted,
    });

    page.drawText(`Valuation ID: ${valuationId}`, {
      x: margin,
      y: footerY - 14,
      size: 9,
      font,
      color: muted,
    });

    page.drawText(fmtGenerated, {
      x: width - margin - 180,
      y: footerY,
      size: 9,
      font,
      color: muted,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="marketmint-valuation.pdf"',
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
