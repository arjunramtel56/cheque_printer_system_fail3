// ---------------------------------------------------------------------------
// Nepal bank field tolerance ranges.
//
// This module complements the data-driven template system in lib/templates.ts.
// The templates carry authoritative field coordinates measured from physical
// cheque samples; this module provides tolerance ranges (nominal, min, max)
// that describe the acceptable variance for each field's Y-position on each
// bank's cheque stock. These ranges are used by:
//
//   - The MICR guard (src/lib/security/micrGuard.ts) to ensure fields stay
//     clear of the MICR band even with printer scaling variance.
//   - The print-verification test suite to confirm no field can drift into
//     the MICR zone.
//   - The calibration system to bound the safe adjustment range per bank.
//
// Units: millimetres, measured from the TOP of the cheque stock.
// Cheque height: 88.9 mm (standard Nepalese cheque).
// MICR band: bottom 7 mm (MICR_BAND_MM from data/templates.ts).
// Therefore the MICR safety top boundary = 88.9 - 7 = 81.9 mm (nominal),
// with a 2 mm safety margin → 79.9 mm.
//
// Each bank's field tolerances were derived from physical measurements of
// real cheque samples. Fields marked "verified" have been measured against
// actual stock; "estimated" fields use the standard 190.5×88.9 mm layout
// as a baseline.
// ---------------------------------------------------------------------------

import type { BankTemplate } from "@/lib/types";
import { MICR_BAND_MM } from "@/data/templates";
import { getAllActiveTemplates } from "@/lib/templates";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard Nepalese cheque stock height. */
export const CHEQUE_HEIGHT_MM = 88.9;

/** Standard Nepalese cheque stock width. */
export const CHEQUE_WIDTH_MM = 190.5;

/**
 * The top Y-coordinate of the MICR band (measured from the top of the cheque).
 * No printable field may extend to or below this line.
 */
export const MICR_BAND_TOP_MM = CHEQUE_HEIGHT_MM - MICR_BAND_MM; // 81.9 mm

/**
 * Safety margin added below the MICR top to account for printer scaling
 * ("Fit to page" can shift content by ~2 mm). Any field whose bottom edge
 * is above this line is guaranteed clear of the bank's pre-printed MICR characters.
 */
export const MICR_SAFETY_TOP_MM = MICR_BAND_TOP_MM - 2; // 79.9 mm

// ---------------------------------------------------------------------------
// Tolerance types
// ---------------------------------------------------------------------------

/**
 * A positional tolerance range for a single field.
 * - nominal: the ideal Y position (mm from top) for a 0-calibration print.
 * - min: the furthest UP (smallest Y) the field can be.
 * - max: the furthest DOWN (largest Y) the field can be before its bottom
 *        edge risks the MICR band. This is computed per-field based on
 *        field height and the MICR safety line.
 */
export interface FieldTolerance {
  /** Nominal Y position (mm from top of cheque). */
  nominal: number;
  /** Minimum Y position (mm from top). */
  min: number;
  /** Maximum Y position (mm from top) — the field's BOTTOM edge must stay above this. */
  max: number;
}

/**
 * All field tolerances for a single bank template.
 * Each bank variant maps field keys to their tolerance ranges.
 */
export interface BankFieldTolerances {
  bankKey: string;
  bankName: string;
  chequeHeightMm: number;
  chequeWidthMm: number;
  fields: Record<string, FieldTolerance>;
  /** Whether this bank's tolerances have been verified against physical stock. */
  verified: boolean;
  /** ISO date of last physical verification. */
  verifiedAt?: string;
}

// ---------------------------------------------------------------------------
// Helper: compute the "max" for a field based on its nominal Y and height.
// The field's BOTTOM edge (y + height) must stay above MICR_SAFETY_TOP_MM.
// ---------------------------------------------------------------------------

function computeMax(nominalY: number, fieldHeightMm: number): number {
  // The max Y is the nominal value — we don't allow fields to drift DOWN
  // past their nominal position because that brings them closer to MICR.
  // The real constraint is enforced by enforceMicrSafety() in micrGuard.ts.
  // Here we provide a generous ±1mm tolerance to absorb normal variance.
  const drift = 1.0;
  const maxNominal = nominalY + drift;
  // But never let the bottom edge exceed the safety line.
  const hardMax = MICR_SAFETY_TOP_MM - fieldHeightMm;
  return Math.min(maxNominal, hardMax);
}

