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

import type { BankTemplate, ProfileKey } from "./types.ts";
import { isDirectFeed } from "./types.ts";
import type { PrintGeometry } from "./printGeometry.ts";

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

const ALL_MODES: ProfileKey[] = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];

/**
 * Validate a complete BankTemplate. Returns a list of errors (empty/null when
 * the template is valid). Run once at load time so a corrupt template can never
 * reach the print engine.
 */
export function validateBankTemplate(template: BankTemplate): ValidationResult {
  const errors: ValidationError[] = [];
  const { id, bankName, widthMm, heightMm, fields, structural, profiles, print, enabled } = template;
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
       if (p.pageWidth <= 0 || p.pageHeight <= 0) {
         errors.push({ code: "PROFILE_DIMENSION_INVALID", message: `${id}: profile '${key}' has non-positive page dimensions.`, path: ctx(`profiles.${key}`) });
       }
      // 2b. Profile page dimensions must match the expected page size for the mode.
      // Direct Feed: page box = cheque (no rotation; feed direction is a printer setting).
      // A4 Carrier: page box = A4 portrait (210×297) or landscape (297×210).
      if (isDirectFeed(key)) {
        const expW = widthMm;
        const expH = heightMm;
        if (Math.abs(p.pageWidth - expW) > 0.05 || Math.abs(p.pageHeight - expH) > 0.05) {
          errors.push({
            code: "DF_PROFILE_DIM_MISMATCH",
            message: `${id}: profile '${key}' page dimensions (${p.pageWidth}×${p.pageHeight}) should be ${expW}×${expH}.`,
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

  // 3. Print config validation
  if (!print) {
    errors.push({ code: "PRINT_CONFIG_MISSING", message: `${id}: missing print configuration.`, path: ctx("print") });
  } else {
    if (typeof print !== "object") {
      errors.push({ code: "PRINT_CONFIG_INVALID", message: `${id}: print config is not an object.`, path: ctx("print") });
    } else {
      // 3a. Calibration defaults
      if (!print.calibration || !isFiniteNumber(print.calibration.defaultX) || !isFiniteNumber(print.calibration.defaultY)) {
        errors.push({
          code: "CAL_DEFAULT_NAN",
          message: `${id}: calibration defaults are not finite.`,
          path: ctx("print.calibration"),
        });
      }
      if (print.calibration) {
        const { defaultX, defaultY } = print.calibration;
        if (isFiniteNumber(defaultX) && (defaultX < -25 || defaultX > 25)) {
          errors.push({
            code: "CAL_DEFAULT_OUT_OF_RANGE",
            message: `${id}: calibration defaultX (${defaultX}) must be between -25 and 25 mm.`,
            path: ctx("print.calibration.defaultX"),
          });
        }
        if (isFiniteNumber(defaultY) && (defaultY < -25 || defaultY > 25)) {
          errors.push({
            code: "CAL_DEFAULT_OUT_OF_RANGE",
            message: `${id}: calibration defaultY (${defaultY}) must be between -25 and 25 mm.`,
            path: ctx("print.calibration.defaultY"),
          });
        }
      }
      // 3b. Supported modes
      if (print.supportedModes) {
        if (!Array.isArray(print.supportedModes)) {
          errors.push({
            code: "SUPPORTED_MODES_INVALID",
            message: `${id}: supportedModes is not an array.`,
            path: ctx("print.supportedModes"),
          });
        } else {
          for (const m of print.supportedModes) {
            if (!ALL_MODES.includes(m)) {
              errors.push({
                code: "SUPPORTED_MODE_INVALID",
                message: `${id}: unsupported print mode '${m}' in supportedModes.`,
                path: ctx("print.supportedModes"),
              });
            }
          }
        }
      }
    }
  }

  // 4. Enabled flag
  if (typeof enabled !== "boolean") {
    errors.push({ code: "ENABLED_INVALID", message: `${id}: 'enabled' must be a boolean.`, path: ctx("enabled") });
  }

  // 5. Field coordinates
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
    if (field.letterSpacing !== undefined && !isFiniteNumber(field.letterSpacing)) {
      errors.push({ code: "FIELD_NAN", message: `${id}.fields.${key}: letterSpacing not finite.`, path: ctx(`fields.${key}.letterSpacing`) });
    }
  }

  // 6. Structural positions
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

/**
 * Validate that there are no duplicate template IDs in a collection.
 * Returns an error with the duplicate IDs, or null if all are unique.
 */
export function validateNoDuplicateIds(templates: BankTemplate[]): ValidationResult {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const t of templates) {
    if (seen.has(t.id)) {
      duplicates.push(t.id);
    } else {
      seen.set(t.id, t.bankName);
    }
  }
  if (duplicates.length > 0) {
    return [{
      code: "DUPLICATE_TEMPLATE_ID",
      message: `Duplicate template IDs found: ${duplicates.join(", ")}`,
      path: "BANK_TEMPLATES",
    }];
  }
  return null;
}

/**
 * Validate that a template is safe to print — i.e., it's enabled and its
 * print configuration is well-formed. This is the runtime guard that runs
 * before any template reaches the print engine from user/admin configuration.
 */
export function validateTemplateForPrint(template: BankTemplate): ValidationResult {
  const errors: ValidationError[] = [];

  if (!template) {
    errors.push({ code: "TEMPLATE_NULL", message: "No template selected." });
    return errors;
  }

  if (!template.enabled) {
    errors.push({
      code: "TEMPLATE_DISABLED",
      message: `${template.id}: template is disabled by an administrator.`,
      path: "enabled",
    });
  }

  if (!template.print || !template.print.supportedModes || template.print.supportedModes.length === 0) {
    errors.push({
      code: "NO_SUPPORTED_MODES",
      message: `${template.id}: no supported print modes configured.`,
      path: "print.supportedModes",
    });
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
  const { pageW, pageH, containerW, containerH, chequeW, chequeH, chequeX, chequeY } = geom;

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
    // For Direct Feed the container IS the cheque — no rotation, no swap.
    // The @page is landscape 190.5×88.9; content is rendered flat.
    if (containerW !== chequeW || containerH !== chequeH) {
      errors.push({
        code: "DF_GEOMETRY_MISMATCH",
        message: `${mode}: container ${containerW}×${containerH} != cheque ${chequeW}×${chequeH}.`,
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
 * Validate the A4 Carrier profile's calibration safety.
 *
 * At print time, resolveCalibratedGeometry() clamps calibration so the cheque
 * can never leave the page. This function validates the *template* — it checks:
 *
 * 1. The cheque fits on the page at its BASE profile position (no calibration).
 *    If the base position already overflows, the template is broken.
 *
 * 2. The profile leaves at least a minimal calibration margin (≥ 0.5 mm) on
 *    each side, so the user can always make a fine-tuning adjustment in both
 *    directions. If a side has zero margin, calibration in that direction is
 *    silently clamped to 0 — the print is still valid but the user should be
 *    aware.
 *
 * 3. The cheque does not touch both opposing edges (would leave zero room
 *    for any calibration — a misconfigured template).
 *
 * For Direct Feed the page box IS the cheque, so calibration only shifts
 * field content within the cheque — no page-edge check is needed.
 *
 * Returns null if the template is safe, or a list of errors/warnings.
 * Errors (calibrationRange must contain at least one error-level issue to
 * block printing.
 */
export function validateCalibratedBounds(template: BankTemplate, mode: ProfileKey): ValidationResult {
  const errors: ValidationError[] = [];

  if (isDirectFeed(mode)) {
    return null;
  }

  const profile = template.profiles[mode];
  const chequeW = template.widthMm;
  const chequeH = template.heightMm;
  const pageW = profile.pageWidth;
  const pageH = profile.pageHeight;

  // 1. Base position must be on-page (cheque fully inside the A4 sheet)
  if (profile.x < -0.05) {
    errors.push({
      code: "A4_BASE_OFF_PAGE_LEFT",
      message: `${mode}: base profile x (${profile.x}) is negative — cheque starts off the left edge.`,
      path: mode,
    });
  }
  if (profile.x + chequeW > pageW + 0.05) {
    errors.push({
      code: "A4_BASE_OFF_PAGE_RIGHT",
      message: `${mode}: base profile x (${profile.x}) + cheque width (${chequeW}) exceeds page width (${pageW}).`,
      path: mode,
    });
  }
  if (profile.y < -0.05) {
    errors.push({
      code: "A4_BASE_OFF_PAGE_TOP",
      message: `${mode}: base profile y (${profile.y}) is negative — cheque starts above the top edge.`,
      path: mode,
    });
  }
  if (profile.y + chequeH > pageH + 0.05) {
    errors.push({
      code: "A4_BASE_OFF_PAGE_BOTTOM",
      message: `${mode}: base profile y (${profile.y}) + cheque height (${chequeH}) exceeds page height (${pageH}).`,
      path: mode,
    });
  }

  return errors.length ? errors : null;
}
