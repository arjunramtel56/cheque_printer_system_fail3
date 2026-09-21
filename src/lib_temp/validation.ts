// ---------------------------------------------------------------------------
// Pure validation utilities for the cheque engine.
//
//   validateBank            — one catalogue entry
//   validateBankTemplate    — dimensions, orientation, size registry, fields,
//                             safe zones, profiles and print configuration
//   validateCatalogue       — banks <-> templates cross-integrity
//   validatePrintGeometry   — the geometry resolver's output, per mode
//   validateCalibratedBounds— the template's carrier placement is calibration-safe
//   validateTemplateForPrint— runtime guard for a template about to be printed
//
// No JSX. No React. Importable from tests and from the component layer.
// ---------------------------------------------------------------------------

import type {
  Bank,
  BankTemplate,
  FieldKind,
  NrbClass,
  Orientation,
  ProfileKey,
  SafeZone,
} from "./types.ts";
import { isDirectFeed, isPrintableKind } from "./types.ts";
import type { PrintGeometry } from "./printGeometry.ts";
import { getChequeSize, getPaperSize, orientationMatchesSize } from "./sizes.ts";
import { paperIdForMode } from "./types.ts";

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

const SLUG = /^[a-z0-9][a-z0-9_-]*$/;
const FIELD_KINDS: FieldKind[] = ["date-grid", "payee", "words", "amount", "ac-payee", "label", "signature", "reference"];
const NRB_CLASSES: NrbClass[] = ["A", "B", "C", "D"];
const ORIENTATIONS: Orientation[] = ["portrait", "landscape"];
const ALL_MODES: ProfileKey[] = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];

// ---------------------------------------------------------------------------
// Bank validation
// ---------------------------------------------------------------------------

export function validateBank(bank: Bank): ValidationError | null {
  if (!bank || typeof bank !== "object") {
    return { code: "BANK_INVALID", message: "Bank entry is not an object.", path: "bank" };
  }
  const path = bank.id || "bank";
  if (typeof bank.id !== "string" || !SLUG.test(bank.id)) {
    return {
      code: "BANK_ID_INVALID",
      message: `Bank id "${bank.id}" must be lowercase alphanumeric with hyphens or underscores.`,
      path,
    };
  }
  if (typeof bank.name !== "string" || bank.name.trim() === "") {
    return { code: "BANK_NAME_MISSING", message: `${path}: bank name is required.`, path };
  }
  if (!NRB_CLASSES.includes(bank.nrbClass)) {
    return { code: "BANK_CLASS_INVALID", message: `${path}: NRB class "${bank.nrbClass}" is not A, B, C or D.`, path };
  }
  if (!["active", "merged", "defunct", "inactive"].includes(bank.status)) {
    return { code: "BANK_STATUS_INVALID", message: `${path}: unknown status "${bank.status}".`, path };
  }
  if (typeof bank.enabled !== "boolean") {
    return { code: "BANK_ENABLED_INVALID", message: `${path}: 'enabled' must be a boolean.`, path };
  }
  if (!Array.isArray(bank.templateIds) || bank.templateIds.some((id) => typeof id !== "string")) {
    return { code: "BANK_TEMPLATE_IDS_INVALID", message: `${path}: templateIds must be an array of strings.`, path };
  }
  if (bank.status === "merged" && !bank.supersededBy) {
    return { code: "BANK_MERGED_TARGET_MISSING", message: `${path}: a merged bank must name the bank it merged into.`, path };
  }
  if (bank.verifiedAt !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(bank.verifiedAt))) {
    return { code: "BANK_VERIFIED_AT_INVALID", message: `${path}: verifiedAt must be an ISO date (YYYY-MM-DD).`, path };
  }
  return null;
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
  height?: number;
}

/**
 * Estimated rendered height of a field in mm — used for safe-zone overlap and
 * bottom-edge checks. Font size is in points (1pt = 0.352778 mm).
 */
export function fieldHeightMm(field: FieldLike): number {
  if (isFiniteNumber(field.height) && field.height > 0) return field.height;
  const fontSize = isFiniteNumber(field.fontSize) ? field.fontSize : 10;
  return Math.max(fontSize * 0.352778 * 1.4, 2);
}

