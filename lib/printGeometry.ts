// ---------------------------------------------------------------------------
// Print geometry resolver — SINGLE source of truth for:
//   - the cheque's physical box (any width × height, from lib/sizes.ts)
//   - the carrier/paper box (A4 portrait/landscape, or the cheque stock itself)
//   - the @page size, the print container size and the cheque's page position
//
// Both the React print output and the injected @page CSS derive from
// resolvePrintGeometry, so they can never disagree.
//
// Direct Feed (Custom Cheque Size):
//   The cheque IS the paper. The @page is the cheque's own physical box
//   (W × H in mm). Content is rendered unrotated — the cheque coordinate system
//   (origin = top-left, X right, Y down) maps directly onto the page box. Short
//   Edge First vs Long Edge First is a printer feed setting, NOT a CSS
//   transform, which keeps Chrome print preview showing a readable cheque.
//
// A4 Carrier:
//   The paper is A4; the cheque sits at profile.x/y (plus calibration at print
//   time) and keeps its own physical size. Never reuses Direct Feed placement.
//
// Orientation is a declared property of the template. It never rotates pixels:
// it must agree with the physical dimensions (see validateBankTemplate) and it
// selects the paper box for carrier printing.
// ---------------------------------------------------------------------------

import type { BankTemplate, Orientation, ProfileKey, Calibration } from "./types.ts";
import { isDirectFeed, paperIdForMode } from "./types.ts";
import { getPaperSize, orientationFor } from "./sizes.ts";

// ---------------------------------------------------------------------------
// Canonical size constants. These are compatibility aliases — the registries in
// lib/sizes.ts are the source of truth.
// ---------------------------------------------------------------------------

export const STANDARD_CHEQUE_W_MM = 190.5;
export const STANDARD_CHEQUE_H_MM = 88.9;

export const A4_PORTRAIT_W_MM = 210;
export const A4_PORTRAIT_H_MM = 297;
export const A4_LANDSCAPE_W_MM = A4_PORTRAIT_H_MM; // 297
export const A4_LANDSCAPE_H_MM = A4_PORTRAIT_W_MM; // 210

export interface PaperBox {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  orientation: Orientation;
  /** True when the paper IS the cheque (direct feed). */
  isChequeStock: boolean;
}

export interface PrintGeometry {
  /** @page width in mm */
  pageW: number;
  /** @page height in mm */
  pageH: number;
  /** print container width in mm (always equals the page box) */
  containerW: number;
  /** print container height in mm (always equals the page box) */
  containerH: number;
  /** raw cheque dimensions */
  chequeW: number;
  chequeH: number;
  /** cheque position on the carrier page (A4 mode) in mm */
  chequeX: number;
  chequeY: number;
  /** Physical orientation of the cheque box declared by the template. */
  chequeOrientation: Orientation;
  /** Physical orientation of the @page box. */
  pageOrientation: Orientation;
  /** Paper registry id in use (cheque size id for direct feed). */
  paperId: string;
  paperW: number;
  paperH: number;
}

/**
 * Resolve the carrier paper for a print mode. Direct feed prints on the cheque
 * itself; carrier modes use the paper registry.
 */
export function resolvePaper(template: BankTemplate, mode: ProfileKey): PaperBox {
  const paperId = paperIdForMode(mode, template.sizeId);
  if (isDirectFeed(mode)) {
    return {
      id: paperId,
      label: `Cheque stock ${template.widthMm} × ${template.heightMm} mm`,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      orientation: template.orientation,
      isChequeStock: true,
    };
  }
  const paper = getPaperSize(paperId);
  if (!paper) {
    // Unknown paper: fall back to the profile's declared page box so the engine
    // still produces self-consistent geometry. Validation rejects this earlier.
    const profile = template.profiles[mode];
    return {
      id: paperId,
      label: paperId,
      widthMm: profile.pageWidth,
      heightMm: profile.pageHeight,
      orientation: orientationFor(profile.pageWidth, profile.pageHeight),
      isChequeStock: false,
    };
  }
  return { ...paper, isChequeStock: false };
}

/**
 * Resolve the authoritative print geometry for a template + profile.
 *
 * Direct Feed: @page is the cheque's own physical box (W × H mm). No rotation.
 * A4 Carrier:  page box = the carrier paper box; cheque at profile.x/y.
 */
