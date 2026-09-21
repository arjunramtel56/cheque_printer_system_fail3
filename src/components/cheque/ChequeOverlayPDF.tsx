// ---------------------------------------------------------------------------
// ChequeOverlayPDF — generates a transparent, 1:1 PDF overlay for printing
// variable cheque fields (date, payee, amount, amount-in-words, A/C PAYEE line)
// onto existing bank-issued cheque stock.
//
// Design principles:
//   - The PDF page is exactly the cheque's physical dimensions (190.5 × 88.9 mm
//     for standard stock). No carrier paper, no margins.
//   - It is a TRANSPARENT overlay: only field text is rendered; the background,
//     MICR band and bank graphics are NOT drawn. The user prints this overlay
//     on a transparency or plain paper and places it over the physical cheque.
//   - Field geometry (x, y, width, fontSize) comes directly from the validated
//     BankTemplate via computeSheetLayout(), so the overlay matches the browser
//     print preview geometry exactly.
//   - Safe-zone validation runs first: if any printable field overlaps the
//     MICR/safe zone, generation is refused — the engine never crosses the
//     bank-pre-printed MICR band.
//
// Unit note: @react-pdf/renderer works in PDF points (1 pt = 1/72 inch,
// 1 mm = 72/25.4 ≈ 2.8346 pt). All geometry from computeSheetLayout is in mm;
// we convert at the boundary so the source of truth stays in mm.
// ---------------------------------------------------------------------------

"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { BankTemplate, Calibration, ProfileKey } from "@/lib/types";
import { computeSheetLayout, type ChequeData } from "@/lib/sheetLayout";
import { validateSafeZoneClearance, validateTemplateForPrint } from "@/lib/validation";

const MM_PER_PT = 0.352778;
const PT_PER_MM = 1 / MM_PER_PT;
const MONO_FAMILY = "Courier";

interface ChequeOverlayPDFProps {
  template: BankTemplate;
  data: ChequeData;
  mode: ProfileKey;
  calibration: Calibration;
}

/** Convert millimetres to PDF points. */
function mmToPt(mm: number): number {
  return mm * PT_PER_MM;
}

/**
 * A thin wrapper around @react-pdf/renderer's primitives that produces the
 * overlay document. The page is sized in points at the cheque's physical
 * dimensions, with zero margin so text lands at the correct mm coordinates.
 */
export function ChequeOverlayPDF({ template, data, mode, calibration }: ChequeOverlayPDFProps) {
  const layout = computeSheetLayout(template, data, mode, calibration);

  // Defensive: re-check safe zones at render time. The Workspace already gates
  // the print button on this, but a template edit could invalidate a cached
  // render. This guarantees the PDF never crosses the MICR band.
  const safeZoneErrors = validateSafeZoneClearance(template);
  if (safeZoneErrors.length > 0) {
    return (
      <Document>
        <Page
          size={[mmToPt(layout.pageW), mmToPt(layout.pageH)]}
          style={styles.errorPage}
        >
          <Text style={styles.errorText}>
            ERROR: A printable field overlaps a reserved zone (MICR band).
            Cannot generate overlay.
          </Text>
        </Page>
      </Document>
    );
  }

  const printableFields = layout.fields.filter((f) => f.printable && f.text !== "");

  return (
    <Document>
      <Page
        size={[mmToPt(layout.pageW), mmToPt(layout.pageH)]}
        style={styles.page}
      >
        {printableFields.map((field) => (
          <View
            key={field.key}
            style={[
              styles.field,
              {
                left: mmToPt(field.xMm),
                top: mmToPt(field.yMm),
                width: mmToPt(field.widthMm),
                fontSize: field.fontSizePt,
                textAlign: field.align,
                letterSpacing: mmToPt(field.letterSpacingMm),
                fontFamily: MONO_FAMILY,
              },
            ]}
          >
            <Text style={styles.fieldText}>{field.text}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0)",
    position: "relative",
    margin: 0,
    padding: 0,
  },
  field: {
    position: "absolute",
    color: "#000",
    lineHeight: 1.1,
    padding: 0,
    margin: 0,
  },
  fieldText: {
    color: "#000",
  },
  errorPage: {
    backgroundColor: "rgba(255, 200, 200, 1)",
    position: "relative",
    padding: 10,
    margin: 0,
  },
  errorText: {
    color: "#900",
    fontSize: 10,
  },
});

// ---------------------------------------------------------------------------
// Blob URL generator — lets the Workspace trigger a download or inline view
// ---------------------------------------------------------------------------

export interface OverlayPdfResult {
  blobUrl: string;
  blob: Blob;
  pageWidth: number;
  pageHeight: number;
}

/**
 * Render the overlay PDF to a blob URL entirely client-side.
 * Throws if the template is not print-safe (disabled, unknown bank, or
 * fields overlap the MICR band).
 */
export async function generateOverlayPdf(
  template: BankTemplate,
  data: ChequeData,
  mode: ProfileKey,
  calibration: Calibration,
): Promise<OverlayPdfResult> {
  const templateErrors = validateTemplateForPrint(template);
  if (templateErrors) {
    throw new Error(
      "Template is not available for printing. Choose a different bank template."
    );
  }

  const safeZoneErrors = validateSafeZoneClearance(template);
  if (safeZoneErrors.length > 0) {
    throw new Error(
      "A field overlaps the reserved MICR band. Correct the template before printing."
    );
  }

  const layout = computeSheetLayout(template, data, mode, calibration);

  const blob = await pdf(
    <ChequeOverlayPDF template={template} data={data} mode={mode} calibration={calibration} />
  ).toBlob();

  const blobUrl = URL.createObjectURL(blob);
  return {
    blobUrl,
    blob,
    pageWidth: layout.pageW,
    pageHeight: layout.pageH,
  };
}
