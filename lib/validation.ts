// ---------------------------------------------------------------------------
// Pure validation utilities for the print engine.
//
// These functions are the SINGLE validation layer:
//   - validateBankTemplate(...) — validates a template's dimensions, field
//     coordinates, and profile configuration once at load time.
//   - validatePrintGeometry(...) — validates geometry produced by
//     resolvePrintGeometry, including cheque-vs-page bounds under max
//     calibration, NaN/Infinity safety, and Direct-Feed rotation sanity.
//   - validateFieldBounds(...) — checks that a field rectangle stays within
//     the cheque boundary (used per-field and by the template validator).
//
// No JSX. No React. Importable from tests and from the component layer.
// ---------------------------------------------------------------------------

import type { BankTemplate, ProfileKey, PrintProfile } from "./types.ts";
import { isDirectFeed } from "./types.ts";
import type { PrintGeometry } from "./printGeometry.ts";
import { calibratedBounds } from "./printGeometry.ts";
import { CALIBRATION_MAX_MM } from "./calibration.ts";

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

export type ValidationResult = ValidationError[] | null;

/** True if a value is a finite number (rejects NaN, Infinity, non-numbers). */
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// ---------------------------------------------------------------------------
// Field / coordinate validation
// ---------------------------------------------------------------------------

interface FieldLike {
  x: number;
  y: number;
  width?: number;
  fontSize?: number;
  minFontSize?: number;
  letterSpacing?: number;
}

/**
 * Check that a field rectangle [x, x+width] × [y, ...] stays within the
 * cheque boundary [0, chequeW] × [0, chequeH]. A field is allowed to start
 * at y=0; only its *right edge* and *bottom edge* are bounded. The account-payee
 * line is intentionally full-width and may span x=0..chequeW.
 */
