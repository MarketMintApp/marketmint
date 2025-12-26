import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      metalType,
      karat,
      weightGrams,
      spotPrice,
      meltValue,
      dealerLow,
      dealerHigh,
      notes,
      createdAtISO,
    } = body ?? {};

    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]); // US Letter

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const margin = 48;
    let y = 792 - margin;

    const drawLine = (text: string, size = 11, bold = false, color = rgb(0.12, 0.13, 0.15)) => {
      page.drawText(text, {
        x: margin,
        y,
        size,
        font: bold ? fontBold : font,
        color,
        maxWidth: 612 - margin * 2,
      });
      y -= size + 10;
    };

    const safe = (v: any) => (v == null || v === "" ? "—" : String(v));

    // Header
    drawLine("MarketMint — Valuation Summary", 18, true);
    drawLine("Melt value estimate (informational only)", 11, false, rgb(0.35, 0.38, 0.45));
    y -= 6;

    const box = (title: string, rows: Array<[string, string]>) => {
      const boxTop = y;
      const boxHeight = 22 + rows.length * 18 + 18;

      page.drawRectangle({
        x: margin,
        y: boxTop - boxHeight,
        width: 612 - margin * 2,
        height: boxHeight,
        borderColor: rgb(0.82, 0.84, 0.88),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.99),
      });

      let innerY = boxTop - 18;

      page.drawText(title, {
        x: margin + 14,
        y: innerY,
        size: 12,
        font: fontBold,
        color: rgb(0.12, 0.13, 0.15),
      });
      innerY -= 20;

      for (const [k, v] of rows) {
        page.drawText(k, {
          x: margin + 14,
          y: innerY,
          size: 10,
          font: fontBold,
          color: rgb(0.35, 0.38, 0.45),
        });

        page.drawText(v ?? "—", {
          x: margin + 190,
          y: innerY,
          size: 10,
          font,
          color: rgb(0.12, 0.13, 0.15),
        });

        innerY -= 16;
      }

      y = boxTop - boxHeight - 18;
    };

    box("Inputs", [
      ["Metal", safe(metalType)],
      ["Karat / Purity", safe(karat)],
      ["Weight (g)", safe(weightGrams)],
      ["Spot (USD / troy oz)", safe(spotPrice)],
      ["Notes", safe(notes)],
      ["Generated", safe(createdAtISO)],
    ]);

    box("Results", [
      ["Estimated melt value", safe(meltValue)],
      ["Typical dealer offer (low)", safe(dealerLow)],
      ["Typical dealer offer (high)", safe(dealerHigh)],
    ]);

    drawLine("Disclaimer", 12, true);
    drawLine(
      "Melt value is an estimate based on inputs and spot price. Buyer offers can be lower due to testing, refining, fees, and margin.",
      10,
      false,
      rgb(0.35, 0.38, 0.45)
    );

    const pdfBytes = await doc.save();

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