/**
 * Check that a field rectangle stays within the cheque boundary
 * [0, chequeW] × [0, chequeH]. A field may start at y=0; its right and bottom
 * edges are bounded. The account-payee line is intentionally full-width and may
 * span x=0..chequeW.
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
// Safe zones
// ---------------------------------------------------------------------------

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Validate the reserved (non-printable) zones: inside the cheque, positive
 *  area, unique ids. */
export function validateSafeZones(safeZones: SafeZone[] | undefined, widthMm: number, heightMm: number, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (safeZones === undefined) return errors;
  if (!Array.isArray(safeZones)) {
    errors.push({ code: "SAFE_ZONE_INVALID", message: `${path}: safeZones must be an array.`, path });
    return errors;
  }
  const seen = new Set<string>();
  for (const zone of safeZones) {
    const label = `${path}.${zone?.id ?? "?"}`;
    if (!zone || typeof zone.id !== "string" || zone.id.trim() === "") {
      errors.push({ code: "SAFE_ZONE_INVALID", message: `${label}: a safe zone needs an id.`, path: label });
      continue;
    }
    if (seen.has(zone.id)) {
      errors.push({ code: "SAFE_ZONE_DUPLICATE", message: `${label}: duplicate safe zone id.`, path: label });
    }
    seen.add(zone.id);
    if (!isFiniteNumber(zone.x) || !isFiniteNumber(zone.y) || !isFiniteNumber(zone.width) || !isFiniteNumber(zone.height)) {
      errors.push({ code: "SAFE_ZONE_NAN", message: `${label}: coordinates/size are not finite.`, path: label });
      continue;
    }
    if (zone.width <= 0 || zone.height <= 0) {
      errors.push({ code: "SAFE_ZONE_INVALID", message: `${label}: width/height must be positive.`, path: label });
    }
    if (zone.x < -0.05 || zone.y < -0.05 || zone.x + zone.width > widthMm + 0.05 || zone.y + zone.height > heightMm + 0.05) {
      errors.push({ code: "SAFE_ZONE_OUT_OF_BOUNDS", message: `${label}: zone falls outside the cheque.`, path: label });
    }
  }
  return errors;
}

/** No printable field may overlap a reserved zone. This is the rule that keeps
 *  the engine off the MICR band. */
