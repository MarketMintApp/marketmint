// app/api/pdf/valuation/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PdfPayload = {
  metalType?: string; // "gold" | "silver" | "platinum" | etc
  karat?: number | string;
  weightGrams?: number | string;
  spotPrice?: number | string;

  meltValue?: number | string;
  dealerLow?: number | string;
  dealerHigh?: number | string;

  notes?: string;
  createdAtISO?: string;

  // Optional (future-safe; won’t break callers)
  spotSource?: string;
};

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
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
  return s ? s : "—";
}

function clampText(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, Math.max(0, maxLen - 1)).trimEnd() + "…";
}

function money(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function numberLike(v: number | null, digits = 2): string {
  if (v === null) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function titleCase(s: string): string {
  const x = (s || "").toLowerCase().trim();
  if (!x) return "—";
  return x.charAt(0).toUpperCase() + x.slice(1);
}

/**
 * Word-wrap helper for pdf-lib.
 * Splits text into lines that fit within maxWidth using the provided font.
 */
function wrapText(params: {
  text: string;
  font: any;
  fontSize: number;
  maxWidth: number;
}): string[] {
  const { text, font, fontSize, maxWidth } = params;

  const normalized = String(text)
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return ["—"];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    const width = font.widthOfTextAtSize(test, fontSize);

    if (width <= maxWidth) {
      current = test;
      continue;
    }

    if (current) lines.push(current);
    current = w;

    // Hard cut very long words (rare)
    if (font.widthOfTextAtSize(current, fontSize) > maxWidth) {
      let chunk = "";
      for (const ch of current) {
        const next = chunk + ch;
        if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
          chunk = next;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function makeValuationId(createdAtISO: string) {
  // MM-YYYYMMDD-XXXXXX
  const d = new Date(createdAtISO);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
  return `MM-${yyyy}${mm}${dd}-${rand}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PdfPayload;

    const metalTypeRaw = (body.metalType ?? "gold").toString().toLowerCase();
    const metalType =
      metalTypeRaw === "au"
        ? "gold"
        : metalTypeRaw === "ag"
          ? "silver"
          : metalTypeRaw === "pt"
            ? "platinum"
            : metalTypeRaw;

    const karat = safeText(body.karat);

    const weightGramsNum = toNumber(body.weightGrams);
    const spotPriceNum = toNumber(body.spotPrice);

    const meltValueNum = toNumber(body.meltValue);
    const dealerLowNum = toNumber(body.dealerLow);
    const dealerHighNum = toNumber(body.dealerHigh);

    const notes = clampText(safeText(body.notes), 260);

    const createdAtISO =
      typeof body.createdAtISO === "string" && body.createdAtISO.trim()
        ? body.createdAtISO.trim()
        : new Date().toISOString();

    const valuationId = makeValuationId(createdAtISO);
    const spotSource = clampText(safeText(body.spotSource), 60);

    // ---- PDF setup
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Palette (professional + print-friendly)
    const brand = rgb(0.06, 0.75, 0.52); // emerald-ish accent
    const ink = rgb(0.10, 0.12, 0.16);
    const muted = rgb(0.42, 0.47, 0.55);
    const line = rgb(0.86, 0.89, 0.93);
    const cardBg = rgb(0.985, 0.99, 1.0);

    const marginX = 52;
    const marginTop = 52;
    const marginBottom = 56;

    // Helpers
    const drawCard = (x: number, yTop: number, w: number, h: number) => {
      page.drawRectangle({
        x,
        y: yTop - h,
        width: w,
        height: h,
        color: cardBg,
        borderColor: line,
        borderWidth: 1,
      });
    };

    const drawTextRight = (
      text: string,
      xRight: number,
      y: number,
      size: number,
      bold = false,
      color = ink
    ) => {
      const f = bold ? fontBold : fontRegular;
      const w = f.widthOfTextAtSize(text, size);
      page.drawText(text, { x: xRight - w, y, size, font: f, color });
    };

    const drawSectionTitle = (text: string, x: number, y: number) => {
      page.drawText(text, {
        x,
        y,
        size: 11,
        font: fontBold,
        color: ink,
      });
      page.drawLine({
        start: { x, y: y - 10 },
        end: { x: x + 92, y: y - 10 },
        thickness: 2,
        color: brand,
        opacity: 0.55,
      });
    };

    const drawLabelValueRow = (params: {
      x: number;
      y: number;
      label: string;
      value: string;
      labelW: number;
      valueW: number;
    }) => {
      const { x, y, label, value, labelW, valueW } = params;
      page.drawText(label, { x, y, size: 9, font: fontBold, color: muted });
      page.drawText(value, {
        x: x + labelW,
        y,
        size: 9,
        font: fontRegular,
        color: ink,
        maxWidth: valueW,
      });
    };

  // ---- Subtle watermark (bottom whitespace) — centered + smaller
const wmText = "MarketMint";
const wmSize = 48; // smaller
const wmAngle = degrees(16);

const wmWidth = fontBold.widthOfTextAtSize(wmText, wmSize);

// Center horizontally (based on actual rendered width)
const wmX = (width - wmWidth) / 2;

// Place low enough to fill whitespace but clear the footer line/text
const wmY = 84;

page.drawText(wmText, {
  x: wmX,
  y: wmY,
  size: wmSize,
  font: fontBold,
  color: brand,
  rotate: wmAngle,
  opacity: 0.035,
});



    // ---- Header
    const headerTopY = height - marginTop;

    // Logo mark (circle + centered MM)
    const markR = 12;
    const markCX = marginX + markR;
    const markCY = headerTopY - 4;

    page.drawCircle({
      x: markCX,
      y: markCY,
      size: markR,
      borderColor: brand,
      borderWidth: 1.5,
      color: rgb(1, 1, 1),
    });

    const mmText = "MM";
    const mmSize = 9;
    const mmW = fontBold.widthOfTextAtSize(mmText, mmSize);
    page.drawText(mmText, {
      x: markCX - mmW / 2,
      y: markCY - mmSize / 2 + 1.2,
      size: mmSize,
      font: fontBold,
      color: brand,
    });

    // Brand + title
    page.drawText("MarketMint", {
      x: marginX + 34,
      y: headerTopY + 2,
      size: 16,
      font: fontBold,
      color: ink,
    });

    page.drawText("Valuation Summary", {
      x: marginX + 34,
      y: headerTopY - 18,
      size: 11,
      font: fontRegular,
      color: muted,
    });

    // Right meta
    page.drawText("Generated", {
      x: width - marginX - 160,
      y: headerTopY + 2,
      size: 9,
      font: fontBold,
      color: muted,
    });
    page.drawText(createdAtISO, {
      x: width - marginX - 160,
      y: headerTopY - 12,
      size: 9,
      font: fontRegular,
      color: ink,
      maxWidth: 160,
    });

    // Divider
    page.drawLine({
      start: { x: marginX, y: headerTopY - 34 },
      end: { x: width - marginX, y: headerTopY - 34 },
      thickness: 1,
      color: line,
    });

    // ---- Metadata row (legit signal)
    const metaY = headerTopY - 54;
    const metaFont = 9;

    const metaLeft = `${valuationId}`;
    const metaMid = `${titleCase(metalType)} • ${safeText(karat)} • ${numberLike(weightGramsNum, 2)}g`;
    const metaRight =
      spotPriceNum === null
        ? `Spot: —`
        : `Spot: $${Math.round(spotPriceNum)} / oz`;

    page.drawText(metaLeft, {
      x: marginX,
      y: metaY,
      size: metaFont,
      font: fontBold,
      color: ink,
    });

    page.drawText(metaMid, {
      x: marginX + 155,
      y: metaY,
      size: metaFont,
      font: fontRegular,
      color: muted,
      maxWidth: 260,
    });

    drawTextRight(metaRight, width - marginX, metaY, metaFont, true, muted);

    // Optional source under spot (if provided)
    if (spotSource !== "—") {
      drawTextRight(
        `Source: ${spotSource}`,
        width - marginX,
        metaY - 12,
        8,
        false,
        muted
      );
    }

    // ---- Content layout
    const contentTop = headerTopY - 78;
    const gap = 16;
    const cardW = (width - marginX * 2 - gap) / 2;
    const leftX = marginX;
    const rightX = marginX + cardW + gap;

    // Cards: Inputs + Results
    const cardH = 196;

    // Inputs card
    drawCard(leftX, contentTop, cardW, cardH);
    drawSectionTitle("Inputs", leftX + 16, contentTop - 24);

    const labelW = 120;
    const valueW = cardW - 16 - 16 - labelW;

    let y = contentTop - 58;
    const rowStep = 18;

    drawLabelValueRow({
      x: leftX + 16,
      y,
      label: "Metal",
      value: titleCase(metalType),
      labelW,
      valueW,
    });
    y -= rowStep;

    drawLabelValueRow({
      x: leftX + 16,
      y,
      label: "Karat / Purity",
      value: safeText(karat),
      labelW,
      valueW,
    });
    y -= rowStep;

    drawLabelValueRow({
      x: leftX + 16,
      y,
      label: "Weight (g)",
      value: numberLike(weightGramsNum, 2),
      labelW,
      valueW,
    });
    y -= rowStep;

    drawLabelValueRow({
      x: leftX + 16,
      y,
      label: "Spot (USD/oz)",
      value: spotPriceNum === null ? "—" : String(Math.round(spotPriceNum)),
      labelW,
      valueW,
    });
    y -= rowStep;

    // Notes (wrapped, max 3 lines)
    page.drawText("Notes", {
      x: leftX + 16,
      y,
      size: 9,
      font: fontBold,
      color: muted,
    });

    const notesLines = wrapText({
      text: notes === "—" ? "—" : notes,
      font: fontRegular,
      fontSize: 9,
      maxWidth: valueW,
    }).slice(0, 3);

    let ny = y;
    for (let i = 0; i < notesLines.length; i++) {
      page.drawText(notesLines[i], {
        x: leftX + 16 + labelW,
        y: ny,
        size: 9,
        font: fontRegular,
        color: ink,
      });
      ny -= 12;
    }

    // Results card
    drawCard(rightX, contentTop, cardW, cardH);
    drawSectionTitle("Results", rightX + 16, contentTop - 24);

    // Headline
    page.drawText("Estimated melt value", {
      x: rightX + 16,
      y: contentTop - 62,
      size: 9,
      font: fontBold,
      color: muted,
    });

    const meltText = money(meltValueNum);
    page.drawText(meltText, {
      x: rightX + 16,
      y: contentTop - 102,
      size: 28,
      font: fontBold,
      color: ink,
    });

    // Spot used (right aligned) — safely inside card padding
    const spotLabelY = contentTop - 72;
    const spotValueY = contentTop - 92;

    drawTextRight("Spot used", rightX + cardW - 16, spotLabelY, 9, true, muted);
    drawTextRight(
      spotPriceNum === null ? "—" : `$${Math.round(spotPriceNum)}`,
      rightX + cardW - 16,
      spotValueY,
      14,
      true,
      ink
    );

    // Divider
    page.drawLine({
      start: { x: rightX + 16, y: contentTop - 120 },
      end: { x: rightX + cardW - 16, y: contentTop - 120 },
      thickness: 1,
      color: line,
    });

    // Dealer band callout
    page.drawText("Typical dealer offer band (heuristic)", {
      x: rightX + 16,
      y: contentTop - 142,
      size: 9,
      font: fontBold,
      color: muted,
    });

    const band =
      dealerLowNum === null && dealerHighNum === null
        ? "—"
        : `${money(dealerLowNum)} – ${money(dealerHighNum)}`;

    page.drawText(band, {
      x: rightX + 16,
      y: contentTop - 160,
      size: 12,
      font: fontBold,
      color: ink,
    });

    // Reference note (wrapped to stay inside Results card)
const refLines = wrapText({
  text: "Reference only — real quotes vary by buyer and verification.",
  font: fontRegular,
  fontSize: 9,
  maxWidth: cardW - 32,
});

let refY = contentTop - 176;
for (const line of refLines) {
  page.drawText(line, {
    x: rightX + 16,
    y: refY,
    size: 9,
    font: fontRegular,
    color: muted,
  });
  refY -= 12;
}


    // ---- Next steps box (premium feel + behavioral nudge)
    const nextTop = contentTop - cardH - 18;
    const nextH = 92;
    drawCard(marginX, nextTop, width - marginX * 2, nextH);
    drawSectionTitle("Next steps", marginX + 16, nextTop - 24);

    const steps = [
      "Get 2–3 quotes from reputable buyers (local jewelers, refiners, or online).",
      "For high-value items, verify purity with a jeweler or assay service before selling.",
      "Compare selling options and timing at marketmintapp.com (Offers Hub).",
    ];

    const bulletX = marginX + 18;
    const textX = marginX + 32;
    const maxW = width - marginX * 2 - 40;

    let sy = nextTop - 52;
    for (const s of steps) {
      // bullet dot
      page.drawCircle({
        x: bulletX,
        y: sy + 3,
        size: 1.7,
        color: muted,
      });

      const lines = wrapText({
        text: s,
        font: fontRegular,
        fontSize: 10,
        maxWidth: maxW,
      });

      for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], {
          x: textX,
          y: sy,
          size: 10,
          font: fontRegular,
          color: muted,
        });
        sy -= 14;
      }
      sy -= 2;
    }

    // ---- Disclaimer card (bullets; no jumble)
    const discTop = nextTop - nextH - 16;
    const discH = 152;
    drawCard(marginX, discTop, width - marginX * 2, discH);
    drawSectionTitle("Important disclaimer", marginX + 16, discTop - 24);

    const missingBits: string[] = [];
    if (weightGramsNum === null) missingBits.push("weight");
    if (spotPriceNum === null) missingBits.push("spot price");
    if (safeText(body.karat) === "—") missingBits.push("karat/purity");

    const disclaimerBullets: string[] = [
      "This document provides an informational melt value estimate based on the inputs shown and a spot price reference.",
      "It is not an appraisal, certification, or purchase offer.",
      "Actual payouts may be lower due to purity verification, refining/processing fees, shipping/insurance, local demand, and buyer margin.",
    ];

    if (meltValueNum !== null && meltValueNum >= 5000) {
      disclaimerBullets.push(
        "For higher-value items, verify purity with a reputable jeweler or assay service before selling."
      );
    }

    if (missingBits.length) {
      disclaimerBullets.push(
        `Note: This estimate may be incomplete because ${missingBits.join(
          ", "
        )} was not provided.`
      );
    }

    let dy = discTop - 54;
    const discTextMaxW = width - marginX * 2 - 44;

    for (const b of disclaimerBullets) {
      // bullet dot
      page.drawCircle({
        x: marginX + 18,
        y: dy + 3,
        size: 1.7,
        color: muted,
      });

      const lines = wrapText({
        text: b,
        font: fontRegular,
        fontSize: 10,
        maxWidth: discTextMaxW,
      });

      for (const lineText of lines) {
        if (dy < discTop - discH + 24) break;
        page.drawText(lineText, {
          x: marginX + 32,
          y: dy,
          size: 10,
          font: fontRegular,
          color: muted,
        });
        dy -= 14;
      }

      dy -= 2;
      if (dy < discTop - discH + 24) break;
    }

    // ---- Footer
    page.drawLine({
      start: { x: marginX, y: marginBottom },
      end: { x: width - marginX, y: marginBottom },
      thickness: 1,
      color: line,
    });

    page.drawText("marketmintapp.com", {
      x: marginX,
      y: marginBottom - 18,
      size: 9,
      font: fontRegular,
      color: muted,
    });

    page.drawText("For informational use only — not an appraisal or offer", {
      x: marginX,
      y: marginBottom - 32,
      size: 9,
      font: fontRegular,
      color: muted,
    });

    drawTextRight("© MarketMint", width - marginX, marginBottom - 18, 9, false, muted);
    drawTextRight("Page 1 of 1", width - marginX, marginBottom - 32, 9, false, muted);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="marketmint-valuation.pdf"',
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
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
