// ---------------------------------------------------------------------------
// Catalogue: the single place where banks and cheque templates are joined.
//
//   Bank (institution)  ──1:N──▶  ChequeTemplate (printable layout)
//
// Template -> bank is authoritative (`template.bankId`); bank.templateIds is
// DERIVED here, so a bank can never advertise a template that does not exist.
// ---------------------------------------------------------------------------

import type { Bank, BankTemplate, NrbClass } from "./types.ts";
import { BANK_GROUPS, BANK_LIST } from "../data/banks.ts";
import { getAllActiveTemplates, getAllTemplates } from "./templates.ts";
import { validateBank, validateCatalogue } from "./validation.ts";
import CryptoJS from "crypto-js";

/** HMAC signing key for admin bank persistence. Detects client-side
 *  tampering with persisted banks in localStorage. */
const BANK_SIGNATURE_KEY = "cheque-bank-sig-v1";

export function signBanks(banks: Bank[]): string {
  return CryptoJS.HmacSHA256(JSON.stringify(banks), BANK_SIGNATURE_KEY).toString();
}

export function verifyBanksSignature(banks: Bank[], sig: string): boolean {
  if (!sig || typeof sig !== "string") return false;
  const expected = signBanks(banks);
  return sig === expected;
}

const BANKS_STORAGE_KEY = "cheque-admin-banks";

let runtimeBanks: Bank[] = [...BANK_LIST];

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

/** Banks with `templateIds` recomputed from the live template store. */
export function getBanks(): Bank[] {
  const templates = getAllTemplates();
  return runtimeBanks.map((bank) => ({
    ...bank,
    templateIds: templates.filter((t) => t.bankId === bank.id).map((t) => t.id).sort(),
  }));
}

export function getBank(id: string): Bank | undefined {
  return getBanks().find((b) => b.id === id);
}

export function isBankEnabled(id: string): boolean {
  const bank = runtimeBanks.find((b) => b.id === id);
  return !!bank && bank.enabled !== false;
}

export function getTemplatesForBank(bankId: string): BankTemplate[] {
  return getAllTemplates().filter((t) => t.bankId === bankId);
}

/** Templates that are actually usable: enabled template on an enabled bank. */
export function getActiveTemplatesForBank(bankId: string): BankTemplate[] {
  if (!isBankEnabled(bankId)) return [];
  return getAllActiveTemplates().filter((t) => t.bankId === bankId);
}

/** Banks that can be offered in the print workflow (enabled + at least one
 *  usable template). A bank with no template is shown separately as
 *  "template pending" rather than pretending a layout exists. */
export function getSelectableBanks(): Bank[] {
  return getBanks().filter((b) => b.enabled && getActiveTemplatesForBank(b.id).length > 0);
}

/** Banks with no usable template yet — listed so users can see coverage. */
export function getPendingBanks(): Bank[] {
  return getBanks().filter((b) => b.enabled && getActiveTemplatesForBank(b.id).length === 0);
}

export function getBankForTemplate(templateId: string): Bank | undefined {
  const template = getAllTemplates().find((t) => t.id === templateId);
  if (!template) return undefined;
  return getBank(template.bankId);
}

export interface BankGroup {
  nrbClass: NrbClass;
  label: string;
  note: string;
  banks: Bank[];
}

