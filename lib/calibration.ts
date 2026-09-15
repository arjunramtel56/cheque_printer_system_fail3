// ---------------------------------------------------------------------------
// Calibration value guards — single source of truth for X/Y offset sanitizing.
// Used by the UI setters AND by print-time validation so that no invalid
// value (NaN, Infinity, out-of-range, -0) can reach the print engine.
// ---------------------------------------------------------------------------

export const CALIBRATION_MIN_MM = -25;
export const CALIBRATION_MAX_MM = 25;
export const CALIBRATION_STEP_MM = 0.1;

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
