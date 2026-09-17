import type { BankTemplate, ProfileKey, DEFAULT_SUPPORTED_MODES } from "./types.ts";
import { validateBankTemplate, validateNoDuplicateIds } from "./validation.ts";
import { STANDARD_CHEQUE_W_MM as STANDARD_WIDTH_MM, STANDARD_CHEQUE_H_MM as STANDARD_HEIGHT_MM } from "./printGeometry.ts";

function assertNoTemplateErrors(template: BankTemplate): void {
  const errs = validateBankTemplate(template);
  if (errs) {
    const detail = errs.map((e) => `${e.code}@${e.path}: ${e.message}`).join("; ");
    // Fail loudly at module load so a corrupt template can never reach the
    // print engine. This is the single validation point for templates.
    throw new Error(`Invalid bank template '${template.id}': ${detail}`);
  }
}

export const BANK_TEMPLATES: BankTemplate[] = [
  {
    id: "siddhartha",
    bankName: "Siddhartha Bank Limited",
    widthMm: STANDARD_WIDTH_MM,
    heightMm: STANDARD_HEIGHT_MM,
    fields: {
      date: { x: 128, y: 6, width: 52, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, render: "date-grid" },
      payee: { x: 12, y: 28, width: 90, fontSize: 10, minFontSize: 7 },
      words1: { x: 12, y: 44, width: 150, fontSize: 9, minFontSize: 6.5 },
      words2: { x: 12, y: 54, width: 150, fontSize: 9, minFontSize: 6.5 },
      amount: { x: 110, y: 66, width: 65, fontSize: 11, minFontSize: 8 },
      accountPayee: { x: 0, y: 16, width: STANDARD_WIDTH_MM, fontSize: 9, minFontSize: 7, align: "center" },
      memo: { x: 12, y: 76, width: 60, fontSize: 8, minFontSize: 6 },
    },
    structural: {
      payLabel: { x: 12, y: 24, width: 90, height: 5 },
      orBearer: { x: 100, y: 24, width: 40, height: 5 },
      sig1: { x: 12, y: 78, width: 55, height: 8 },
      sig2: { x: 72, y: 78, width: 55, height: 8 },
    },
    profiles: {
      custom_short: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      custom_long: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      a4_vertical: { x: 9.75, y: 20, pageWidth: 210, pageHeight: 297 },
      a4_horizontal: { x: 20, y: 50.75, pageWidth: 297, pageHeight: 210 },
    },
    print: {
      calibration: { defaultX: 0, defaultY: 0 },
      supportedModes: [...DEFAULT_SUPPORTED_MODES],
    },
    enabled: true,
  },
  {
    id: "nabil",
    bankName: "Nabil Bank Limited",
    widthMm: STANDARD_WIDTH_MM,
    heightMm: STANDARD_HEIGHT_MM,
    fields: {
      date: { x: 130, y: 5, width: 50, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, render: "date-grid" },
      payee: { x: 10, y: 26, width: 95, fontSize: 10, minFontSize: 7 },
      words1: { x: 10, y: 42, width: 148, fontSize: 9, minFontSize: 6.5 },
      words2: { x: 10, y: 52, width: 148, fontSize: 9, minFontSize: 6.5 },
      amount: { x: 108, y: 64, width: 70, fontSize: 11, minFontSize: 8 },
      accountPayee: { x: 0, y: 14, width: STANDARD_WIDTH_MM, fontSize: 9, minFontSize: 7, align: "center" },
      memo: { x: 10, y: 75, width: 55, fontSize: 8, minFontSize: 6 },
    },
    structural: {
      payLabel: { x: 10, y: 22, width: 95, height: 5 },
      orBearer: { x: 102, y: 22, width: 38, height: 5 },
      sig1: { x: 10, y: 77, width: 55, height: 8 },
      sig2: { x: 70, y: 77, width: 55, height: 8 },
    },
    profiles: {
      custom_short: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      custom_long: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      a4_vertical: { x: 9.75, y: 20, pageWidth: 210, pageHeight: 297 },
      a4_horizontal: { x: 20, y: 50.75, pageWidth: 297, pageHeight: 210 },
    },
    print: {
      calibration: { defaultX: 0, defaultY: 0 },
      supportedModes: [...DEFAULT_SUPPORTED_MODES],
    },
    enabled: true,
  },
  {
    id: "nicadc",
    bankName: "NIC Asia Bank Limited",
    widthMm: STANDARD_WIDTH_MM,
    heightMm: STANDARD_HEIGHT_MM,
    fields: {
      date: { x: 126, y: 7, width: 54, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, render: "date-grid" },
      payee: { x: 14, y: 30, width: 88, fontSize: 10, minFontSize: 7 },
      words1: { x: 14, y: 48, width: 145, fontSize: 9, minFontSize: 6.5 },
      words2: { x: 14, y: 58, width: 145, fontSize: 9, minFontSize: 6.5 },
      amount: { x: 112, y: 70, width: 68, fontSize: 11, minFontSize: 8 },
      accountPayee: { x: 0, y: 18, width: STANDARD_WIDTH_MM, fontSize: 9, minFontSize: 7, align: "center" },
      memo: { x: 14, y: 78, width: 50, fontSize: 8, minFontSize: 6 },
    },
    structural: {
      payLabel: { x: 14, y: 26, width: 88, height: 5 },
      orBearer: { x: 100, y: 26, width: 40, height: 5 },
      sig1: { x: 14, y: 80, width: 52, height: 8 },
      sig2: { x: 72, y: 80, width: 52, height: 8 },
    },
    profiles: {
      custom_short: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      custom_long: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      a4_vertical: { x: 9.75, y: 20, pageWidth: 210, pageHeight: 297 },
      a4_horizontal: { x: 20, y: 50.75, pageWidth: 297, pageHeight: 210 },
    },
    print: {
      calibration: { defaultX: 0, defaultY: 0 },
      supportedModes: [...DEFAULT_SUPPORTED_MODES],
    },
    enabled: true,
  },
  {
    id: "everest",
    bankName: "Everest Bank Limited",
    widthMm: STANDARD_WIDTH_MM,
    heightMm: STANDARD_HEIGHT_MM,
    fields: {
      date: { x: 132, y: 4, width: 48, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, render: "date-grid" },
      payee: { x: 8, y: 25, width: 92, fontSize: 10, minFontSize: 7 },
      words1: { x: 8, y: 40, width: 152, fontSize: 9, minFontSize: 6.5 },
      words2: { x: 8, y: 50, width: 152, fontSize: 9, minFontSize: 6.5 },
      amount: { x: 105, y: 62, width: 75, fontSize: 11, minFontSize: 8 },
      accountPayee: { x: 0, y: 12, width: STANDARD_WIDTH_MM, fontSize: 9, minFontSize: 7, align: "center" },
      memo: { x: 8, y: 74, width: 55, fontSize: 8, minFontSize: 6 },
    },
    structural: {
      payLabel: { x: 8, y: 21, width: 92, height: 5 },
      orBearer: { x: 100, y: 21, width: 40, height: 5 },
      sig1: { x: 8, y: 76, width: 55, height: 8 },
      sig2: { x: 68, y: 76, width: 55, height: 8 },
    },
    profiles: {
      custom_short: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      custom_long: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      a4_vertical: { x: 9.75, y: 20, pageWidth: 210, pageHeight: 297 },
      a4_horizontal: { x: 20, y: 50.75, pageWidth: 297, pageHeight: 210 },
    },
    print: {
      calibration: { defaultX: 0, defaultY: 0 },
      supportedModes: [...DEFAULT_SUPPORTED_MODES],
    },
    enabled: true,
  },
  {
    id: "bankpokhara",
    bankName: "Bank of Pokhara Limited",
    widthMm: STANDARD_WIDTH_MM,
    heightMm: STANDARD_HEIGHT_MM,
    fields: {
      date: { x: 125, y: 8, width: 55, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, render: "date-grid" },
      payee: { x: 10, y: 32, width: 90, fontSize: 10, minFontSize: 7 },
      words1: { x: 10, y: 50, width: 140, fontSize: 9, minFontSize: 6.5 },
      words2: { x: 10, y: 60, width: 140, fontSize: 9, minFontSize: 6.5 },
      amount: { x: 110, y: 72, width: 70, fontSize: 11, minFontSize: 8 },
      accountPayee: { x: 0, y: 20, width: STANDARD_WIDTH_MM, fontSize: 9, minFontSize: 7, align: "center" },
      memo: { x: 10, y: 78, width: 50, fontSize: 8, minFontSize: 6 },
    },
    structural: {
      payLabel: { x: 10, y: 28, width: 90, height: 5 },
      orBearer: { x: 100, y: 28, width: 40, height: 5 },
      sig1: { x: 10, y: 80, width: 52, height: 8 },
      sig2: { x: 70, y: 80, width: 52, height: 8 },
    },
    profiles: {
      custom_short: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      custom_long: { x: 0, y: 0, pageWidth: STANDARD_WIDTH_MM, pageHeight: STANDARD_HEIGHT_MM },
      a4_vertical: { x: 9.75, y: 20, pageWidth: 210, pageHeight: 297 },
      a4_horizontal: { x: 20, y: 50.75, pageWidth: 297, pageHeight: 210 },
    },
    print: {
      calibration: { defaultX: 0, defaultY: 0 },
      supportedModes: [...DEFAULT_SUPPORTED_MODES],
    },
    enabled: true,
  },
];

