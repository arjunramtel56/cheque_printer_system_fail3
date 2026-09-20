// ---------------------------------------------------------------------------
// Cheque template store.
//
// Built-in templates come from data/templates.ts (pure data). Admin-created or
// edited templates are merged in at runtime and persisted per browser. The
// print engine, the renderer and the workspace always read through
// getTemplate / getAllActiveTemplates — never from the raw constant — so admin
// changes are reflected without re-importing.
//
// Validation is fail-loud: a corrupt template can never reach the print engine.
// ---------------------------------------------------------------------------

import type { BankTemplate } from "./types.ts";
import { TEMPLATE_SEEDS } from "../data/templates.ts";
import { validateBankTemplate, validateNoDuplicateIds } from "./validation.ts";
import CryptoJS from "crypto-js";

/** HMAC signing key for admin template persistence. Detects client-side
 *  tampering with persisted templates in localStorage. */
const TEMPLATE_SIGNATURE_KEY = "cheque-template-sig-v1";

export function signTemplates(templates: BankTemplate[]): string {
  return CryptoJS.HmacSHA256(JSON.stringify(templates), TEMPLATE_SIGNATURE_KEY).toString();
}

export function verifyTemplatesSignature(templates: BankTemplate[], sig: string | undefined): boolean {
  if (!sig || typeof sig !== "string") return false;
  const expected = signTemplates(templates);
  return sig === expected;
}

function assertNoTemplateErrors(template: BankTemplate): void {
  const errs = validateBankTemplate(template);
  if (errs) {
    const detail = errs.map((e) => `${e.code}@${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid bank template '${template.id}': ${detail}`);
  }
}

/** The built-in cheque templates (pure data seeds). */
export const BANK_TEMPLATES: BankTemplate[] = TEMPLATE_SEEDS.map((t) => structuredClone(t));

for (const t of BANK_TEMPLATES) assertNoTemplateErrors(t);

/** The original built-in templates, preserved as a constant baseline. */
export const BANK_TEMPLATES_BASE: BankTemplate[] = [...BANK_TEMPLATES];

let runtimeTemplates: BankTemplate[] = [...BANK_TEMPLATES];

function assertAllTemplatesValid(templates: BankTemplate[] = runtimeTemplates): void {
  for (const t of templates) assertNoTemplateErrors(t);
  const dupErrs = validateNoDuplicateIds(templates);
  if (dupErrs) {
    const detail = dupErrs.map((e) => `${e.code}@${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid template collection: ${detail}`);
  }
}

assertAllTemplatesValid();

/**
 * Validate and replace the runtime template list.
 * On failure the runtime store is NOT mutated.
 */
export function setRuntimeTemplates(templates: BankTemplate[]): void {
  const snapshot = [...runtimeTemplates];
  try {
    assertAllTemplatesValid(templates);
    runtimeTemplates = [...templates];
    persistRuntimeTemplates();
  } catch (e) {
    runtimeTemplates = snapshot;
    throw e;
  }
}

/** Add or update a single template, validating before it replaces anything. */
export function upsertTemplate(template: BankTemplate): void {
  assertNoTemplateErrors(template);
  const snapshot = [...runtimeTemplates];
  const next = runtimeTemplates.filter((t) => t.id !== template.id);
  next.push(template);
  try {
    assertAllTemplatesValid(next);
  } catch (e) {
    runtimeTemplates = snapshot;
    throw e;
  }
  runtimeTemplates = next;
  persistRuntimeTemplates();
}

/** Remove a template by id. */
export function removeTemplate(id: string): void {
  runtimeTemplates = runtimeTemplates.filter((t) => t.id !== id);
  persistRuntimeTemplates();
}

export function getTemplate(id: string): BankTemplate | undefined {
  return runtimeTemplates.find((t) => t.id === id);
}

/** Resolve a template that belongs to a specific bank (deep-link safety: a
 *  template is never served under another bank's URL). */