/** Catalogue grouped by NRB class, for the landing page and admin list. */
export function getBankGroups(): BankGroup[] {
  const banks = getBanks();
  return BANK_GROUPS.map((group) => ({
    ...group,
    banks: banks
      .filter((b) => b.nrbClass === group.nrbClass)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export function formatBankLabel(bank: Bank): string {
  if (bank.status === "merged" && bank.supersededBy) {
    const target = runtimeBanks.find((b) => b.id === bank.supersededBy);
    return `${bank.name} — merged into ${target ? target.name : bank.supersededBy}`;
  }
  if (bank.status === "defunct") return `${bank.name} — no longer operating`;
  if (bank.status === "inactive") return `${bank.name} — inactive licence`;
  return bank.name;
}

export interface CatalogueSummary {
  bankCount: number;
  banksWithTemplates: number;
  banksPending: number;
  templateCount: number;
  activeTemplateCount: number;
  physicallyCalibratedCount: number;
  browserVerifiedCount: number;
}

export function getCatalogueSummary(): CatalogueSummary {
  const banks = getBanks();
  const templates = getAllTemplates();
  return {
    bankCount: banks.length,
    banksWithTemplates: banks.filter((b) => b.templateIds.length > 0).length,
    banksPending: banks.filter((b) => b.templateIds.length === 0).length,
    templateCount: templates.length,
    activeTemplateCount: getAllActiveTemplates().length,
    physicallyCalibratedCount: templates.filter((t) => t.verification?.status === "physically-calibrated").length,
    browserVerifiedCount: templates.filter((t) => t.verification?.status === "browser-verified").length,
  };
}

/** Selectable options for the bank dropdown: banks with templates first, then
 *  banks that are known but still awaiting a template. */
export function getBankOptions(): { value: string; label: string; hasTemplate: boolean }[] {
  const withTemplates = getSelectableBanks().map((b) => ({
    value: b.id,
    label: formatBankLabel(b),
    hasTemplate: true,
  }));
  const pending = getPendingBanks().map((b) => ({
    value: b.id,
    label: `${formatBankLabel(b)} (template pending)`,
    hasTemplate: false,
  }));
  return [...withTemplates.sort((a, b) => a.label.localeCompare(b.label)), ...pending.sort((a, b) => a.label.localeCompare(b.label))];
}

// ---------------------------------------------------------------------------
// Runtime bank store (admin edits, persisted per browser)
// ---------------------------------------------------------------------------

function assertBuiltinsValid(): void {
  const errs = validateCatalogue(BANK_LIST, getAllTemplates());
  if (errs) {
    const detail = errs.map((e) => `${e.code}@${e.path}: ${e.message}`).join("; ");
    // Fail loudly at module load: a broken catalogue must never reach the UI.
    throw new Error(`Invalid built-in catalogue: ${detail}`);
  }
}

assertBuiltinsValid();

export function loadAdminBanks(): Bank[] {
  if (typeof window === "undefined" || !window.localStorage) return [...BANK_LIST];
  try {
    const raw = window.localStorage.getItem(BANKS_STORAGE_KEY);
    if (!raw) return [...BANK_LIST];
    const parsed = JSON.parse(raw) as Bank[];
    if (!Array.isArray(parsed)) return [...BANK_LIST];
    const errors = parsed.map(validateBank).filter((e): e is NonNullable<typeof e> => e !== null);
    if (errors.length > 0) return [...BANK_LIST];
    runtimeBanks = parsed;
    return parsed;
  } catch {
    return [...BANK_LIST];
  }
}

export function saveAdminBanks(banks: Bank[]): void {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("saveAdminBanks requires a browser environment");
  }
  for (const bank of banks) {
    const err = validateBank(bank);
    if (err) throw new Error(err.message);
  }
  window.localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(banks));
  runtimeBanks = [...banks];
}

/** Add or update a single bank. Throws on invalid input without mutating. */
export function upsertBank(bank: Bank): void {
  const err = validateBank(bank);
  if (err) throw new Error(err.message);
  const next = runtimeBanks.filter((b) => b.id !== bank.id);
  next.push(bank);
  const errs = validateCatalogue(next, getAllTemplates());
  if (errs) throw new Error(errs.map((e) => e.message).join("; "));
  runtimeBanks = next.sort((a, b) => a.name.localeCompare(b.name));
  persistBanks();
}

/** Enable or disable a bank. Disabled banks vanish from the user workflow but
 *  remain in the catalogue. */
export function setBankEnabled(id: string, enabled: boolean): void {
  const bank = runtimeBanks.find((b) => b.id === id);
  if (!bank) return;
  runtimeBanks = runtimeBanks.map((b) => (b.id === id ? { ...b, enabled } : b));
  persistBanks();
}

/** Stamp an entry as verified against an NRB source. */
export function markBankVerified(id: string, verifiedAt: string): void {
  runtimeBanks = runtimeBanks.map((b) => (b.id === id ? { ...b, verifiedAt } : b));
  persistBanks();
}

/** Remove a bank. Refuses while any template still belongs to it. */
export function removeBank(id: string): void {
  if (getTemplatesForBank(id).length > 0) {
    throw new Error(`Cannot remove bank "${id}" while it still has cheque templates.`);
  }
  runtimeBanks = runtimeBanks.filter((b) => b.id !== id);
  persistBanks();
}

export function resetBanks(): void {
  runtimeBanks = [...BANK_LIST];
  persistBanks();
}

export function clearAdminBanks(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(BANKS_STORAGE_KEY);
  runtimeBanks = [...BANK_LIST];
}

export function initBankCatalogue(): void {
  loadAdminBanks();
}

export function persistBanks(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(runtimeBanks));
  } catch {
    // ignore write errors
  }
}

/** Replace the whole catalogue from an imported JSON payload. */
export function importCatalogue(payload: { banks?: Bank[] }, templates?: BankTemplate[]): void {
  if (payload.banks) {
    for (const bank of payload.banks) {
      const err = validateBank(bank);
      if (err) throw new Error(err.message);
    }
  }
  const nextBanks = payload.banks ?? runtimeBanks;
  const errs = validateCatalogue(nextBanks, templates ?? getAllTemplates());
  if (errs) throw new Error(errs.map((e) => e.message).join("; "));
  if (payload.banks) {
    runtimeBanks = [...payload.banks];
    persistBanks();
  }
}
