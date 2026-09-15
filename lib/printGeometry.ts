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

import type { BankTemplate, ProfileKey } from "./types.ts";
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
