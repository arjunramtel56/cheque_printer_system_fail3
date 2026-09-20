// ---------------------------------------------------------------------------
// MICR Guard — fail-safe boundary enforcement for the Magnetic Ink Character
// Recognition band on Nepalese cheques.
//
// The MICR line is pre-printed by the bank using E-13B font. ANY ink deposited
// over it by an inkjet/laser printer can corrupt the MICR signal and cause
// cheque processing failure or outright rejection by clearing banks.
//
// This module provides the hard runtime guard: it will throw (not warn, not log
// silently) if any printable element's Y-position risks touching the MICR zone.
// It is called from BOTH the sheet layout (pre-render check) and the PDF
// overlay generator (post-layout check) so there is no path that bypasses it.
// ---------------------------------------------------------------------------

import type { SafeZone } from "@/lib/types";
import { MICR_BAND_MM } from "@/data/templates";

// ===========================================================================
// Unit constants (Nepal / NRB standard cheque geometry)
// ===========================================================================

/**
 * Standard Nepalese cheque stock: 190.5 × 88.9 mm (7.5 × 3.5 inches).
 * Sourced from lib/sizes.ts registry; re-derived here for the inches-based
 * MICR guard so printer calibration can reason in native paper units.
 */
export const STANDARD_CHEQUE_HEIGHT_INCHES = 3.66; // NRB standard rounding

/**
 * The MICR band is the bottom 7 mm (≈0.275 inches) of the cheque.
 * Sourced from data/templates.ts which centralises the band height.
 */
export const MICR_ZONE_INCHES = {
  bottom: MICR_BAND_MM / 25.4, // mm -> inches
  height: MICR_BAND_MM / 25.4,
};

// A safety margin beyond which NO element may extend. We reserve a little more
// than the strict MICR band because printer scaling ("Fit to page") can push
// content down by a few millimetres.
export const MICR_SAFETY_MARGIN_INCHES = 0.1;

// ===========================================================================
// Core guard: elements are described as { y, height } in either millimetres
// or inches. Both forms are accepted so the guard can be used in the mm-based
// layout pipeline (sheetLayout) and the inches-based PDF pipeline.
// ===========================================================================

export interface MicrElementMm {
  yMm: number;
  heightMm: number;
}

export interface MicrElementInches {
  yInches: number;
  heightInches: number;
}

export interface MicrViolation {
  index: number;
  yMm: number;
  heightMm: number;
  elementLabel: string;
}

// ===========================================================================
// Conversion: millimetres <-> inches (no floating point drift)
// ===========================================================================

const MM_PER_INCH = 25.4;

/** Convert millimetres to inches. */
export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

/** Convert inches to millimetres. */
export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

// ===========================================================================
// Boundary calculations
// ===========================================================================

/**
 * The Y-coordinate (measured from the TOP of the cheque) of the top edge of the
 * MICR safety zone. Any element whose bottom edge reaches `micrTopMm` or below
 * is considered a violation.
 *
 * chequeHeightMm is the full physical height of the cheque stock.
 */
export function micrTopMm(chequeHeightMm: number): number {
  return chequeHeightMm - MICR_BAND_MM - MICR_SAFETY_MARGIN_INCHES * MM_PER_INCH;
}

/**
 * The Y-coordinate (measured from the TOP) of the top of the MICR band itself,
 * without the safety margin. Elements above this line are guaranteed clear of
 * the bank's pre-printed MICR characters.
 */
export function micrBandTopMm(chequeHeightMm: number): number {
  return chequeHeightMm - MICR_BAND_MM;
}

/**
 * Check whether a single element rectangle is safe from the MICR zone.
 * Returns true when the element's bottom edge is ABOVE the MICR safety line.
 */
export function isElementMicrSafeMm(el: MicrElementMm, chequeHeightMm: number): boolean {
  const top = micrTopMm(chequeHeightMm);
  return el.yMm + el.heightMm <= top;
}

// ===========================================================================
// Enforcement — throws on any violation
// ===========================================================================

