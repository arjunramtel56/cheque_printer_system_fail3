// ---------------------------------------------------------------------------
// A4OverlayPDF — generates a transparent A4 PDF with cheque outlines and
// field text for physical alignment verification.
//
// This component renders an A4 page (210 x 297 mm portrait or 297 x 210 mm
// landscape) with:
//   - Cheque outlines (light grey rectangles) at computed positions
//   - Field text (payee, amount, amount-in-words, date) at computed positions
//   - Alignment guides at page corners (red crosses)
//   - A security warning baked into the PDF
//
// The user prints this A4 overlay on plain paper, then holds it over their
// physical cheque to verify that fields align before printing on real
// cheque stock.
//
// Design principles:
//   - The PDF page is exactly A4 (portrait or landscape).
//   - It is a TRANSPARENT overlay: only field text and outlines are rendered;
//     the background, MICR band and bank graphics are NOT drawn.
//   - The user MUST confirm physical verification before generation.
//   - MICR safety is enforced: if any field would touch the MICR band,
//     the component renders an error page instead.
// ---------------------------------------------------------------------------

"use client";

import React, { CSSProperties } from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { A4OverlayOutput } from "@/lib/validation/chequeSchema";
import type { A4OverlayLayout, FieldPosition, ChequePlacement } from "@/lib/printMath";
import { A4_WIDTH_MM, A4_HEIGHT_MM, CHEQUE_WIDTH_MM, CHEQUE_HEIGHT_MM, MICR_SAFETY_TOP_MM } from "@/lib/printMath";

const MM_PER_PT = 0.352778;
const PT_PER_MM = 1 / MM_PER_PT;
const MONO_FAMILY = "Courier";

interface A4OverlayPDFProps {
  layout: A4OverlayLayout;
  data: A4OverlayOutput;
}

/**
 * Render the A4 overlay PDF document.
 *
 * @param layout  The computed overlay layout (from calculateA4OverlayLayout)
 * @param data    The validated A4 overlay form data
 */
