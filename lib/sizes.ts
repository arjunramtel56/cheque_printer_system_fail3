// ---------------------------------------------------------------------------
// Central millimetre size management.
//
// EVERY physical dimension in the application originates here. Templates
// reference a cheque size by id; print modes resolve their carrier paper from
// the paper registry. Nothing else in the codebase declares a physical
// millimetre constant (the compatibility aliases in lib/printGeometry.ts all
// re-export values from this module).
//
// The cheque's physical size is independent from the carrier paper size:
//
//   ChequeSize  190.5 × 88.9 mm  (A/C PAYEE etc. lives inside this box)
//   PaperSize   210  × 297 mm    (A4 carrier the cheque is placed onto)
//
// Screen preview may scale in pixels, but the physical print size always
// originates from these millimetre values.
// ---------------------------------------------------------------------------

import type { ChequeSize, Orientation, PaperSize } from "./types.ts";

const SIZES_STORAGE_KEY = "cheque-admin-sizes";

/**
 * Built-in cheque stock. Nepal's standard personal/business cheque is
 * 190.5 × 88.9 mm (7.5in × 3.5in) landscape, which is what every seeded
 * template uses. Additional sizes are added by admins through the registry —
 * never invented here.
 */
export const CHEQUE_SIZES: ChequeSize[] = [
  {
    id: "standard-190x89",
    label: "Standard Nepalese cheque (190.5 × 88.9 mm)",
    widthMm: 190.5,
    heightMm: 88.9,
    builtin: true,
  },
];

export const PAPER_SIZES: PaperSize[] = [
  { id: "a4-portrait", label: "A4 portrait", widthMm: 210, heightMm: 297, orientation: "portrait" },
  { id: "a4-landscape", label: "A4 landscape", widthMm: 297, heightMm: 210, orientation: "landscape" },
];

/** True when a dimension pair is a usable physical size. */
export function isValidSizeValue(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/** The orientation implied by a width/height pair (the truthful one). A square
 *  cheque is treated as landscape — the declared orientation must match. */
export function orientationFor(widthMm: number, heightMm: number): Orientation {
  return widthMm >= heightMm ? "landscape" : "portrait";
}

/**
 * Does the declared orientation agree with the physical dimensions?
 * This is what stops a template from claiming "portrait" while carrying
 * landscape geometry (which would silently rotate a physical cheque).
 */
export function orientationMatchesSize(
  widthMm: number,
  heightMm: number,
  orientation: Orientation,
): boolean {
  if (!isValidSizeValue(widthMm) || !isValidSizeValue(heightMm)) return false;
  return orientationFor(widthMm, heightMm) === orientation;
}

/** Validate a cheque size definition. Returns an error message or null. */
export function validateSize(size: ChequeSize): string | null {
  if (!size || typeof size.id !== "string" || size.id.trim() === "") return "Size id is required.";
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(size.id)) {
    return `Size id "${size.id}" must be lowercase alphanumeric with hyphens or underscores.`;
  }
  if (!isValidSizeValue(size.widthMm) || !isValidSizeValue(size.heightMm)) {
    return `Size "${size.id}" must have positive finite width and height.`;
  }
  return null;
}

/** Build a custom cheque size (used by the admin size registry). */
export function createCustomChequeSize(id: string, label: string, widthMm: number, heightMm: number): ChequeSize {
  return { id, label, widthMm, heightMm, builtin: false };
}

// ---------------------------------------------------------------------------
// Runtime cheque-size registry (admin-added sizes)
// ---------------------------------------------------------------------------

let runtimeChequeSizes: ChequeSize[] = [...CHEQUE_SIZES];

export function getChequeSizes(): ChequeSize[] {
  return [...runtimeChequeSizes];
}

export function getChequeSize(id: string): ChequeSize | undefined {
  return runtimeChequeSizes.find((s) => s.id === id);
}

export function getPaperSizes(): PaperSize[] {
  return [...PAPER_SIZES];
}

export function getPaperSize(id: string): PaperSize | undefined {
  return PAPER_SIZES.find((p) => p.id === id);
}

/**
 * Add or replace a cheque size. Throws (and leaves the registry untouched) when
 * the definition is invalid — mirroring the fail-loud contract used for
 * templates.
 */
export function upsertChequeSize(size: ChequeSize): void {
  const err = validateSize(size);
  if (err) throw new Error(`Invalid cheque size: ${err}`);
  const next = runtimeChequeSizes.filter((s) => s.id !== size.id);
  next.push({ ...size, builtin: size.builtin ?? false });
  runtimeChequeSizes = next.sort((a, b) => a.id.localeCompare(b.id));
  persistChequeSizes();
}

/** Remove a custom size. Built-in sizes cannot be removed. */
export function removeChequeSize(id: string): void {
  const existing = getChequeSize(id);
  if (!existing || existing.builtin) return;
  runtimeChequeSizes = runtimeChequeSizes.filter((s) => s.id !== id);
  persistChequeSizes();
}

/** Restore the built-in size registry. */
export function resetChequeSizes(): void {
  runtimeChequeSizes = [...CHEQUE_SIZES];
  persistChequeSizes();
}

/** Load admin-added sizes from localStorage (no-op on the server). */
export function initChequeSizes(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(SIZES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as ChequeSize[];
    if (!Array.isArray(parsed)) return;
    const valid: ChequeSize[] = [];
    for (const size of parsed) {
      if (validateSize(size) === null && !size.builtin) valid.push(size);
    }
    const builtinIds = new Set(CHEQUE_SIZES.map((s) => s.id));
    runtimeChequeSizes = [...CHEQUE_SIZES, ...valid.filter((s) => !builtinIds.has(s.id))].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
  } catch {
    // Corrupt stored sizes — keep the built-ins
  }
}

/** Persist admin-added sizes (no-op on the server). */
export function persistChequeSizes(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(SIZES_STORAGE_KEY, JSON.stringify(runtimeChequeSizes.filter((s) => !s.builtin)));
  } catch {
    // ignore write errors
  }
}

/** Clear admin-added sizes and return to the built-in registry. */
export function clearAdminChequeSizes(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(SIZES_STORAGE_KEY);
  runtimeChequeSizes = [...CHEQUE_SIZES];
}

/** "190.5 × 88.9 mm" — one formatting rule for the whole UI. */
export function formatSize(widthMm: number, heightMm: number): string {
  return `${widthMm} × ${heightMm} mm`;
}