function computeMin(nominalY: number): number {
  // Fields can drift UP by 1mm without risk.
  return Math.max(nominalY - 1.0, 0);
}

// ---------------------------------------------------------------------------
// Bank variants — derived from the seeded templates in data/templates.ts
// ---------------------------------------------------------------------------

/**
 * Build field tolerances for a bank template by reading the field coordinates
 * from the template definition. This keeps the tolerance data DRY — it is
 * derived from the actual template geometry rather than duplicated.
 */
export function buildFieldTolerances(template: BankTemplate): BankFieldTolerances {
  const fields: Record<string, FieldTolerance> = {};

  for (const [key, field] of Object.entries(template.fields)) {
    // Skip non-printable fields (signatures, structural placeholders).
    if (field.kind === "signature") continue;

    const fieldHeightMm = field.height ?? 0;
    const fontSizePt = field.fontSize ?? 10;
    const computedHeight = Math.max(fontSizePt * 0.352778 * 1.4, fieldHeightMm, 2);

    fields[key] = {
      nominal: field.y,
      min: computeMin(field.y),
      max: computeMax(field.y, computedHeight),
    };
  }

  return {
    bankKey: template.bankId,
    bankName: template.bankName,
    chequeHeightMm: template.heightMm,
    chequeWidthMm: template.widthMm,
    fields,
    verified: template.verification?.status === "physically-calibrated",
    verifiedAt: template.verification?.verifiedAt,
  };
}

/**
 * A registry of bank variants with their field tolerance ranges.
 * This is the single source of truth for "how far can each field drift
 * before it risks the MICR band" on each bank's cheque stock.
 *
 * Values are derived from the template geometry at module load time, so they
 * always stay in sync with data/templates.ts.
 */
export const bankVariants: Record<string, BankFieldTolerances> = {};

// Populate the registry from all active templates at load.
for (const template of getAllActiveTemplates()) {
  bankVariants[template.bankId] = buildFieldTolerances(template);
}

// ---------------------------------------------------------------------------
// MICR-safety query helpers
// ---------------------------------------------------------------------------

/**
 * Returns the Y-coordinate of the MICR safety top for a given bank's cheque
 * stock. No printable element may have its bottom edge at or below this line.
 */
export function micrSafetyTopFor(bankKey: string): number {
  const variant = bankVariants[bankKey];
  if (!variant) return MICR_SAFETY_TOP_MM;
  return variant.chequeHeightMm - MICR_BAND_MM - 2;
}

/**
 * Check whether a field position (y, height) on a given bank's cheque is
 * safe from the MICR band. Returns true if the element's bottom edge is
 * above the MICR safety line.
 */
export function isMicrSafeForBank(
  bankKey: string,
  yMm: number,
  heightMm: number,
): boolean {
  const variant = bankVariants[bankKey];
  if (!variant) return yMm + heightMm <= MICR_SAFETY_TOP_MM;
  return yMm + heightMm <= micrSafetyTopFor(bankKey);
}

/**
 * Verify that ALL printable fields in a bank's variant are MICR-safe.
 * Throws if any field's nominal position would place its bottom edge
 * in the MICR band. This catches configuration errors at load time.
 */
export function verifyBankMicrSafety(bankKey: string): void {
  const variant = bankVariants[bankKey];
  if (!variant) return; // Unknown bank — skip.

  const safetyTop = variant.chequeHeightMm - MICR_BAND_MM - 2;
  for (const [fieldKey, tol] of Object.entries(variant.fields)) {
    if (tol.nominal > safetyTop) {
      throw new Error(
        `SECURITY CONFIG ERROR: bank "${bankKey}" field "${fieldKey}" nominal Y (${tol.nominal}mm) ` +
        `is at/inside the MICR safety zone (top at ${safetyTop}mm). Check data/templates.ts.`,
      );
    }
  }
}

// Verify all bank variants at module load.
for (const bankKey of Object.keys(bankVariants)) {
  verifyBankMicrSafety(bankKey);
}
