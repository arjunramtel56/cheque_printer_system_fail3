// ---------------------------------------------------------------------------
// /api/generate-overlay — server-side PDF overlay generator.
//
// Generates a transparent 1:1mm PDF overlay containing only the variable
// cheque fields (date, payee, amount, amount-in-words, A/C PAYEE line).
//
// SECURITY INVARIANTS:
//   1. Zod schema gates ALL input — invalid payee, amount, date or mismatched
//      amount-in-words never reach the PDF generator.
//   2. The MICR guard (enforceMicrSafety) runs on the computed layout BEFORE
//      the PDF is written. If any field risks the MICR band, the request is
//      rejected with a 400 and no PDF is generated.
//   3. No PII (full account numbers, payee names, amounts) is logged or
//      persisted beyond the transient request lifecycle.
//   4. The PDF is served with Cache-Control: no-store to prevent proxy/browser
//      caching on shared devices.
//   5. The response Content-Disposition forces a download — the PDF is never
//      embedded in a page that could leak it via Referer headers.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import type { BankTemplate, Calibration, ProfileKey } from "@/lib/types";
import { getTemplate } from "@/lib/templates";
import { isBankEnabled } from "@/lib/catalogue";
import { validateChequeForm } from "@/lib/validation/chequeSchema";
import { computeSheetLayout } from "@/lib/sheetLayout";
import { validateSafeZoneClearance, validateTemplateForPrint } from "@/lib/validation";
import { enforceMicrSafety, layoutToMicrElements } from "@/lib/security/micrGuard";

// Re-use the client-side PDF component for rendering. In a server component
// context we import it without the "use client" directive issues because
// @react-pdf/renderer is SSR-safe.
import { ChequeOverlayPDF } from "@/components/ChequeOverlayPDF";

interface OverlayRequest {
  bankKey: string;
  templateId: string;
  dateAd: string;
  payee: string;
  amount: string;
  amountInWords: string;
  lang: string;
  accountPayee: boolean;
  printMode: string;
  calibrationX: number;
  calibrationY: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as unknown;

    // --- STEP 1: Zod schema validation (input gate) ---
    const result = validateChequeForm(body);
    if (!result.success) {
      // Log only the error type (not PII) for security monitoring.
      console.warn("Generate-overlay: schema validation failed:", result.error);
      return NextResponse.json(
        { error: "Invalid input", fieldErrors: result.fieldErrors },
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = result.data!;

    // --- STEP 2: Template resolution + bank verification ---
    const template = getTemplate(data.templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }
    if (template.bankId !== data.bankKey) {
      // Deep-link safety: template must belong to the claimed bank.
      return NextResponse.json({ error: "Template-bank mismatch." }, { status: 403 });
    }
    if (!isBankEnabled(data.bankKey)) {
      return NextResponse.json({ error: "Bank is not enabled." }, { status: 403 });
    }

    // --- STEP 3: Template print-safety checks ---
    const templateErrors = validateTemplateForPrint(template);
    if (templateErrors) {
      return NextResponse.json({ error: "Template is not available for printing." }, { status: 403 });
    }

    const safeZoneErrors = validateSafeZoneClearance(template);
    if (safeZoneErrors.length > 0) {
      console.warn(
        `Generate-overlay: template "${template.id}" has safe zone violations:`,
        safeZoneErrors.map((e) => e.code).join(", "),
      );
      return NextResponse.json(
        { error: "Template has fields overlapping the reserved MICR band." },
        { status: 403 },
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
    // produce a PDF.
    const micrElements = layoutToMicrElements(layout);
    enforceMicrSafety(micrElements, template.heightMm);

    // --- STEP 5: Render PDF ---
    const blob = await pdf(
      React.createElement(ChequeOverlayPDF, {
        template,
        data: chequeData,
        mode: data.printMode as ProfileKey,
        calibration,
      }),
    ).toBlob();

    // --- STEP 6: Serve with strict security headers ---
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cheque-overlay-${template.bankId}.pdf"`,
        // No caching — prevents overlay PDFs from persisting on shared devices.
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        // Prevent framing / MIME sniffing.
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    // Catch ANY error — including MicrSecurityError from the guard.
    // Log only the error type (never PII) for security monitoring.
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Generate-overlay: ${errorName}: ${errorMessage}`);

    // Distinguish MICR violations (403) from other errors (400/500).
    if (errorName === "MicrSecurityError") {
      return NextResponse.json(
        { error: "Overlay fields risk the MICR band. Aborting generation." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate overlay." },
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
