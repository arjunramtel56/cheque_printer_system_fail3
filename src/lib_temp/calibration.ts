// ---------------------------------------------------------------------------
// Calibration — single source of truth for X/Y offset handling.
//
// Rules enforced here (and asserted in tests):
//   - X moves the output horizontally only; Y vertically only.
//   - Calibration NEVER changes the cheque's physical dimensions.
//   - Values are clamped to ±25 mm and rounded to the 0.1 mm UI step.
//   - Calibration is keyed per (template, print mode) — printer drift differs
//     between direct feed and carrier printing, and between cheque stocks.
//   - Template-provided defaults are the baseline; per-user overrides sit on top.
// ---------------------------------------------------------------------------

import type { BankTemplate, Calibration, ProfileKey } from "./types.ts";

export const CALIBRATION_MIN_MM = -25;
export const CALIBRATION_MAX_MM = 25;
export const CALIBRATION_STEP_MM = 0.1;

const CALIBRATION_STORAGE_KEY = "cheque-calibrations";

/**
 * Sanitize a raw calibration offset:
 * - non-number / NaN / Infinity / -Infinity  -> 0
 * - normalizes -0 to 0
 * - clamps to the ±25 mm safe range
 * - rounds to the 0.1 mm UI step
 */
export function clampCalibration(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  let v = Object.is(raw, -0) ? 0 : raw;
  v = Math.min(CALIBRATION_MAX_MM, Math.max(CALIBRATION_MIN_MM, v));
  return Math.round(v * 10) / 10;
}

/**
 * Validate a stored Calibration ({x,y}) pair. Returns an error message if the
 * pair is corrupt (e.g. tampered state), otherwise null.
 */
export function validateCalibrationPair(x: number, y: number): string | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return "Calibration values are invalid.";
  }
  if (x < CALIBRATION_MIN_MM || x > CALIBRATION_MAX_MM || y < CALIBRATION_MIN_MM || y > CALIBRATION_MAX_MM) {
    return "Calibration values must be between -25 and 25 mm.";
  }
  return null;
}

/** Normalize a pair through the clamp + axis rules. */
export function normalizeCalibration(cal: Partial<Calibration> | undefined): Calibration {
  return { x: clampCalibration(cal?.x ?? 0), y: clampCalibration(cal?.y ?? 0) };
}

// ---------------------------------------------------------------------------
// Per (template, mode) calibration
// ---------------------------------------------------------------------------

export type CalibrationMap = Record<string, Calibration>;

export function calibrationKey(templateId: string, mode: ProfileKey): string {
  return `${templateId}:${mode}`;
}

export function emptyCalibrationMap(): CalibrationMap {
  return {};
}

/** The template's own default calibration (from its print configuration). */
export function templateDefaultCalibration(template: BankTemplate): Calibration {
  return normalizeCalibration({
    x: template.print?.calibration?.defaultX ?? 0,
    y: template.print?.calibration?.defaultY ?? 0,
  });
}

/** Resolve the calibration to use: user override if present, else the template
 *  default. Always normalized. */
export function getCalibrationFor(
  map: CalibrationMap,
  templateId: string,
  mode: ProfileKey,
  fallback: Calibration = { x: 0, y: 0 },
): Calibration {
  const key = calibrationKey(templateId, mode);
  return normalizeCalibration(map[key] ?? fallback);
}

/** Immutably set the calibration for one (template, mode). */
export function setCalibrationFor(
  map: CalibrationMap,
  templateId: string,
  mode: ProfileKey,
  cal: Partial<Calibration>,
): CalibrationMap {
  return { ...map, [calibrationKey(templateId, mode)]: normalizeCalibration(cal) };
}

/** Immutably clear the override for one (template, mode). */
export function resetCalibrationFor(map: CalibrationMap, templateId: string, mode: ProfileKey): CalibrationMap {
  const next = { ...map };
  delete next[calibrationKey(templateId, mode)];
  return next;
}

/** True when the calibration is the neutral (0,0) value. */
export function isNeutralCalibration(cal: Calibration): boolean {
  return cal.x === 0 && cal.y === 0;
}

/** "X +0.2 mm · Y −0.1 mm" for display. */
export function formatCalibration(cal: Calibration): string {
  const sign = (v: number) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1));
  return `X ${sign(cal.x)} mm · Y ${sign(cal.y)} mm`;
}

// ---------------------------------------------------------------------------
// Persistence (per browser)
// ---------------------------------------------------------------------------

export function loadCalibrations(): CalibrationMap {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CalibrationMap;
    if (!parsed || typeof parsed !== "object") return {};
    const out: CalibrationMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      const cal = normalizeCalibration(value as Calibration);
      if (validateCalibrationPair(cal.x, cal.y) === null) out[key] = cal;
    }
    return out;
  } catch {
    return {};
  }
}

export function persistCalibrations(map: CalibrationMap): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore write errors
  }
}

export function clearCalibrations(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(CALIBRATION_STORAGE_KEY);
}