export function resolvePrintGeometry(template: BankTemplate, mode: ProfileKey): PrintGeometry {
  const profile = template.profiles[mode];
  const paper = resolvePaper(template, mode);
  const chequeW = template.widthMm;
  const chequeH = template.heightMm;

  if (isDirectFeed(mode)) {
    // The cheque IS the page: no rotation, no swap, no offset.
    return {
      pageW: chequeW,
      pageH: chequeH,
      containerW: chequeW,
      containerH: chequeH,
      chequeW,
      chequeH,
      chequeX: 0,
      chequeY: 0,
      chequeOrientation: template.orientation,
      pageOrientation: template.orientation,
      paperId: paper.id,
      paperW: chequeW,
      paperH: chequeH,
    };
  }

  // Carrier: the page is the paper box; the cheque keeps its own size.
  const pageW = paper.widthMm;
  const pageH = paper.heightMm;

  return {
    pageW,
    pageH,
    containerW: pageW,
    containerH: pageH,
    chequeW,
    chequeH,
    chequeX: profile.x,
    chequeY: profile.y,
    chequeOrientation: template.orientation,
    pageOrientation: orientationFor(pageW, pageH),
    paperId: paper.id,
    paperW: pageW,
    paperH: pageH,
  };
}

/**
 * Content offset for Direct-Feed mode.
 *
 * Direct Feed applies no CSS rotation — content is rendered flat in the
 * cheque-sized page box. Short Edge First vs Long Edge First is a printer
 * paper-feed setting, not a CSS transform, so the offset is always zero.
 */
export function rotatedContentOffset(_geom?: PrintGeometry): { leftMm: number; topMm: number } {
  return { leftMm: 0, topMm: 0 };
}

export interface CalibratedGeometry extends PrintGeometry {
  /** Final clamped cheque offset on the carrier page (mm) */
  finalChequeX: number;
  /** Final clamped cheque offset on the carrier page (mm) */
  finalChequeY: number;
  /** True if the requested calibration was clamped to keep the cheque on-page */
  calibratedClamped: boolean;
}

/**
 * Resolve geometry with calibration applied.
 *
 * Direct Feed: the cheque fills the page, so calibration shifts the field
 * content inside the cheque (applied by the renderer, not here) and the page box
 * never moves.
 *
 * Carrier: calibration shifts the cheque's top-left position. If the requested
 * offset would push the cheque off the paper it is clamped, so a cheque can
 * never leave the page. Calibration NEVER changes the cheque's dimensions.
 *
 * This is the single function both the screen preview and the print output use
 * to compute the final cheque-on-page box, guaranteeing preview == print.
 */
export function resolveCalibratedGeometry(
  template: BankTemplate,
  mode: ProfileKey,
  calibration: Calibration,
): CalibratedGeometry {
  const base = resolvePrintGeometry(template, mode);
  const calX = calibration.x;
  const calY = calibration.y;

  if (isDirectFeed(mode)) {
    return {
      ...base,
      chequeX: 0,
      chequeY: 0,
      finalChequeX: 0,
      finalChequeY: 0,
      calibratedClamped: false,
    };
  }

  // Carrier — clamp calibration so the cheque never leaves the paper.
  const profile = template.profiles[mode];
  const chequeW = base.chequeW;
  const chequeH = base.chequeH;

  const minCalX = -profile.x;
  const maxCalX = base.pageW - profile.x - chequeW;
  const minCalY = -profile.y;
  const maxCalY = base.pageH - profile.y - chequeH;

  const clampedX = clampCalibrationValue(calX, minCalX, maxCalX);
  const clampedY = clampCalibrationValue(calY, minCalY, maxCalY);
  const clamped = clampedX !== calX || clampedY !== calY;

  return {
    ...base,
    chequeX: profile.x,
    chequeY: profile.y,
    finalChequeX: profile.x + clampedX,
    finalChequeY: profile.y + clampedY,
    calibratedClamped: clamped,
  };
}

/** Clamp a value to [min, max], rounding to the 0.1 mm step. */
function clampCalibrationValue(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return 0;
  const clamped = Math.min(max, Math.max(min, v));
  return Math.round(clamped * 10) / 10;
}

/** The calibration range that keeps the cheque fully on the paper (mm). */
export function calibrationLimits(
  template: BankTemplate,
  mode: ProfileKey,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const geom = resolvePrintGeometry(template, mode);
  if (isDirectFeed(mode)) {
    return { minX: -25, maxX: 25, minY: -25, maxY: 25 };
  }
  const profile = template.profiles[mode];
  return {
    minX: -profile.x,
    maxX: geom.pageW - profile.x - geom.chequeW,
    minY: -profile.y,
    maxY: geom.pageH - profile.y - geom.chequeH,
  };
}

/** True when the cheque physically fits on the carrier paper in this mode. */
export function carrierFits(template: BankTemplate, mode: ProfileKey): boolean {
  const geom = resolvePrintGeometry(template, mode);
  if (isDirectFeed(mode)) return true;
  const profile = template.profiles[mode];
  return (
    profile.x >= -0.05 &&
    profile.y >= -0.05 &&
    profile.x + geom.chequeW <= geom.pageW + 0.05 &&
    profile.y + geom.chequeH <= geom.pageH + 0.05
  );
}
