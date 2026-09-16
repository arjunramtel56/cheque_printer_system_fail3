// ---------------------------------------------------------------------------
// Print geometry resolver — SINGLE source of truth for:
//   - standard cheque size (190.5 × 88.9 mm)
//   - A4 page dimensions (portrait & landscape)
//   - the @page size, print-container size, and content offset
//
// The React print output and the injected @page CSS both derive from
// resolvePrintGeometry, so the two can never disagree.
//
// Direct Feed (Custom Cheque Size):
//   The cheque IS the paper. The @page is always landscape 190.5×88.9 mm.
//   - Long Edge First: paper fed long-edge first (printer hardware setting).
//   - Short Edge First: paper fed short-edge first (printer hardware setting).
//   In BOTH cases content is rendered unrotated (rotate: 0) — the feed
//   direction is a printer setting, NOT a CSS transform. This ensures
//   Chrome print preview shows landscape, horizontally-readable content.
//
// A4 Carrier:
//   The paper is A4; the cheque sits at profile.x/y (plus calibration at
//   print time). Container = A4 box. Never reuses Direct Feed page positioning.
// ---------------------------------------------------------------------------

import type { BankTemplate, ProfileKey, Calibration } from "./types.ts";
import { isDirectFeed } from "./types.ts";

// ---------------------------------------------------------------------------
// Canonical size constants — the ONLY definitions used across the engine.
// ---------------------------------------------------------------------------

export const STANDARD_CHEQUE_W_MM = 190.5;
export const STANDARD_CHEQUE_H_MM = 88.9;

export const A4_PORTRAIT_W_MM = 210;
export const A4_PORTRAIT_H_MM = 297;
export const A4_LANDSCAPE_W_MM = A4_PORTRAIT_H_MM; // 297
export const A4_LANDSCAPE_H_MM = A4_PORTRAIT_W_MM; // 210

export interface PrintGeometry {
  /** @page width in mm */
  pageW: number;
  /** @page height in mm */
  pageH: number;
  /** print container width in mm (always equals page box) */
  containerW: number;
  /** print container height in mm (always equals page box) */
  containerH: number;
  /** CSS content rotation in degrees — always 0 (feed direction is a printer setting) */
  rotate: 0;
  /** raw cheque dimensions */
  chequeW: number;
  chequeH: number;
  /** absolute cheque position on the carrier page (A4 mode) in mm */
  chequeX: number;
  chequeY: number;
}

/**
 * Resolve the authoritative print geometry for a given template + profile.
 *
 * Direct Feed: @page is always landscape cheque size (190.5×88.9 mm).
 *   rotate is always 0 — no CSS rotation. Short Edge First vs Long Edge
 *   First is a printer paper-feed setting.
 *
 * A4 Carrier:  page box = A4 (portrait/landscape); cheque at profile.x/y.
 */
export function resolvePrintGeometry(template: BankTemplate, mode: ProfileKey): PrintGeometry {
  const profile = template.profiles[mode];

  if (isDirectFeed(mode)) {
    const chequeW = template.widthMm;
    const chequeH = template.heightMm;
    // Direct Feed: @page is ALWAYS landscape cheque size.
    // No CSS rotation — feed direction is a printer setting.
    return {
      pageW: chequeW,
      pageH: chequeH,
      containerW: chequeW,
      containerH: chequeH,
      rotate: 0,
      chequeW,
      chequeH,
      chequeX: 0,
      chequeY: 0,
    };
  }

  // A4 Carrier — independent portrait / landscape page boxes.
  const portrait = mode === "a4_vertical";
  const pageW = portrait ? A4_PORTRAIT_W_MM : A4_LANDSCAPE_W_MM;
  const pageH = portrait ? A4_PORTRAIT_H_MM : A4_LANDSCAPE_H_MM;

  return {
    pageW,
    pageH,
    containerW: pageW,
    containerH: pageH,
    rotate: 0,
    chequeW: template.widthMm,
    chequeH: template.heightMm,
    chequeX: profile.x,
    chequeY: profile.y,
  };
}

