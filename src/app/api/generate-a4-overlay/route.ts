// ---------------------------------------------------------------------------
// /api/generate-a4-overlay — server-side validation endpoint for A4 overlay.
//
// This endpoint performs ALL server-side security validation BEFORE any PDF
// is generated. It returns a validated, sanitized payload that the client
// uses to render an A4 PDF overlay.
//
// The A4 overlay prints cheque outlines + field text on standard A4 paper.
// Users hold the printed A4 over their physical cheque to verify alignment
// before printing on actual cheque stock.
//
// Security invariants:
//   1. Zod schema gates ALL input — invalid bank, orientation, calibration, or
//      mismatched amount-in-words never reach the response.
//   2. Template must belong to the claimed bank (deep-link safety).
//   3. Bank must be enabled and template must be enabled for print.
//   4. Safe-zone clearance is verified server-side — no field may overlap
//      the MICR band.
//   5. The MICR guard runs on the computed layout — if any field risks the
//      MICR band, the request is rejected with 403 and no overlay data is
//      returned.
//   6. The user MUST confirm physical verification (verified=true).
//   7. No PII is logged. Only error types are logged for monitoring.
//   8. Response is served with Cache-Control: no-store.
//
// The actual PDF rendering happens client-side via @react-pdf/renderer (see
// components/A4OverlayPDF.tsx) because the library is designed for
// client-side blob generation and the PDF is never stored server-side.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateA4OverlayForm } from "@/lib/validation/chequeSchema";
import { calculateA4OverlayLayout, requireTemplate, DEFAULT_INKJET_MARGINS, type OverlayConfig } from "@/lib/printMath";
import { validateTemplateForPrint, validateSafeZoneClearance } from "@/lib/validation";
import { isBankEnabled, getBank } from "@/lib/catalogue";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    // --- STEP 1: Zod schema validation (input gate) ---
    const result = validateA4OverlayForm(body);
    if (!result.success || !result.data) {
      console.warn("A4-overlay: schema validation failed:", result.error);
      return NextResponse.json(
        { error: result.error ?? "Invalid input", fieldErrors: result.fieldErrors },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        },
      );
    }

    const data = result.data;

    // --- STEP 2: Template resolution + bank verification ---
    const template = requireTemplate(data.bankKey);
    const bank = getBank(template.bankId);

    if (!bank || !bank.enabled) {
      return NextResponse.json(
        { error: "Selected bank is not enabled." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (template.bankId !== data.bankKey) {
      console.warn(`A4-overlay: template-bank mismatch (${template.id} vs ${data.bankKey})`);
      return NextResponse.json(
        { error: "Template-bank mismatch." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const templateErrors = validateTemplateForPrint(template);
    if (templateErrors) {
      return NextResponse.json(
        { error: "Template is not available for printing." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const safeZoneErrors = validateSafeZoneClearance(template);
    if (safeZoneErrors.length > 0) {
      console.warn(
        `A4-overlay: template "${template.id}" has safe zone violations:`,
        safeZoneErrors.map((e) => e.code).join(", "),
      );
      return NextResponse.json(
        { error: "Template has fields overlapping the reserved MICR band." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    // --- STEP 3: Compute A4 overlay layout (includes MICR guard) ---
    const overlayLayout = calculateA4OverlayLayout(
      template,
      {
        bankKey: data.bankKey,
        orientation: data.orientation,
        chequesPerPage: data.chequesPerPage,
        offsetX: data.offsetX,
        offsetY: data.offsetY,
        printerMargins: DEFAULT_INKJET_MARGINS,
        verified: data.verified,
      },
      {
        date: data.amount,
        payee: "",
        amount: data.amount,
        amountWords: data.amountInWords,
        accountPayee: true,
      },
    );

    // --- STEP 4: MICR guard enforcement (final check) ---
    if (!overlayLayout.fullyMicrSafe) {
      console.warn("A4-overlay: MICR safety violation detected — blocking generation.");
      return NextResponse.json(
        { error: "Overlay fields risk the MICR band. Aborting generation." },
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // --- STEP 5: Return validated, sanitized payload for client-side PDF ---
    return NextResponse.json(
      {
        ok: true,
        templateId: template.id,
        bankKey: template.bankId,
        bankName: template.bankName,
        widthMm: template.widthMm,
        heightMm: template.heightMm,
        templateOrientation: template.orientation,
        orientation: data.orientation,
        chequesPerPage: data.chequesPerPage,
        offsetX: data.offsetX,
        offsetY: data.offsetY,
        chequeData: {
          amount: data.amount,
          amountInWords: data.amountInWords,
          lang: data.lang,
        },
        safeZones: template.safeZones,
        overlayLayout: {
          pageWidth: overlayLayout.pageWidth,
          pageHeight: overlayLayout.pageHeight,
          orientation: overlayLayout.orientation,
          cheques: overlayLayout.cheques.map((c) => ({
            index: c.index,
            chequeX: c.chequeX,
            chequeY: c.chequeY,
            allMicrSafe: c.allMicrSafe,
            fields: c.fields.map((f) => ({
              key: f.key,
              xMm: f.xMm,
              yMm: f.yMm,
              widthMm: f.widthMm,
              heightMm: f.heightMm,
              text: f.text,
              fontSizePt: f.fontSizePt,
              micrSafe: f.micrSafe,
            })),
          })),
        },
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      },
    );
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`A4-overlay: ${errorName}: ${errorMessage}`);

    if (errorName === "MicrSecurityError") {
      return NextResponse.json(
        { error: "Overlay fields risk the MICR band. Aborting generation." },
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      { error: "Failed to validate A4 overlay request." },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
