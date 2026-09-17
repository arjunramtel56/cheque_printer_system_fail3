"use client";

// ---------------------------------------------------------------------------
// ChequeSheet — THE renderer.
//
// Before this component existed, the direct-feed preview, the A4-carrier
// preview and the print output were three separate render trees that
// re-implemented the same field list. They could (and did) drift. Now there is
// exactly one tree, driven entirely by template data via computeSheetLayout(),
// rendered at one of two unit scales:
//
//   variant="preview"  mm -> px at PREVIEW_SCALE (readable on screen)
//   variant="print"    arbitrary -> mm / pt (1:1 physical output)
//
// Nothing here knows a field key, a caption, a bank name or a coordinate — all
// of that lives in data/templates.ts.
// ---------------------------------------------------------------------------

import React from "react";
import type { BankTemplate, Calibration, ProfileKey } from "@/lib/types";
import { computeSheetLayout, type ChequeData, type LaidOutField } from "@/lib/sheetLayout";

/** Screen scale: 1 mm = 2.4 px. Print output always uses real millimetres. */
export const PREVIEW_SCALE = 2.4;

export type SheetVariant = "preview" | "print";

/** The single linear factor between millimetres and the rendered unit. */
export function unitFactor(variant: SheetVariant): number {
  return variant === "preview" ? PREVIEW_SCALE : 1;
}

/** Convert a millimetre length into a CSS length for the given variant. */
export function lengthToCss(mm: number, variant: SheetVariant): string {
  return variant === "preview" ? `${mm * PREVIEW_SCALE}px` : `${mm}mm`;
}

const MONO = '"Courier New", ui-monospace, SFMono-Regular, monospace';

export interface ChequeSheetProps {
  template: BankTemplate;
  data: ChequeData;
  mode: ProfileKey;
  calibration: Calibration;
  variant: SheetVariant;
  /** Screen-only measurement guides (never printed). */
  debugMode?: boolean;
  className?: string;
}

function fieldStyle(field: LaidOutField, variant: SheetVariant): React.CSSProperties {
  return {
    position: "absolute",
    left: lengthToCss(field.xMm, variant),
    top: lengthToCss(field.yMm, variant),
    width: lengthToCss(field.widthMm, variant),
    fontSize: variant === "preview" ? `${field.fontSizePt * PREVIEW_SCALE}px` : `${field.fontSizePt}pt`,
    letterSpacing:
      field.letterSpacingMm > 0
        ? variant === "preview"
          ? `${field.letterSpacingMm * PREVIEW_SCALE}px`
          : `${field.letterSpacingMm}mm`
        : undefined,
    textAlign: field.align,
    fontFamily: MONO,
    whiteSpace: "nowrap",
    overflow: "hidden",
    lineHeight: 1.1,
    color: "#111",
  };
}

export default function ChequeSheet({
  template,
  data,
  mode,
  calibration,
  variant,
  debugMode = false,
  className = "",
}: ChequeSheetProps) {
  const layout = computeSheetLayout(template, data, mode, calibration);
  const isPreview = variant === "preview";

  // Screen-only placeholders (signature panels) never reach paper.
  const visibleFields = layout.fields.filter((f) => f.text !== "" && (!isPreview ? f.printable : true));

  const containerClass = isPreview
    ? "cheque-preview"
    : mode === "custom_short" || mode === "custom_long"
      ? "print-direct-feed"
      : "print-a4-carrier";

  return (
    <div
      className={`${containerClass} ${className}`.trim()}
      style={{
        position: "relative",
        width: lengthToCss(layout.pageW, variant),
        height: lengthToCss(layout.pageH, variant),
        background: "#fff",
        overflow: "hidden",
        fontFamily: MONO,
        color: "#111",
      }}
      role={isPreview ? "img" : undefined}
      aria-label={isPreview ? `Cheque preview for ${template.bankName} — ${mode}` : undefined}
    >
      {/* The cheque box: the page itself for direct feed, inset on the carrier.
          It carries the boundary, the watermark and the reserved zones — all in
          cheque-local coordinates. Printed fields are positioned on the page
          (absolute mm) so both variants share one coordinate system. */}
      <div
        style={{
          position: "absolute",
          left: lengthToCss(layout.chequeX, variant),
          top: lengthToCss(layout.chequeY, variant),
          width: lengthToCss(layout.chequeW, variant),
          height: lengthToCss(layout.chequeH, variant),
          border: isPreview && debugMode ? "0.5px dashed rgba(37,99,235,0.7)" : undefined,
        }}
        data-cheque-box="true"
      >
        {isPreview && (
          <div className="cheque-watermark" aria-hidden="true">
            PREVIEW
          </div>
        )}

        {/* Reserved (non-printable) zones — annotated on screen only. */}
        {isPreview &&
          layout.safeZones.map((zone) => (
            <div
              key={zone.id}
              style={{
                position: "absolute",
                left: lengthToCss(zone.x, variant),
                top: lengthToCss(zone.y, variant),
                width: lengthToCss(zone.width, variant),
                height: lengthToCss(zone.height, variant),
                borderTop: debugMode ? "0.5px dashed rgba(220,38,38,0.5)" : undefined,
                fontSize: `${5 * PREVIEW_SCALE}px`,
                color: debugMode ? "rgba(220,38,38,0.75)" : "transparent",
                fontFamily: MONO,
              }}
              aria-hidden="true"
            >
              {debugMode ? `reserved: ${zone.id}` : ""}
            </div>
          ))}
      </div>

      {visibleFields.map((field) =>
        field.kind === "signature" ? (
          <div
            key={field.key}
            style={{
              position: "absolute",
              left: lengthToCss(field.xMm, variant),
              top: lengthToCss(field.yMm, variant),
              width: lengthToCss(field.widthMm, variant),
              height: lengthToCss(field.heightMm, variant),
              border: "0.5px dashed #c9c9c9",
              fontSize: variant === "preview" ? `${6 * PREVIEW_SCALE}px` : "6pt",
              color: "#b9b9b9",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              fontFamily: MONO,
            }}
          >
            {field.text}
          </div>
        ) : (
          <div key={field.key} className={`preview-field preview-field-${field.kind}`} style={fieldStyle(field, variant)}>
            {field.text}
          </div>
        ),
      )}

      {isPreview && debugMode && (
        <div className="debug-guides" aria-hidden="true" style={{ fontFamily: MONO }}>
          Page {layout.pageW} × {layout.pageH} mm ({layout.orientation})
          <br />
          Cheque at X {layout.chequeX.toFixed(2)} mm · Y {layout.chequeY.toFixed(2)} mm ({layout.chequeW} × {layout.chequeH} mm)
          <br />
          Calibration X {layout.calibration.x.toFixed(1)} mm · Y {layout.calibration.y.toFixed(1)} mm
          {layout.clamped ? " (clamped to keep the cheque on the paper)" : ""}
        </div>
      )}
    </div>
  );
}