/**
 * Inner-content placement for a rotated Direct-Feed container.
 *
 * CSS `rotate(90deg)` rotates content clockwise by 90° in screen coordinates
 * (Y-down). The rotation matrix [0 -1; 1 0] maps a point (x, y) to (-y, x).
 * The PrintOutput component sets `transform-origin: 0 0` (top-left) on the
 * rotated div, so rotation is performed around the element's top-left corner.
 *
 * For a cheque of size W×H (W=190.5, H=88.9) rotated 90° CW about origin:
 *   - The four corners (0,0), (W,0), (W,H), (0,H) map to
 *     (0,0), (0,W), (-H,W), (-H,0).
 *   - The rotated bounding box is [-H, 0] × [0, W].
 *
 * The page box (container) for Short Edge First is H×W = [0, H] × [0, W].
 * To translate the rotated bounding box into the page box, we shift right by H:
 *   offset = (left=chequeH, top=0).
 *
 * Concretely: with rotate=90 the page box is 88.9×190.5 (H×W) and the cheque
 * is 190.5×88.9 (W×H). The offset (88.9, 0) positions the rotated bounding
 * box to exactly fill the page box.
 */
export function rotatedContentOffset(geom: PrintGeometry): { leftMm: number; topMm: number } {
  if (geom.rotate !== 90) return { leftMm: 0, topMm: 0 };
  // Short Edge First: page box is H×W, cheque is W×H. CSS rotate(90deg)
  // clockwise (matrix [0 -1; 1 0]) maps (x,y) → (-y, x). Corners map to
  // (0,0), (0,W), (-H,W), (-H,0) → bounding box [-H,0] × [0,W].
  // To fill page box [0,H] × [0,W], shift right by chequeH: left=chequeH, top=0.
  return { leftMm: geom.chequeH, topMm: 0 };
}

/**
 * Resolve geometry with calibration applied to the cheque's page position.
 *
 * For Direct Feed the cheque fills the entire page box, so calibration
 * shifts the *field content* within the container (fields are offset by
 * calX/calY relative to the cheque origin). The page box / container does
 * not change.
 *
 * For A4 Carrier the cheque is inset on the A4 page; calibration shifts the
 * cheque's top-left position (profile.x + calX, profile.y + calY). If the
 * requested calibration would push the cheque off-page, it is clamped to the
 * maximum safe offset — the cheque can never leave the page.
 *
 * This is the SINGLE function both the screen preview and the print output
 * use to compute the final cheque-on-page bounding box, guaranteeing
 * preview == print output geometry.
 */
export function resolveCalibratedGeometry(
  template: BankTemplate,
  mode: ProfileKey,
  calibration: Calibration,
): PrintGeometry & {
  /** Final clamped cheque offset on the carrier page (mm) */
  finalChequeX: number;
  /** Final clamped cheque offset on the carrier page (mm) */
  finalChequeY: number;
  /** True if the requested calibration was clamped to keep the cheque on-page */
  calibratedClamped: boolean;
} {
  const base = resolvePrintGeometry(template, mode);
  let calX = calibration.x;
  let calY = calibration.y;
  let clamped = false;

  if (isDirectFeed(mode)) {
    // DF: calibration shifts field content inside the cheque; page box unchanged.
    return {
      ...base,
      chequeX: 0,
      chequeY: 0,
      finalChequeX: 0,
      finalChequeY: 0,
      calibratedClamped: false,
    };
  }

  // A4 Carrier — clamp calibration so the cheque never leaves the page.
  // The cheque rectangle is [profile.x + calX, profile.y + calY] ..
  // [profile.x + calX + chequeW, profile.y + calY + chequeH].
  // It must satisfy: 0 <= chequeX and chequeX + chequeW <= pageW (and Y).
  const profile = template.profiles[mode];
  const chequeW = template.widthMm;
  const chequeH = template.heightMm;

  const minCalX = -profile.x;
  const maxCalX = profile.pageWidth - profile.x - chequeW;
  const minCalY = -profile.y;
  const maxCalY = profile.pageHeight - profile.y - chequeH;

  const clampedX = clampCalibrationValue(calX, minCalX, maxCalX);
  const clampedY = clampCalibrationValue(calY, minCalY, maxCalY);
  if (clampedX !== calX || clampedY !== calY) clamped = true;

  return {
    ...base,
    chequeX: profile.x,
    chequeY: profile.y,
    finalChequeX: profile.x + clampedX,
    finalChequeY: profile.y + clampedY,
    calibratedClamped: clamped,
  };
}

/** Clamp a value to [min, max], rounding to 0.1mm step. */
function clampCalibrationValue(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return 0;
  const clamped = Math.min(max, Math.max(min, v));
  return Math.round(clamped * 10) / 10;
}