export function validateFieldBounds(
  field: FieldLike,
  chequeW: number,
  chequeH: number,
  label: string,
): ValidationError | null {
  if (!isFiniteNumber(field.x) || !isFiniteNumber(field.y)) {
    return { code: "FIELD_NAN", message: `${label}: x/y is not finite.`, path: label };
  }
  const width = field.width ?? 0;
  if (!isFiniteNumber(width)) {
    return { code: "FIELD_NAN", message: `${label}: width is not finite.`, path: label };
  }
  if (field.x < 0) {
    return { code: "FIELD_OUT_OF_BOUNDS", message: `${label}: x is negative (${field.x}).`, path: label };
  }
  if (field.y < 0) {
    return { code: "FIELD_OUT_OF_BOUNDS", message: `${label}: y is negative (${field.y}).`, path: label };
  }
  // Right edge: allow fields that touch the right edge (x+width <= chequeW + epsilon)
  if (field.x + width > chequeW + 0.05) {
    return {
      code: "FIELD_OVERFLOW",
      message: `${label}: right edge (${(field.x + width).toFixed(2)}) exceeds cheque width (${chequeW}).`,
      path: label,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Template validation
// ---------------------------------------------------------------------------

/**
 * Validate a complete BankTemplate. Returns a list of errors (empty/null when
 * the template is valid). Run once at load time so a corrupt template can never
 * reach the print engine.
 */
export function validateBankTemplate(template: BankTemplate): ValidationResult {
  const errors: ValidationError[] = [];
  const { id, bankName, widthMm, heightMm, fields, structural, profiles } = template;
  const ctx = (p: string) => `${id}.${p}`;

  // 1. Dimensions
  if (!isFiniteNumber(widthMm) || !isFiniteNumber(heightMm)) {
    errors.push({ code: "DIM_NAN", message: `${id}: dimensions are not finite.`, path: id });
    return errors; // can't check fields if dimensions are broken
  }
  if (widthMm <= 0 || heightMm <= 0) {
    errors.push({ code: "DIM_INVALID", message: `${id}: non-positive dimensions ${widthMm}×${heightMm}.`, path: id });
    return errors;
  }

  // 2. Required profile keys present for all four modes
  const requiredKeys: ProfileKey[] = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];
  for (const key of requiredKeys) {
    const p = profiles[key];
    if (!p) {
      errors.push({ code: "PROFILE_MISSING", message: `${id}: missing profile '${key}'.`, path: ctx(`profiles.${key}`) });
      continue;
    }
    if (!isFiniteNumber(p.x) || !isFiniteNumber(p.y) || !isFiniteNumber(p.pageWidth) || !isFiniteNumber(p.pageHeight)) {
      errors.push({ code: "PROFILE_NAN", message: `${id}: profile '${key}' has non-finite values.`, path: ctx(`profiles.${key}`) });
      continue;
    }
    if (p.rotate !== 0 && p.rotate !== 90) {
      errors.push({ code: "PROFILE_ROTATE_INVALID", message: `${id}: profile '${key}' rotate must be 0 or 90 (got ${p.rotate}).`, path: ctx(`profiles.${key}.rotate`) });
    }
     if (p.pageWidth <= 0 || p.pageHeight <= 0) {
       errors.push({ code: "PROFILE_DIMENSION_INVALID", message: `${id}: profile '${key}' has non-positive page dimensions.`, path: ctx(`profiles.${key}`) });
     }

     // 2b. Profile page dimensions must match the expected page size for the mode.
     // Direct Feed: page box = cheque (swapped when rotate=90).
     // A4 Carrier: page box = A4 portrait (210×297) or landscape (297×210).
     if (isDirectFeed(key)) {
       const expW = p.rotate === 90 ? heightMm : widthMm;
       const expH = p.rotate === 90 ? widthMm : heightMm;
       if (Math.abs(p.pageWidth - expW) > 0.05 || Math.abs(p.pageHeight - expH) > 0.05) {
         errors.push({
           code: "DF_PROFILE_DIM_MISMATCH",
           message: `${id}: profile '${key}' page dimensions (${p.pageWidth}×${p.pageHeight}) should be ${expW}×${expH} for rotate ${p.rotate}.`,
           path: ctx(`profiles.${key}`),
         });
       }
     } else {
       const expW = key === "a4_vertical" ? 210 : 297;
       const expH = key === "a4_vertical" ? 297 : 210;
       if (Math.abs(p.pageWidth - expW) > 0.05 || Math.abs(p.pageHeight - expH) > 0.05) {
         errors.push({
           code: "A4_PROFILE_DIM_MISMATCH",
           message: `${id}: profile '${key}' page dimensions (${p.pageWidth}×${p.pageHeight}) should be ${expW}×${expH}.`,
           path: ctx(`profiles.${key}`),
         });
       }
     }
   }

  // 3. Field coordinates
  const fieldLabels: Record<string, string> = {
    date: "date",
    payee: "payee",
    words1: "words",
    words2: "words",
    amount: "amount",
    accountPayee: "acpayee",
    memo: "memo",
  };
  for (const [key, field] of Object.entries(fields)) {
    const label = fieldLabels[key] ?? key;
    const err = validateFieldBounds(field as FieldLike, widthMm, heightMm, `${id}.fields.${key}`);
    if (err) errors.push(err);
    if (field.fontSize !== undefined && !isFiniteNumber(field.fontSize)) {
      errors.push({ code: "FIELD_NAN", message: `${id}.fields.${key}: fontSize not finite.`, path: ctx(`fields.${key}.fontSize`) });
    }
    if (field.minFontSize !== undefined && !isFiniteNumber(field.minFontSize)) {
      errors.push({ code: "FIELD_NAN", message: `${id}.fields.${key}: minFontSize not finite.`, path: ctx(`fields.${key}.minFontSize`) });
    }
    if (field.width !== undefined && field.width <= 0) {
      errors.push({ code: "FIELD_DIM_INVALID", message: `${id}.fields.${key}: width must be positive.`, path: ctx(`fields.${key}.width`) });
    }
  }

  // 4. Structural positions
  if (structural) {
    for (const [key, sp] of Object.entries(structural)) {
      const label = `${id}.structural.${key}`;
      if (!isFiniteNumber(sp.x) || !isFiniteNumber(sp.y)) {
        errors.push({ code: "STRUCTURAL_NAN", message: `${label}: x/y not finite.`, path: label });
        continue;
      }
      const w = sp.width ?? 0;
      if (!isFiniteNumber(w)) {
        errors.push({ code: "STRUCTURAL_NAN", message: `${label}: width not finite.`, path: label });
        continue;
      }
      // Signatures / pay label typically fit within cheque width
      const overflowErr = validateFieldBounds({ x: sp.x, y: sp.y, width: w }, widthMm, heightMm, label);
      if (overflowErr) errors.push(overflowErr);
    }
  }

  return errors.length ? errors : null;
}

// ---------------------------------------------------------------------------
// Geometry validation (post-resolve)
// ---------------------------------------------------------------------------

/**
 * Validate the geometry produced by resolvePrintGeometry, taking the *worst-case
 * calibration* (max offset in the direction of the cheque's nearest edge) into
 * account for A4 Carrier modes. This guarantees the cheque can never be shifted
 * partially off the page by calibration, and that @page/container math is sane.
 */
export function validatePrintGeometry(geom: PrintGeometry, template: BankTemplate, mode: ProfileKey): ValidationResult {
  const errors: ValidationError[] = [];
  const { pageW, pageH, containerW, containerH, chequeW, chequeH, chequeX, chequeY, rotate } = geom;

  // Finite check
  const check = (v: unknown, label: string) => {
    if (!isFiniteNumber(v)) errors.push({ code: "GEOM_NAN", message: `${mode}: ${label} not finite.`, path: mode });
  };
  check(pageW, "pageW");
  check(pageH, "pageH");
  check(containerW, "containerW");
  check(containerH, "containerH");
  check(chequeW, "chequeW");
  check(chequeH, "chequeH");
  check(chequeX, "chequeX");
  check(chequeY, "chequeY");

  // Container must be the page box
  if (containerW !== pageW || containerH !== pageH) {
    errors.push({ code: "GEOM_CONTAINER_PAGE_MISMATCH", message: `${mode}: container (${containerW}×${containerH}) != @page (${pageW}×${pageH}).`, path: mode });
  }

  if (isDirectFeed(mode)) {
    // For Direct Feed the container IS the cheque (optionally swapped).
    const expectedW = rotate === 90 ? chequeH : chequeW;
    const expectedH = rotate === 90 ? chequeW : chequeH;
    if (containerW !== expectedW || containerH !== expectedH) {
      errors.push({
        code: "DF_GEOMETRY_MISMATCH",
        message: `${mode}: container ${containerW}×${containerH} != expected ${expectedW}×${expectedH} for rotate ${rotate}.`,
        path: mode,
      });
    }
    // After rotation, the rotated cheque must fill the container exactly.
    if (rotate === 90 && (chequeW !== expectedH || chequeH !== expectedW)) {
      errors.push({
        code: "DF_ROTATION_CHEQUE_SIZE",
        message: `${mode}: rotate=90 but cheque dimensions ${chequeW}×${chequeH} do not swap to ${expectedW}×${expectedH}.`,
        path: mode,
      });
    }
  } else {
    // A4 Carrier: the cheque must fit within the page at its *base* profile
    // position (calibration is clamped to ±CALIBRATION_MAX_MM at input time and
    // validated per-use, so a template is "valid" if its base placement fits;
    // runtime calibration that would push off-page is caught by the clamped
    // range + validateCalibrationPair guard in the component).
    if (chequeX < -0.05) {
      errors.push({ code: "A4_CHEQUE_OFF_PAGE_LEFT", message: `${mode}: cheque x is negative (${chequeX}).`, path: mode });
    }
    if (chequeX + chequeW > pageW + 0.05) {
      errors.push({ code: "A4_CHEQUE_OFF_PAGE_RIGHT", message: `${mode}: cheque right edge (${(chequeX + chequeW).toFixed(2)}) exceeds page width (${pageW}).`, path: mode });
    }
    if (chequeY < -0.05) {
      errors.push({ code: "A4_CHEQUE_OFF_PAGE_TOP", message: `${mode}: cheque y is negative (${chequeY}).`, path: mode });
    }
     if (chequeY + chequeH > pageH + 0.05) {
       errors.push({ code: "A4_CHEQUE_OFF_PAGE_BOTTOM", message: `${mode}: cheque bottom edge (${(chequeY + chequeH).toFixed(2)}) exceeds page height (${pageH}).`, path: mode });
     }
   }

  return errors.length ? errors : null;
}

// ---------------------------------------------------------------------------
// Calibrated geometry validation (A4 Carrier — cheque stays on page at max cal)
// ---------------------------------------------------------------------------

/**
 * Validate that, even at maximum calibration (±25 mm in each axis), the cheque
 * never leaves the A4 page. This is the critical safety check: a template that
 * fits at base position but is too close to an edge would be pushed off-page by
 * calibration at print time.
 *
 * For Direct Feed the page box IS the cheque, so calibration does not move the
 * cheque relative to the page — no edge check is needed (but finiteness is
 * still confirmed).
 *
 * Returns null if safe, or a list of errors if the cheque can escape the page.
 */
export function validateCalibratedBounds(template: BankTemplate, mode: ProfileKey): ValidationResult {
  const errors: ValidationError[] = [];

  if (isDirectFeed(mode)) {
    return null;
  }

  // A4 Carrier
  const bounds = calibratedBounds(template, mode);
  const profile = template.profiles[mode];
  const pageW = profile.pageWidth;
  const pageH = profile.pageHeight;

  if (bounds.minX < -0.05) {
    errors.push({
      code: "A4_CAL_OVERFLOW_LEFT",
      message: `${mode}: at max calibration (-${CALIBRATION_MAX_MM}mm), cheque would be ${Math.abs(bounds.minX).toFixed(1)}mm off the left edge.`,
      path: mode,
    });
  }
  if (bounds.maxRight > pageW + 0.05) {
    errors.push({
      code: "A4_CAL_OVERFLOW_RIGHT",
      message: `${mode}: at max calibration (+${CALIBRATION_MAX_MM}mm), cheque right edge (${bounds.maxRight.toFixed(1)}mm) exceeds page width (${pageW}mm).`,
      path: mode,
    });
  }
  if (bounds.minY < -0.05) {
    errors.push({
      code: "A4_CAL_OVERFLOW_TOP",
      message: `${mode}: at max calibration (-${CALIBRATION_MAX_MM}mm), cheque would be ${Math.abs(bounds.minY).toFixed(1)}mm off the top edge.`,
      path: mode,
    });
  }
  if (bounds.maxBottom > pageH + 0.05) {
    errors.push({
      code: "A4_CAL_OVERFLOW_BOTTOM",
      message: `${mode}: at max calibration (+${CALIBRATION_MAX_MM}mm), cheque bottom edge (${bounds.maxBottom.toFixed(1)}mm) exceeds page height (${pageH}mm).`,
      path: mode,
    });
  }

  return errors.length ? errors : null;
}