for (const t of BANK_TEMPLATES) assertNoTemplateErrors(t);

/** The original built-in templates, preserved as a constant baseline. */
export const BANK_TEMPLATES_BASE: BankTemplate[] = [...BANK_TEMPLATES];

/**
 * Runtime template store. Templates are loaded from the built-in BANK_TEMPLATES
 * constant at module init. Admin-created/edited templates are merged in
 * (in practice, persisted via localStorage and re-applied on load).
 *
 * The print engine and Workspace always read from getTemplate /
 * getAllActiveTemplates — never directly from the raw constant — so admin
 * changes are reflected without re-importing.
 */
let runtimeTemplates: BankTemplate[] = [...BANK_TEMPLATES];

function assertAllTemplatesValid(): void {
  for (const t of runtimeTemplates) assertNoTemplateErrors(t);
  const dupErrs = validateNoDuplicateIds(runtimeTemplates);
  if (dupErrs) {
    const detail = dupErrs.map((e) => `${e.code}@${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid template collection: ${detail}`);
  }
}

assertAllTemplatesValid();

/**
 * Validate and replace the runtime template list.
 * Each template is validated individually (must pass validateBankTemplate)
 * and the full collection is checked for duplicate IDs.
 *
 * On success, replaces the runtime template list.
 * On failure, throws — the runtime store is NOT mutated.
 */
