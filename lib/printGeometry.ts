// ---------------------------------------------------------------------------
// Print geometry resolver — SINGLE source of truth for:
//   - standard cheque size (190.5 × 88.9 mm)
//   - A4 page dimensions (portrait & landscape)
//   - the @page size, print-container size, and rotated-content offset
//
// The React print output and the injected @page CSS both derive from
// resolvePrintGeometry, so the two can never disagree.
//
// Direct Feed:
//   The cheque is the paper. The container IS the page box.
//   - Long Edge First (rotate 0): page 190.5×88.9, content unrotated.
//   - Short Edge First (rotate 90): page 88.9×190.5 (CSS coordinates), the
//     cheque content (190.5×88.9) is rotated 90° so it fills the page box;
//     the physical paper rotation is performed by the printer itself.
//
// A4 Carrier:
//   The paper is A4; the cheque sits at profile.x/y (plus calibration at
//   print time). Container = A4 box. Never reuses Direct Feed page positioning.
// ---------------------------------------------------------------------------

import type { BankTemplate, ProfileKey, Calibration } from "./types.ts";
import { isDirectFeed } from "./types.ts";
import { CALIBRATION_MAX_MM } from "./calibration.ts";

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
  /** CSS content rotation in degrees (0 or 90) */
  rotate: 0 | 90;
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
 * Direct Feed: page box = cheque (swapped when rotate=90).
 * A4 Carrier:  page box = A4 (portrait/landscape); cheque at profile.x/y.
 */
export function resolvePrintGeometry(template: BankTemplate, mode: ProfileKey): PrintGeometry {
  const profile = template.profiles[mode];

  if (isDirectFeed(mode)) {
    const chequeW = template.widthMm;
    const chequeH = template.heightMm;
    const rotate = profile.rotate;

    if (rotate === 90) {
      // Short Edge First: the page box is the cheque rotated 90°, i.e. swapped.
      // After a 90° CSS rotation the cheque fills this box exactly.
      return {
        pageW: chequeH,
        pageH: chequeW,
        containerW: chequeH,
        containerH: chequeW,
        rotate,
        chequeW,
        chequeH,
        chequeX: 0,
        chequeY: 0,
      };
    }

    // Long Edge First (rotate 0): page box == cheque, no swap.
    return {
      pageW: chequeW,
      pageH: chequeH,
      containerW: chequeW,
      containerH: chequeH,
      rotate,
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
 * CSS `rotate(90deg)` is clockwise and uses the element's top-left as origin by
 * default (transform-origin: 0 0 on the inner div). For a cheque of size
 * W×H rotated 90°, the rotated box becomes H×W. To make that rotated box fill
 * the page box (H×W) starting at the origin, the cheque's *pre-rotation* top-
 * left must be at (0, W): after rotation, the corner that was at (0, W) lands
 * at (W, 0)... equivalently, translate by `top = chequeH` so the rotated box
 * occupies [0, H] × [0, W].
 *
 * Concretely: with rotate=90 the page box is 88.9×190.5 and the cheque is
 * 190.5×88.9. The rotated cheque is 88.9×190.5 — identical to the page box —
 * so the correct offset is left=0, top=0 when transform-origin is the centre
 * (CSS default), OR left=0, top=chequeH when transform-origin is 0 0.
 *
 * We use the centre-origin convention (offset 0,0) because the PrintOutput sets
 * the rotation on the inner div without overriding transform-origin, so the
 * rotated bounding box already matches the container and no translation is
 * required. Returning 0,0 here fixes the previous negative-offset bug.
 */
export function rotatedContentOffset(geom: PrintGeometry): { leftMm: number; topMm: number } {
  if (geom.rotate !== 90) return { leftMm: 0, topMm: 0 };
  // With rotate=90 the page box IS the rotated cheque (H×W container, W×H
  // cheque). The rotated bounding box equals the container, so center origin
  // places it exactly — no offset needed.
  return { leftMm: 0, topMm: 0 };
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
 * cheque's top-left position (profile.x + calX, profile.y + calY).
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
  /** Final cheque top-left on the carrier page (A4) in mm, with calibration applied */
  finalChequeX: number;
  /** Final cheque top-left on the carrier page (A4) in mm, with calibration applied */
  finalChequeY: number;
} {
  const base = resolvePrintGeometry(template, mode);
  return {
    ...base,
    chequeX: base.chequeX + calibration.x,
    chequeY: base.chequeY + calibration.y,
    finalChequeX: base.chequeX + calibration.x,
    finalChequeY: base.chequeY + calibration.y,
  };
}

/**
 * Compute the worst-case calibrated bounding box for a template + mode.
 *
 * Returns the extreme positions the cheque can reach when calibration is
 * pushed to ±CALIBRATION_MAX_MM in both axes. Used to guarantee that even
 * at maximum calibration the cheque never leaves the page.
 *
 * - Direct Feed: the page box IS the cheque, so calibration does not move
 *   the cheque relative to the page — the bounding box is the page itself.
 *
 * - A4 Carrier: cheque base position is profile.x/y; calibration can shift
 *   it by ±MAX in X and Y. We compute the min and max achievable edges.
 */
export function calibratedBounds(
  template: BankTemplate,
  mode: ProfileKey,
): {
  minX: number;
  minY: number;
  maxRight: number;
  maxBottom: number;
} {
  const profile = template.profiles[mode];
  const chequeW = template.widthMm;
  const chequeH = template.heightMm;
  const cal = CALIBRATION_MAX_MM;

  if (isDirectFeed(mode)) {
    // Page box == cheque. Calibration only shifts field content inside the
    // cheque box; the cheque bounding box on the page is always [0,0]..[pageW,pageH].
    const geom = resolvePrintGeometry(template, mode);
    return {
      minX: 0,
      minY: 0,
      maxRight: geom.pageW,
      maxBottom: geom.pageH,
    };
  }

  // A4 Carrier — worst case: calibration pushes cheque in negative direction
  // (minX = profile.x - cal) or positive direction (maxRight = profile.x + chequeW + cal).
  return {
    minX: profile.x - cal,
    minY: profile.y - cal,
    maxRight: profile.x + chequeW + cal,
    maxBottom: profile.y + chequeH + cal,
  };
}