export function A4OverlayPDF({ layout, data }: A4OverlayPDFProps) {
  const { pageWidth, pageHeight, cheques } = layout;

  if (!layout.fullyMicrSafe) {
    return (
      <Document>
        <Page
          size={[mmToPt(pageWidth), mmToPt(pageHeight)]}
          style={styles.errorPage}
        >
          <Text style={styles.errorText}>
            ERROR: A printable field overlaps the MICR band. Cannot generate overlay.
          </Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page
        size={[mmToPt(pageWidth), mmToPt(pageHeight)]}
        style={[styles.page, orientationStyle(data.orientation)]}
      >
        {/* Cheque outlines */}
        {cheques.map((cheque) => (
          <View
            key={`cheque-outline-${cheque.index}`}
            style={[
              styles.chequeOutline,
              {
                left: mmToPt(cheque.chequeX),
                top: mmToPt(cheque.chequeY),
                width: mmToPt(CHEQUE_WIDTH_MM),
                height: mmToPt(CHEQUE_HEIGHT_MM),
              },
            ]}
          />
        ))}

        {/* Field text for each cheque */}
        {cheques.map((cheque) =>
          cheque.fields.map((field) => {
            if (field.text === "") return null;
            return (
              <View
                key={`field-${cheque.index}-${field.key}`}
                style={[
                  styles.field,
                  {
                    left: mmToPt(field.xMm),
                    top: mmToPt(field.yMm),
                    width: mmToPt(field.widthMm),
                    fontSize: field.fontSizePt,
                  },
                ]}
              >
                <Text style={styles.fieldText}>{field.text}</Text>
              </View>
            );
          }),
        )}

        {/* Alignment guides at page corners */}
        <AlignmentGuides pageWidth={pageWidth} pageHeight={pageHeight} />

        {/* MICR safety line indicator (dotted line at cheque-local Y) */}
        {cheques.map((cheque) => (
          <View
            key={`micr-line-${cheque.index}`}
            style={[
              styles.micrLine,
              {
                top: mmToPt(cheque.chequeY + MICR_SAFETY_TOP_MM),
                width: mmToPt(CHEQUE_WIDTH_MM),
                left: mmToPt(cheque.chequeX),
              },
            ]}
          />
        ))}

        {/* Security warning at bottom of page */}
        <Text style={[styles.securityWarning, { top: mmToPt(pageHeight - 12) }]}>
          PRINT AT 100% SCALE — VERIFY ALIGNMENT OVER CHEQUE — MICR LINE MUST BE CLEAR
        </Text>
        <Text style={[styles.securitySubtext, { top: mmToPt(pageHeight - 8) }]}>
          This is a calibration overlay. It does NOT contain MICR characters or bank graphics.
        </Text>
      </Page>
    </Document>
  );
}

/** Convert millimetres to PDF points. */
function mmToPt(mm: number): number {
  return mm * PT_PER_MM;
}

/** Orientation-specific page sizing — returns react-pdf style values (px-based). */
function orientationStyle(orientation: string): { width: number; height: number } {
  // react-pdf Page size uses points; we set width/height in pt via inline style.
  // The size array below handles the actual page sizing; the style here is
  // applied to the inner content container.
  if (orientation === "landscape") {
    return { width: mmToPt(A4_HEIGHT_MM), height: mmToPt(A4_WIDTH_MM) };
  }
  return { width: mmToPt(A4_WIDTH_MM), height: mmToPt(A4_HEIGHT_MM) };
}

/**
 * Alignment guides — small crosses at each corner of the A4 page.
 * These help the user align the printed overlay with their physical cheque.
 */
function AlignmentGuides({ pageWidth, pageHeight }: { pageWidth: number; pageHeight: number }) {
  const guideSize = 8; // mm

  const corners = [
    { x: 0, y: 0 },                           // top-left
    { x: pageWidth, y: 0 },                   // top-right
    { x: 0, y: pageHeight },                  // bottom-left
    { x: pageWidth, y: pageHeight },          // bottom-right
  ];

  return (
    <>
      {corners.map((corner, i) => {
        const isRight = corner.x === pageWidth;
        const isBottom = corner.y === pageHeight;
        return (
          <View
            key={`guide-${i}`}
            style={[
              styles.cornerCross,
              {
                left: mmToPt(corner.x + (isRight ? -guideSize : 0)),
                top: mmToPt(corner.y + (isBottom ? -guideSize : 0)),
              },
            ]}
          >
            <View style={[styles.crossLine, { left: mmToPt(0), width: mmToPt(guideSize), top: mmToPt(guideSize / 2) }]} />
            <View style={[styles.crossLine, { left: mmToPt(guideSize / 2), width: mmToPt(0.2), top: mmToPt(0), height: mmToPt(guideSize) }]} />
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "rgba(255, 255, 255, 0)",
    position: "relative",
    margin: 0,
    padding: 0,
  },
  chequeOutline: {
    position: "absolute",
    border: "0.25pt solid rgba(200, 200, 200, 0.5)",
    backgroundColor: "rgba(200, 200, 200, 0.05)",
  },
  field: {
    position: "absolute",
    color: "#000",
    lineHeight: 1.1,
    padding: 0,
    margin: 0,
    fontFamily: MONO_FAMILY,
  },
  fieldText: {
    color: "#000",
    fontFamily: MONO_FAMILY,
  },
  micrLine: {
    position: "absolute",
    borderTop: "0.25pt dashed rgba(220, 38, 38, 0.3)",
    borderBottom: "0.25pt dashed rgba(220, 38, 38, 0.3)",
  },
  cornerCross: {
    position: "absolute",
    width: mmToPt(8),
    height: mmToPt(8),
  },
  crossLine: {
    position: "absolute",
    backgroundColor: "rgba(220, 38, 38, 0.5)",
  },
  securityWarning: {
    position: "absolute",
    fontSize: 6,
    color: "#990000",
    fontFamily: MONO_FAMILY,
    textAlign: "center",
    width: "100%",
  },
  securitySubtext: {
    position: "absolute",
    fontSize: 5,
    color: "#990000",
    fontFamily: MONO_FAMILY,
    textAlign: "center",
    width: "100%",
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
    fontFamily: MONO_FAMILY,
  },
});

// ---------------------------------------------------------------------------
// Blob URL generator — lets the caller trigger a download or inline view
// ---------------------------------------------------------------------------

export interface A4OverlayPdfResult {
  blobUrl: string;
  blob: Blob;
  pageWidth: number;
  pageHeight: number;
}

/**
 * Render the A4 overlay PDF to a blob URL entirely client-side.
 *
 * @throws if the layout has MICR safety violations.
 */
export async function generateA4OverlayPdf(
  layout: A4OverlayLayout,
  data: A4OverlayOutput,
): Promise<A4OverlayPdfResult> {
  if (!layout.fullyMicrSafe) {
    throw new Error(
      "A field overlaps the reserved MICR band. Correct the template before printing.",
    );
  }

  const blob = await pdf(
    <A4OverlayPDF layout={layout} data={data} />,
  ).toBlob();

  const blobUrl = URL.createObjectURL(blob);
  return {
    blobUrl,
    blob,
    pageWidth: layout.pageWidth,
    pageHeight: layout.pageHeight,
  };
}