export function setRuntimeTemplates(templates: BankTemplate[]): void {
  const snapshot = [...runtimeTemplates];
  try {
    for (const t of templates) assertNoTemplateErrors(t);
    const dupErrs = validateNoDuplicateIds(templates);
    if (dupErrs) {
      const detail = dupErrs.map((e) => `${e.code}@${e.path}: ${e.message}`).join("; ");
      throw new Error(`Invalid template collection: ${detail}`);
    }
    runtimeTemplates = [...templates];
    persistRuntimeTemplates();
  } catch (e) {
    runtimeTemplates = snapshot;
    throw e;
  }
}

/**
 * Add or update a single template in the runtime store.
 * The template is validated before it replaces any existing entry.
 * Also persists the updated collection to localStorage (browser only).
 */
export function upsertTemplate(template: BankTemplate): void {
  assertNoTemplateErrors(template);
  runtimeTemplates = runtimeTemplates.filter((t) => t.id !== template.id);
  runtimeTemplates.push(template);
  const dupErrs = validateNoDuplicateIds(runtimeTemplates);
  if (dupErrs) {
    runtimeTemplates = runtimeTemplates.filter((t) => t.id !== template.id);
    const detail = dupErrs.map((e) => `${e.code}@${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid template collection: ${detail}`);
  }
  assertAllTemplatesValid();
  persistRuntimeTemplates();
}

