// ---------------------------------------------------------------------------
// Print geometry resolver — single source of truth shared by the React print
// output and the injected @page CSS so the two can never disagree.
//
// Direct Feed:
//   The cheque is the paper. The container IS the page box.
//   - Long Edge First (rotate 0): page 190.5×88.9, content unrotated.
//   - Short Edge First (rotate 90): page 88.9×190.5 (CSS coordinates), the
//     cheque content (190.5×88.9) is rotated 90° so it fills the page box;
//     the physical paper rotation is performed by the printer itself.
//
// A4 Carrier:
//   The paper is A4; the cheque sits at profile.x/y. Container = A4 box.
//   Never reuses Direct Feed page positioning.
// ---------------------------------------------------------------------------

import type { BankTemplate, ProfileKey } from "./types";

export const A4_PORTRAIT_W_MM = 210;
export const A4_PORTRAIT_H_MM = 297;

export interface PrintGeometry {
  /** @page width in mm */
  pageW: number;
  /** @page height in mm */
  pageH: number;
  /** print container width in mm */
  containerW: number;
  /** print container height in mm */
  containerH: number;
  /** CSS content rotation in degrees (0 or 90) */
  rotate: 0 | 90;
  /** raw cheque dimensions */
  chequeW: number;
  chequeH: number;
  /** absolute cheque position on the carrier page (A4 mode) */
  chequeX: number;
  chequeY: number;
}

export function resolvePrintGeometry(template: BankTemplate, mode: ProfileKey): PrintGeometry {
  const profile = template.profiles[mode];
  const isDF = mode === "custom_short" || mode === "custom_long";

  if (isDF) {
    const chequeW = template.widthMm;
    const chequeH = template.heightMm;
    const rotate = profile.rotate;
    if (rotate === 90) {
      // Page box is swapped (short edge first); content rotates to fill it.
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

  const portrait = mode === "a4_vertical";
  const pageW = portrait ? A4_PORTRAIT_W_MM : A4_PORTRAIT_H_MM;
  const pageH = portrait ? A4_PORTRAIT_H_MM : A4_PORTRAIT_W_MM;
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
 * Inner-content placement for a rotated Direct Feed container.
 * For rotate 90 the 190.5×88.9 cheque is centered in the 88.9×190.5 page
 * box and rotated 90°; returns the absolute offsets in mm.
 */
export function rotatedContentOffset(geom: PrintGeometry): { leftMm: number; topMm: number } {
  if (geom.rotate !== 90) return { leftMm: 0, topMm: 0 };
  return {
    leftMm: (geom.containerW - geom.chequeW) / 2,
    topMm: (geom.containerH - geom.chequeH) / 2,
  };
}