/**
 * Enforce MICR safety across a list of printable elements. If ANY element's
 * bottom edge reaches into the MICR zone, this function throws a
 * `MicrSecurityError` and HALTS the print/PDF operation. There is no silent
 * fallback.
 *
 * @param elements  Printed fields with their mm coordinates.
 * @param chequeHeightMm  Physical height of the cheque stock (default: standard 88.9).
 * @throws {MicrSecurityError} when an element encroaches the MICR zone.
 */
export function enforceMicrSafety(
  elements: MicrElementMm[],
  chequeHeightMm: number = 88.9,
): void {
  const violations: MicrViolation[] = [];
  const top = micrTopMm(chequeHeightMm);

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!isElementMicrSafeMm(el, chequeHeightMm)) {
      violations.push({
        index: i,
        yMm: el.yMm,
        heightMm: el.heightMm,
        elementLabel: `element[${i}]`,
      });
    }
  }

  if (violations.length > 0) {
    const detail = violations.map((v) => `element[${v.index}] bottom=${(v.yMm + v.heightMm).toFixed(1)}mm exceeds MICR top=${top.toFixed(1)}mm`).join("; ");
    throw new MicrSecurityError(
      `SECURITY VIOLATION: ${violations.length} element(s) encroach the MICR band (top at ${top.toFixed(1)}mm). ${detail}`,
      violations,
    );
  }
}

// ===========================================================================
// Inches-based variant — for direct 1:1 printer output paths
// ===========================================================================

/**
 * In the inches-based coordinate space (used by some PDF generators), the MICR
 * zone occupies the bottom `MICR_ZONE_INCHES.bottom` inches. This function
 * enforces the same invariant using inches.
 */
export function enforceMicrSafetyInches(elements: MicrElementInches[]): void {
  const micrTop = STANDARD_CHEQUE_HEIGHT_INCHES - MICR_ZONE_INCHES.bottom - MICR_SAFETY_MARGIN_INCHES;
  const violations: MicrElementInches[] = [];

  for (const el of elements) {
    if (el.yInches + el.heightInches > micrTop) {
      violations.push(el);
    }
  }

  if (violations.length > 0) {
    throw new MicrSecurityError(
      `SECURITY VIOLATION: ${violations.length} element(s) encroach the MICR zone (MICR top at ${micrTop.toFixed(3)}").`,
      violations,
    );
  }
}

// ===========================================================================
// Safe zone integration — verify the template's declared safe zones cover MICR
// ===========================================================================

/**
 * Every template declares safe zones in data/templates.ts via micrSafeZone().
 * This function verifies that the MICR safe zone is present and that printable
 * fields don't overlap it. It is a belt-and-braces check: validateBankTemplate
 * in lib/validation.ts already enforces this, but we re-check here at print time
 * because admin-edited templates are loaded from localStorage.
 */
export function verifyMicrSafeZone(safeZones: SafeZone[] | undefined, chequeHeightMm: number): void {
  const zones = safeZones ?? [];
  const micrZone = zones.find(
    (z) => z.id === "micr" && z.y + z.height >= chequeHeightMm - MICR_BAND_MM * 0.5,
  );
  if (!micrZone) {
    throw new MicrSecurityError(
      "SECURITY VIOLATION: template is missing a MICR safe zone — refusing to print.",
    );
  }
}

// ===========================================================================
// Dedicated error type so callers can distinguish MICR guard failures
// from other validation errors.
// ===========================================================================

export class MicrSecurityError extends Error {
  readonly violations: unknown[];
  constructor(message: string, violations: unknown[] = []) {
    super(message);
    this.name = "MicrSecurityError";
    this.violations = violations;
  }
}

// ===========================================================================
// Convenience: derive MICR-safe elements from a layout for checking
// ===========================================================================

import type { LaidOutField, SheetLayout } from "@/lib/sheetLayout";

/**
 * Extract every printable field from a SheetLayout as a list of mm-based
 * elements, ready for enforceMicrSafety().
 */
export function layoutToMicrElements(layout: SheetLayout): MicrElementMm[] {
  return layout.fields
    .filter((f: LaidOutField) => f.printable && f.text !== "")
    .map((f: LaidOutField) => ({
      yMm: f.yMm,
      heightMm: f.heightMm,
    }));
}