/**
 * Remove a template from the runtime store by ID.
 * Also persists the change to localStorage (browser only).
 */
export function removeTemplate(id: string): void {
  runtimeTemplates = runtimeTemplates.filter((t) => t.id !== id);
  persistRuntimeTemplates();
}

export function getTemplate(id: string): BankTemplate | undefined {
  return runtimeTemplates.find((t) => t.id === id);
}

export function getAllTemplates(): BankTemplate[] {
  return [...runtimeTemplates];
}

/**
 * Returns only templates that are `enabled` and have at least one
 * supported print mode. Used by the user-facing template selector so
 * disabled templates are never shown.
 */
export function getAllActiveTemplates(): BankTemplate[] {
  return runtimeTemplates.filter(
    (t) => t.enabled && Array.isArray(t.print?.supportedModes) && t.print.supportedModes.length > 0,
  );
}

/**
 * Reset the runtime store to the original built-in templates.
 * Used by admin when clearing local overrides.
 */
export function resetToBuiltinTemplates(): void {
  runtimeTemplates = [...BANK_TEMPLATES];
  persistRuntimeTemplates();
}

/**
 * Initialize the runtime template store from localStorage (if any admin
 * templates have been saved). This is a no-op on the server. The print
 * engine and Workspace call this on mount so admin edits are reflected
 * immediately without a page reload.
 *
 * Corrupt or invalid stored templates are silently discarded — the built-in
 * templates remain the safe baseline.
 */
export function initRuntimeTemplates(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem("cheque-admin-templates");
    if (!raw) return;
    const parsed = JSON.parse(raw) as BankTemplate[];
    for (const t of parsed) assertNoTemplateErrors(t);
    const dupErrs = validateNoDuplicateIds(parsed);
    if (dupErrs) return;
    runtimeTemplates = [...parsed];
  } catch {
    // Corrupt stored templates — ignore, keep built-ins
  }
}

/**
 * Persist the current runtime templates back to localStorage for admin changes.
 */
export function persistRuntimeTemplates(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem("cheque-admin-templates", JSON.stringify(runtimeTemplates));
  } catch {
    // ignore write errors
  }
}

/**
 * Persist a set of admin templates to localStorage AND update the runtime store.
 * Each template is validated; the collection is checked for duplicate IDs.
 * Throws on validation failure (does NOT persist).
 */
export function saveAdminTemplates(templates: BankTemplate[]): void {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("saveAdminTemplates requires a browser environment");
  }
  for (const t of templates) assertNoTemplateErrors(t);
  const dupErrs = validateNoDuplicateIds(templates);
  if (dupErrs) {
    const detail = dupErrs.map((e) => `${e.code}@${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid template collection: ${detail}`);
  }
  window.localStorage.setItem("cheque-admin-templates", JSON.stringify(templates));
  runtimeTemplates = [...templates];
}

/**
 * Load admin templates from localStorage. Returns the built-in templates
 * if no admin templates are stored (fresh state).
 */
export function loadAdminTemplates(): BankTemplate[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return BANK_TEMPLATES_BASE;
  }
  try {
    const raw = window.localStorage.getItem("cheque-admin-templates");
    if (!raw) return BANK_TEMPLATES_BASE;
    const parsed = JSON.parse(raw) as BankTemplate[];
    for (const t of parsed) assertNoTemplateErrors(t);
    const dupErrs = validateNoDuplicateIds(parsed);
    if (dupErrs) return BANK_TEMPLATES_BASE;
    runtimeTemplates = [...parsed];
    return parsed;
  } catch {
    return BANK_TEMPLATES_BASE;
  }
}

/**
 * Clear all admin templates from localStorage, restoring built-in defaults.
 */
export function clearAdminTemplates(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem("cheque-admin-templates");
  runtimeTemplates = [...BANK_TEMPLATES];
}