export function getTemplateForBank(bankId: string, templateId: string): BankTemplate | undefined {
  const template = getTemplate(templateId);
  if (!template || template.bankId !== bankId) return undefined;
  return template;
}

export function getTemplatesForBankId(bankId: string): BankTemplate[] {
  return runtimeTemplates.filter((t) => t.bankId === bankId);
}

export function getAllTemplates(): BankTemplate[] {
  return [...runtimeTemplates];
}

/** Templates that are `enabled` and have at least one supported print mode. */
export function getAllActiveTemplates(): BankTemplate[] {
  return runtimeTemplates.filter(
    (t) => t.enabled && Array.isArray(t.print?.supportedModes) && t.print.supportedModes.length > 0,
  );
}

/** Reset the runtime store to the original built-in templates. */
export function resetToBuiltinTemplates(): void {
  runtimeTemplates = BANK_TEMPLATES.map((t) => structuredClone(t));
  persistRuntimeTemplates();
}

/**
 * Initialize the runtime template store from localStorage (no-op on the server).
 * Corrupt or invalid stored templates are discarded — the built-ins remain the
 * safe baseline. Templates referencing an unknown cheque size are rejected too,
 * so a stale cached template can never print at the wrong physical size.
 */
export function initRuntimeTemplates(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem("cheque-admin-templates");
    if (!raw) return;
    const parsed = JSON.parse(raw) as { templates?: BankTemplate[]; sig?: string };
    if (!parsed || !Array.isArray(parsed.templates)) return;
    if (!verifyTemplatesSignature(parsed.templates, parsed.sig)) {
      console.warn("Template signature mismatch — possible tampering detected. Ignoring persisted templates.");
      return;
    }
    assertAllTemplatesValid(parsed.templates);
    runtimeTemplates = [...parsed.templates];
  } catch {
    // Corrupt stored templates — ignore, keep built-ins
  }
}

export function persistRuntimeTemplates(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const sig = signTemplates(runtimeTemplates);
    window.localStorage.setItem(
      "cheque-admin-templates",
      JSON.stringify({ templates: runtimeTemplates, sig }),
    );
  } catch {
    // ignore write errors
  }
}

/** Persist a set of admin templates AND update the runtime store atomically. */
export function saveAdminTemplates(templates: BankTemplate[]): void {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("saveAdminTemplates requires a browser environment");
  }
  assertAllTemplatesValid(templates);
  const sig = signTemplates(templates);
  window.localStorage.setItem(
    "cheque-admin-templates",
    JSON.stringify({ templates, sig }),
  );
  runtimeTemplates = [...templates];
}

/** Load admin templates from localStorage (built-ins when nothing is stored). */
export function loadAdminTemplates(): BankTemplate[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return BANK_TEMPLATES_BASE;
  }
     try {
     const raw = window.localStorage.getItem("cheque-admin-templates");
     if (!raw) return BANK_TEMPLATES_BASE;
     const parsed = JSON.parse(raw) as { templates?: BankTemplate[]; sig?: string };
     if (!parsed || !Array.isArray(parsed.templates)) return BANK_TEMPLATES_BASE;
     if (!verifyTemplatesSignature(parsed.templates, parsed.sig)) {
       console.warn("Template signature mismatch — possible tampering detected. Falling back to built-ins.");
       return BANK_TEMPLATES_BASE;
     }
     assertAllTemplatesValid(parsed.templates);
     runtimeTemplates = [...parsed.templates];
     return parsed.templates;
   } catch {
     return BANK_TEMPLATES_BASE;
   }
 }

/** Clear all admin templates, restoring built-in defaults. */
export function clearAdminTemplates(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem("cheque-admin-templates");
  runtimeTemplates = [...BANK_TEMPLATES];
}

/** JSON export of the live catalogue templates (used by the admin workbench). */
export function exportTemplatesJson(): string {
  return JSON.stringify({ version: 1, templates: getAllTemplates() }, null, 2);
}