export function validateSafeZoneClearance(template: BankTemplate): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!template.safeZones || template.safeZones.length === 0) return errors;
  for (const field of Object.values(template.fields)) {
    if (!isPrintableKind(field.kind)) continue;
    const rect = {
      x: field.x,
      y: field.y,
      w: field.width,
      h: fieldHeightMm(field),
    };
    for (const zone of template.safeZones) {
      if (!isFiniteNumber(zone.x) || !isFiniteNumber(zone.y)) continue;
      if (overlaps(rect, { x: zone.x, y: zone.y, w: zone.width, h: zone.height })) {
        errors.push({
          code: "SAFE_ZONE_OVERLAP",
          message: `${template.id}.fields.${field.key}: overlaps reserved zone "${zone.id}" (${zone.label}).`,
          path: `${template.id}.fields.${field.key}`,
        });
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Template validation
// ---------------------------------------------------------------------------

/**
 * Validate a complete cheque template. Returns a list of errors, or null when
 * valid. Runs at load time AND on every admin save, so a corrupt template can
 * never reach the print engine.
 */
export function validateBankTemplate(template: BankTemplate): ValidationResult {
  const errors: ValidationError[] = [];
  const { id, bankId, bankName, label, sizeId, widthMm, heightMm, orientation, fields, profiles, print, safeZones, verification, enabled } = template;
  const ctx = (p: string) => `${id}.${p}`;

  // 0. Identity
  if (typeof id !== "string" || !SLUG.test(id)) {
    errors.push({ code: "TEMPLATE_ID_INVALID", message: `Template id "${id}" is not a valid slug.`, path: "id" });
  }
  if (typeof bankId !== "string" || !SLUG.test(bankId)) {
    errors.push({ code: "TEMPLATE_BANK_ID_INVALID", message: `${id}: bankId "${bankId}" is not a valid slug.`, path: ctx("bankId") });
  }
  if (typeof bankName !== "string" || bankName.trim() === "") {
    errors.push({ code: "TEMPLATE_BANK_NAME_MISSING", message: `${id}: bank name is required.`, path: ctx("bankName") });
  }
  if (typeof label !== "string" || label.trim() === "") {
    errors.push({ code: "TEMPLATE_LABEL_MISSING", message: `${id}: a template label is required.`, path: ctx("label") });
  }

  // 1. Dimensions
  if (!isFiniteNumber(widthMm) || !isFiniteNumber(heightMm)) {
    errors.push({ code: "DIM_NAN", message: `${id}: dimensions are not finite.`, path: id });
    return errors; // cannot check geometry with broken dimensions
  }
  if (widthMm <= 0 || heightMm <= 0) {
    errors.push({ code: "DIM_INVALID", message: `${id}: non-positive dimensions ${widthMm}×${heightMm}.`, path: id });
    return errors;
  }

  // 1b. Declared orientation must be truthful about the physical box.
  if (!ORIENTATIONS.includes(orientation)) {
    errors.push({ code: "ORIENTATION_INVALID", message: `${id}: orientation "${orientation}" is not portrait or landscape.`, path: ctx("orientation") });
  } else if (!orientationMatchesSize(widthMm, heightMm, orientation)) {
    errors.push({
      code: "ORIENTATION_MISMATCH",
      message: `${id}: declared ${orientation} does not match ${widthMm}×${heightMm} mm.`,
      path: ctx("orientation"),
    });
  }

  // 1c. The size registry must agree with the denormalized dimensions. This is
  // what stops a template from drifting away from the central size registry.
  if (typeof sizeId !== "string" || sizeId.trim() === "") {
    errors.push({ code: "SIZE_ID_MISSING", message: `${id}: sizeId is required.`, path: ctx("sizeId") });
  } else {
    const size = getChequeSize(sizeId);
    if (!size) {
      errors.push({ code: "SIZE_UNKNOWN", message: `${id}: cheque size "${sizeId}" is not in the size registry.`, path: ctx("sizeId") });
    } else if (Math.abs(size.widthMm - widthMm) > 0.01 || Math.abs(size.heightMm - heightMm) > 0.01) {
      errors.push({
        code: "SIZE_REGISTRY_MISMATCH",
        message: `${id}: dimensions ${widthMm}×${heightMm} disagree with size "${sizeId}" (${size.widthMm}×${size.heightMm}).`,
        path: ctx("sizeId"),
      });
    }
  }

  // 2. Profiles: all four modes present, finite, consistent with the registry.
  for (const key of ALL_MODES) {
    const p = profiles?.[key];
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
    if (isDirectFeed(key)) {
      // Direct feed: the page box IS the cheque (no rotation, no swap).
      if (Math.abs(p.pageWidth - widthMm) > 0.05 || Math.abs(p.pageHeight - heightMm) > 0.05) {
        errors.push({
          code: "DF_PROFILE_DIM_MISMATCH",
          message: `${id}: profile '${key}' page dimensions (${p.pageWidth}×${p.pageHeight}) should be ${widthMm}×${heightMm}.`,
          path: ctx(`profiles.${key}`),
        });
      }
    } else {
      // Carrier: the page box is the registered paper for that mode.
      const paper = getPaperSize(paperIdForMode(key, sizeId));
      if (paper && (Math.abs(p.pageWidth - paper.widthMm) > 0.05 || Math.abs(p.pageHeight - paper.heightMm) > 0.05)) {
        errors.push({
          code: "A4_PROFILE_DIM_MISMATCH",
          message: `${id}: profile '${key}' page dimensions (${p.pageWidth}×${p.pageHeight}) should be ${paper.widthMm}×${paper.heightMm} (${paper.id}).`,
          path: ctx(`profiles.${key}`),
        });
      }
    }
  }

  // 3. Print configuration
  if (!print) {
    errors.push({ code: "PRINT_CONFIG_MISSING", message: `${id}: missing print configuration.`, path: ctx("print") });
  } else if (typeof print !== "object") {
    errors.push({ code: "PRINT_CONFIG_INVALID", message: `${id}: print config is not an object.`, path: ctx("print") });
  } else {
    if (!print.calibration || !isFiniteNumber(print.calibration.defaultX) || !isFiniteNumber(print.calibration.defaultY)) {
      errors.push({ code: "CAL_DEFAULT_NAN", message: `${id}: calibration defaults are not finite.`, path: ctx("print.calibration") });
    } else {
      const { defaultX, defaultY } = print.calibration;
      if (defaultX < -25 || defaultX > 25) {
        errors.push({
          code: "CAL_DEFAULT_OUT_OF_RANGE",
          message: `${id}: calibration defaultX (${defaultX}) must be between -25 and 25 mm.`,
          path: ctx("print.calibration.defaultX"),
        });
      }
      if (defaultY < -25 || defaultY > 25) {
        errors.push({
          code: "CAL_DEFAULT_OUT_OF_RANGE",
          message: `${id}: calibration defaultY (${defaultY}) must be between -25 and 25 mm.`,
          path: ctx("print.calibration.defaultY"),
        });
      }
    }
    if (!Array.isArray(print.supportedModes)) {
      errors.push({ code: "SUPPORTED_MODES_INVALID", message: `${id}: supportedModes is not an array.`, path: ctx("print.supportedModes") });
    } else {
      for (const m of print.supportedModes) {
        if (!ALL_MODES.includes(m)) {
          errors.push({ code: "SUPPORTED_MODE_INVALID", message: `${id}: unsupported print mode '${m}' in supportedModes.`, path: ctx("print.supportedModes") });
        }
      }
    }
  }

  // 4. Verification metadata
  if (!verification || typeof verification !== "object") {
    errors.push({ code: "VERIFICATION_MISSING", message: `${id}: verification metadata is required.`, path: ctx("verification") });
  } else if (!["unverified", "browser-verified", "physically-calibrated"].includes(verification.status)) {
    errors.push({
      code: "VERIFICATION_INVALID",
      message: `${id}: unknown verification status "${verification.status}".`,
      path: ctx("verification.status"),
    });
  } else if (verification.status === "physically-calibrated" && !verification.verifiedAt) {
    errors.push({
      code: "VERIFICATION_DATE_MISSING",
      message: `${id}: a physically calibrated template must record the date it was verified.`,
      path: ctx("verification.verifiedAt"),
    });
  }

  // 5. Enabled flag
  if (typeof enabled !== "boolean") {
    errors.push({ code: "ENABLED_INVALID", message: `${id}: 'enabled' must be a boolean.`, path: ctx("enabled") });
  }

  // 6. Fields — every entry must carry its own key, label and kind.
  for (const [key, field] of Object.entries(fields ?? {})) {
    const path = `${id}.fields.${key}`;
    if (!field || typeof field !== "object") {
      errors.push({ code: "FIELD_INVALID", message: `${path}: field is not an object.`, path });
      continue;
    }
    if (field.key !== key) {
      errors.push({ code: "FIELD_KEY_MISMATCH", message: `${path}: field.key "${field.key}" does not match its key.`, path });
    }
    if (typeof field.label !== "string" || field.label.trim() === "") {
      errors.push({ code: "FIELD_LABEL_MISSING", message: `${path}: a field label is required.`, path });
    }
    if (!FIELD_KINDS.includes(field.kind)) {
      errors.push({ code: "FIELD_KIND_INVALID", message: `${path}: unknown field kind "${field.kind}".`, path });
    }
    const err = validateFieldBounds(field as FieldLike, widthMm, heightMm, path);
    if (err) errors.push(err);
    if (field.fontSize !== undefined && !isFiniteNumber(field.fontSize)) {
      errors.push({ code: "FIELD_NAN", message: `${path}: fontSize not finite.`, path: `${path}.fontSize` });
    }
    if (field.minFontSize !== undefined && !isFiniteNumber(field.minFontSize)) {
      errors.push({ code: "FIELD_NAN", message: `${path}: minFontSize not finite.`, path: `${path}.minFontSize` });
    }
    if (field.width !== undefined && field.width <= 0) {
      errors.push({ code: "FIELD_DIM_INVALID", message: `${path}: width must be positive.`, path: `${path}.width` });
    }
    if (field.letterSpacing !== undefined && !isFiniteNumber(field.letterSpacing)) {
      errors.push({ code: "FIELD_NAN", message: `${path}: letterSpacing not finite.`, path: `${path}.letterSpacing` });
    }
    // Printable fields must also fit vertically inside the cheque.
    if (field.y + fieldHeightMm(field as FieldLike) > heightMm + 0.05) {
      errors.push({ code: "FIELD_OVERFLOW", message: `${path}: bottom edge exceeds cheque height (${heightMm}).`, path });
    }
  }

  // 7. Structural (screen-only) positions
  if (template.structural) {
    for (const [key, sp] of Object.entries(template.structural)) {
      const path = `${id}.structural.${key}`;
      if (!isFiniteNumber(sp.x) || !isFiniteNumber(sp.y)) {
        errors.push({ code: "STRUCTURAL_NAN", message: `${path}: x/y not finite.`, path });
        continue;
      }
      const w = sp.width ?? 0;
      if (!isFiniteNumber(w)) {
        errors.push({ code: "STRUCTURAL_NAN", message: `${path}: width not finite.`, path });
        continue;
      }
      const overflowErr = validateFieldBounds({ x: sp.x, y: sp.y, width: w }, widthMm, heightMm, path);
      if (overflowErr) errors.push(overflowErr);
    }
  }

  // 8. Safe zones and printable-field clearance
  errors.push(...validateSafeZones(safeZones, widthMm, heightMm, ctx("safeZones")));
  errors.push(...validateSafeZoneClearance(template));

  return errors.length ? errors : null;
}

/** Validate that there are no duplicate template IDs in a collection. */
export function validateNoDuplicateIds(templates: BankTemplate[]): ValidationResult {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const t of templates) {
    if (seen.has(t.id)) duplicates.push(t.id);
    else seen.add(t.id);
  }
  if (duplicates.length > 0) {
    return [
      {
        code: "DUPLICATE_TEMPLATE_ID",
        message: `Duplicate template IDs found: ${duplicates.join(", ")}`,
        path: "BANK_TEMPLATES",
      },
    ];
  }
  return null;
}

/**
 * Cross-integrity of the whole catalogue: unique bank ids, unique template ids,
 * every template resolving to a real bank, and every declared bank template id
 * resolving back to that bank.
 */
export function validateCatalogue(banks: Bank[], templates: BankTemplate[]): ValidationResult {
  const errors: ValidationError[] = [];
  const byId = new Map<string, Bank>();

  for (const bank of banks) {
    const err = validateBank(bank);
    if (err) {
      errors.push(err);
      continue;
    }
    if (byId.has(bank.id)) {
      errors.push({ code: "DUPLICATE_BANK_ID", message: `Duplicate bank id "${bank.id}".`, path: bank.id });
    }
    byId.set(bank.id, bank);
  }

  const templateIds = new Set<string>();
  for (const template of templates) {
    if (templateIds.has(template.id)) {
      errors.push({ code: "DUPLICATE_TEMPLATE_ID", message: `Duplicate template id "${template.id}".`, path: template.id });
    }
    templateIds.add(template.id);
    if (!byId.has(template.bankId)) {
      errors.push({
        code: "ORPHAN_TEMPLATE",
        message: `Template "${template.id}" belongs to unknown bank "${template.bankId}".`,
        path: template.id,
      });
    }
  }

  for (const bank of banks) {
    for (const templateId of bank.templateIds ?? []) {
      const template = templates.find((t) => t.id === templateId);
      if (!template) {
        errors.push({
          code: "BANK_TEMPLATE_MISSING",
          message: `Bank "${bank.id}" references missing template "${templateId}".`,
          path: bank.id,
        });
      } else if (template.bankId !== bank.id) {
        errors.push({
          code: "BANK_TEMPLATE_LINK_MISMATCH",
          message: `Bank "${bank.id}" references template "${templateId}" that belongs to "${template.bankId}".`,
          path: bank.id,
        });
      }
    }
  }

  return errors.length ? errors : null;
}

/**
 * Validate that a template is safe to print — enabled, well-formed print
 * configuration, and a bank that exists.
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
  if (!template.bankId) {
    errors.push({ code: "TEMPLATE_BANK_ID_INVALID", message: `${template.id}: template has no bank.`, path: "bankId" });
  }
  return errors.length ? errors : null;
}

// ---------------------------------------------------------------------------
// Geometry validation (post-resolve)
// ---------------------------------------------------------------------------

/**
 * Validate the geometry produced by resolvePrintGeometry: @page/container math,
 * the cheque staying on the carrier paper at its base placement, orientation
 * truthfulness and NaN/Infinity safety.
 */
export function validatePrintGeometry(geom: PrintGeometry, template: BankTemplate, mode: ProfileKey): ValidationResult {
  const errors: ValidationError[] = [];
  const { pageW, pageH, containerW, containerH, chequeW, chequeH, chequeX, chequeY } = geom;

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

  if (containerW !== pageW || containerH !== pageH) {
    errors.push({
      code: "GEOM_CONTAINER_PAGE_MISMATCH",
      message: `${mode}: container (${containerW}×${containerH}) != @page (${pageW}×${pageH}).`,
      path: mode,
    });
  }

  // The cheque's physical box must be the template's declared size in every mode.
  if (Math.abs(chequeW - template.widthMm) > 0.01 || Math.abs(chequeH - template.heightMm) > 0.01) {
    errors.push({
      code: "GEOM_CHEQUE_SIZE_MISMATCH",
      message: `${mode}: cheque box ${chequeW}×${chequeH} != declared size ${template.widthMm}×${template.heightMm}.`,
      path: mode,
    });
  }

  if (isDirectFeed(mode)) {
    // The container IS the cheque — no rotation, no swap, no offset.
    if (containerW !== chequeW || containerH !== chequeH) {
      errors.push({
        code: "DF_GEOMETRY_MISMATCH",
        message: `${mode}: container ${containerW}×${containerH} != cheque ${chequeW}×${chequeH}.`,
        path: mode,
      });
    }
    if (chequeX !== 0 || chequeY !== 0) {
      errors.push({ code: "DF_GEOMETRY_MISMATCH", message: `${mode}: direct feed cannot offset the cheque.`, path: mode });
    }
  } else {
    if (chequeX < -0.05) {
      errors.push({ code: "A4_CHEQUE_OFF_PAGE_LEFT", message: `${mode}: cheque x is negative (${chequeX}).`, path: mode });
    }
    if (chequeX + chequeW > pageW + 0.05) {
      errors.push({
        code: "A4_CHEQUE_OFF_PAGE_RIGHT",
        message: `${mode}: cheque right edge (${(chequeX + chequeW).toFixed(2)}) exceeds page width (${pageW}).`,
        path: mode,
      });
    }
    if (chequeY < -0.05) {
      errors.push({ code: "A4_CHEQUE_OFF_PAGE_TOP", message: `${mode}: cheque y is negative (${chequeY}).`, path: mode });
    }
    if (chequeY + chequeH > pageH + 0.05) {
      errors.push({
        code: "A4_CHEQUE_OFF_PAGE_BOTTOM",
        message: `${mode}: cheque bottom edge (${(chequeY + chequeH).toFixed(2)}) exceeds page height (${pageH}).`,
        path: mode,
      });
    }
  }

  return errors.length ? errors : null;
}

/**
 * Validate that a carrier profile's BASE placement is on-page and that at least
 * a minimal calibration margin (0.5 mm) exists on each side, so the user can
 * always fine-tune in both directions. Direct feed needs no such check because
 * the page box IS the cheque.
 */
export function validateCalibratedBounds(template: BankTemplate, mode: ProfileKey): ValidationResult {
  const errors: ValidationError[] = [];

  if (isDirectFeed(mode)) return null;
  if (!template.profiles?.[mode]) {
    return [{ code: "PROFILE_MISSING", message: `${template.id}: missing profile '${mode}'.`, path: mode }];
  }

  const profile = template.profiles[mode];
  const chequeW = template.widthMm;
  const chequeH = template.heightMm;
  const pageW = profile.pageWidth;
  const pageH = profile.pageHeight;

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
