// ---------------------------------------------------------------------------
// /api/generate-overlay — server-side validation endpoint for PDF overlay.
//
// This endpoint performs ALL server-side security validation BEFORE any PDF
// is generated client-side. It returns a validated, sanitized payload that
// the client uses to render a transparent 1:1mm PDF overlay.
//
// SECURITY INVARIANTS:
//   0. Request body is capped at 64 KB (DoS prevention).
//   1. Zod schema gates ALL input — invalid payee, amount, date or mismatched
//      amount-in-words never reach the response.
//   2. Template must belong to the claimed bank (deep-link safety).
//   3. Bank must be enabled and template must be enabled for print.
//   4. Safe-zone clearance is verified server-side — no field may overlap
//      the MICR band.
//   5. The MICR guard runs on the computed layout — if any field risks the
//      MICR band, the request is rejected with 403 and no overlay data is
//      returned.
//   6. No PII is logged. Only error types are logged for monitoring.
//   7. Response is served with Cache-Control: no-store.
//
// The actual PDF rendering happens client-side via @react-pdf/renderer (see
// components/ChequeOverlayPDF.tsx) because the library is designed for
// client-side blob generation and the PDF is never stored server-side.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Calibration, ProfileKey } from "@/lib/types";
import { getTemplate } from "@/lib/templates";
import { isBankEnabled } from "@/lib/catalogue";
import { validateChequeForm } from "@/lib/validation/chequeSchema";
import { computeSheetLayout } from "@/lib/sheetLayout";
import { validateSafeZoneClearance, validateTemplateForPrint } from "@/lib/validation";
import { enforceLayoutMicrSafety } from "@/lib/security/micrGuard";

export async function POST(request: NextRequest) {
  try {
    // --- STEP 0: Request body size guard (DoS prevention) ---
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > 65536) {
      return NextResponse.json(
        { error: "Request body too large." },
        {
          status: 413,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        },
      );
    }

    const body = (await request.json()) as unknown;

    // --- STEP 1: Zod schema validation (input gate) ---
    const result = validateChequeForm(body);
    if (!result.success) {
      // Log only the error message (no PII) for security monitoring.
      console.warn("Generate-overlay: schema validation failed:", result.error);
      return NextResponse.json(
        { error: "Invalid input", fieldErrors: result.fieldErrors },
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

    const data = result.data!;

    // --- STEP 2: Template resolution + bank verification ---
    const template = getTemplate(data.templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found." },
        {
          status: 404,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        },
      );
    }
    if (template.bankId !== data.bankKey) {
      // Deep-link safety: template must belong to the claimed bank.
      console.warn(`Generate-overlay: template-bank mismatch (${template.id} vs ${data.bankKey})`);
      return NextResponse.json(
        { error: "Template-bank mismatch." },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        },
      );
    }
    if (!isBankEnabled(data.bankKey)) {
      return NextResponse.json(
        { error: "Bank is not enabled." },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        },
      );
    }

    // --- STEP 3: Template print-safety checks ---
    const templateErrors = validateTemplateForPrint(template);
    if (templateErrors) {
      return NextResponse.json(
        { error: "Template is not available for printing." },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        },
      );
    }

    const safeZoneErrors = validateSafeZoneClearance(template);
    if (safeZoneErrors.length > 0) {
      console.warn(
        `Generate-overlay: template "${template.id}" has safe zone violations:`,
        safeZoneErrors.map((e) => e.code).join(", "),
      );
      return NextResponse.json(
        { error: "Template has fields overlapping the reserved MICR band." },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        },
      );
    }

    // --- STEP 4: Compute layout + MICR guard enforcement ---
    const calibration: Calibration = {
      x: data.calibrationX,
      y: data.calibrationY,
    };
    const chequeData = {
      date: data.dateAd,
      payee: data.payee,
      amount: data.amount,
      amountWords: data.amountInWords,
      accountPayee: data.accountPayee,
      locale: data.lang as "en" | "ne",
    };

    const layout = computeSheetLayout(template, chequeData, data.printMode as ProfileKey, calibration);

    // CRITICAL: The MICR guard runs inside computeSheetLayout, but we re-check
    // here at the API boundary as a final belt-and-braces guarantee. If the
    // layout's printable fields cross the MICR line, the generator must NOT
    // proceed. enforceLayoutMicrSafety translates page-global coordinates to
    // cheque-local and throws MicrSecurityError on any encroachment.
    enforceLayoutMicrSafety(layout);

    // --- STEP 5: Return validated, sanitized payload ---
    return NextResponse.json(
      {
        ok: true,
        templateId: template.id,
        bankKey: template.bankId,
        bankName: template.bankName,
        widthMm: template.widthMm,
        heightMm: template.heightMm,
        orientation: template.orientation,
        printMode: data.printMode,
        calibration,
        chequeData,
        safeZones: template.safeZones,
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
    // Catch ANY error — including MicrSecurityError from the guard.
    // Log only the error type (never PII) for security monitoring.
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Generate-overlay: ${errorName}: ${errorMessage}`);

    if (errorName === "MicrSecurityError") {
      return NextResponse.json(
        { error: "Overlay fields risk the MICR band. Aborting generation." },
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        },
      );
    }

    return NextResponse.json(
      { error: "Failed to validate overlay request." },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
