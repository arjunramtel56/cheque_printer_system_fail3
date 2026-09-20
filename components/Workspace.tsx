"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { getAllActiveTemplates, getTemplate, initRuntimeTemplates } from "@/lib/templates";
import {
  formatBankLabel,
  getActiveTemplatesForBank,
  getBank,
  getBankOptions,
  initBankCatalogue,
} from "@/lib/catalogue";
import { getPaperSize, initChequeSizes } from "@/lib/sizes";
import type { BankTemplate, ProfileKey, Calibration } from "@/lib/types";
import { isDirectFeed, paperIdForMode } from "@/lib/types";
import {
  checkAmountWordsConsistency,
  checkAmountWordsConsistencyLocalized,
  formatAmountDisplay,
  amountToWordsFromPaisa,
  amountToWordsFromPaisaLocalized,
  isValidDate,
  validateAmount,
  validateChequeDate,
  validatePayee,
} from "@/lib/amountWords";
import {
  CALIBRATION_MAX_MM,
  CALIBRATION_MIN_MM,
  CALIBRATION_STEP_MM,
  clampCalibration,
  formatCalibration,
  getCalibrationFor,
  isNeutralCalibration,
  loadCalibrations,
  persistCalibrations,
  resetCalibrationFor,
  setCalibrationFor,
  templateDefaultCalibration,
  validateCalibrationPair,
  type CalibrationMap,
} from "@/lib/calibration";
import { resolvePaper, resolvePrintGeometry, STANDARD_CHEQUE_W_MM, STANDARD_CHEQUE_H_MM } from "@/lib/printGeometry";
import { validateCalibratedBounds, validatePrintGeometry, validateSafeZoneClearance, validateTemplateForPrint } from "@/lib/validation";
import { computeSheetLayout, fieldsWithinCheque, type ChequeData } from "@/lib/sheetLayout";
import ChequeSheet, { PREVIEW_SCALE } from "@/components/ChequeSheet";
import { generateOverlayPdf } from "@/components/ChequeOverlayPDF";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

// Mode presentation labels. The paper box and orientation are DERIVED from the
// paper registry at runtime (paperIdForMode -> getPaperSize) rather than typed
// here — this map must never become a second place that declares an orientation.
const PRINT_MODE_PRESENTATION: Record<ProfileKey, { mode: string; paperId: ProfileKey | "cheque" }> = {
  custom_short: { mode: "Custom Cheque Size", paperId: "cheque" },
  custom_long: { mode: "Custom Cheque Size", paperId: "cheque" },
  a4_vertical: { mode: "A4 Carrier", paperId: "a4_vertical" },
  a4_horizontal: { mode: "A4 Carrier", paperId: "a4_horizontal" },
};

/** Screen-facing description of a print mode: which paper, which orientation.
 *  Both facts come from the registry, capitalised for display only. */
export function printModeInfo(mode: ProfileKey, chequeSizeId: string): { mode: string; paper: string; orientation: string } {
  const presentation = PRINT_MODE_PRESENTATION[mode];
  const paperId = paperIdForMode(mode, chequeSizeId);
  const paper = presentation.paperId === "cheque" ? null : getPaperSize(paperId);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    mode: presentation.mode,
    paper:
      presentation.paperId === "cheque"
        ? "Custom Cheque"
        : paper
          ? `A4 (${paper.widthMm} × ${paper.heightMm} mm)`
          : "A4",
    orientation: cap(paper ? paper.orientation : "landscape"),
  };
}

const PROFILE_LABELS: Record<ProfileKey, string> = {
  custom_short: "Direct Feed · Short Edge First",
  custom_long: "Direct Feed · Long Edge First",
  a4_vertical: "A4 Carrier · Portrait",
  a4_horizontal: "A4 Carrier · Landscape",
};

/** Localized profile labels used inside select options. Falls back to the
 *  English label if the locale lacks a translation. */
function localizedProfileLabel(mode: ProfileKey, locale: "en" | "ne"): string {
  const key = `profileLabel_${mode}`;
  // The t() hook can't be used here (this is a top-level function, not a component).
  // We'll inline the localized labels since they're stable strings.
  if (locale === "ne") {
    switch (mode) {
      case "custom_short": return "डाइरेक्ट फिड · अल्प किनारा अगाडि";
      case "custom_long": return "डाइरेक्ट फिड · लामो किनारा अगाडि";
      case "a4_vertical": return "A4 क्यारियर · स्वरूप";
      case "a4_horizontal": return "A4 क्यारियर · भुवमर्द्ध";
      default: return PROFILE_LABELS[mode];
    }
  }
  return PROFILE_LABELS[mode];
}

/** Kept as an alias of the shared screen scale so older readers still resolve. */
const SCALE = PREVIEW_SCALE;

// Explicit workflow states — a single, unambiguous indicator of where the
// user is in the print pipeline. The UI renders a state badge and the print
// button surfaces the concrete reason it is blocked.
type FormState =
  | "empty"
  | "template-selected"
  | "data-entering"
  | "ready-preview"
  | "ready-print"
  | "printing"
  | "done";

interface PrintReadiness {
  ready: boolean;
  reason: string | null;
}

/**
 * Sanitize an error for display: strip stack traces, internal exception messages,
 * and implementation details. Only professional, user-facing messages are surfaced.
 */
function sanitizeError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred. Please try again.";
}

function safeFormatDate(date: string): string {
  if (!date) return "";
  try {
    if (!isValidDate(date)) return "";
    return date;
  } catch {
    return "";
  }
}

/** Validate a mode set from a template, defaulting to the built-in order. */
function supportedModesOf(template: BankTemplate | null): ProfileKey[] {
  const modes = template?.print?.supportedModes ?? [];
  const order: ProfileKey[] = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];
  const filtered = order.filter((m) => modes.includes(m));
  return filtered.length > 0 ? filtered : ["custom_short"];
}

// ---------------------------------------------------------------------------
// Calibration controls
// ---------------------------------------------------------------------------

interface CalibrationControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function CalibrationControl({ label, value, onChange, disabled }: CalibrationControlProps) {
  const step = CALIBRATION_STEP_MM;
  const increase = () => onChange(clampCalibration(value + step));
  const decrease = () => onChange(clampCalibration(value - step));
  const reset = () => onChange(0);

  // Strictly parse the input: only accept strings that are valid numbers
  // (optionally signed with a decimal point, but NOT "30mm" → 30). Invalid
  // strings are rejected and the value stays unchanged.
  function parseCalibrationInput(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    if (!/^[-+]?\d*\.?\d*$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <b style={{ minWidth: 18, textAlign: "center", color: "var(--text-secondary)" }}>{label}</b>
      <button
        type="button"
        className="button small secondary"
        disabled={disabled}
        onClick={decrease}
        title={`Decrease ${label} by ${step} mm`}
        style={{ padding: "6px 8px", minWidth: 32, justifyContent: "center" }}
      >
        −
      </button>
      <div className="input-prefix" style={{ flex: 1 }}>
        <input
          type="number"
          step={step}
          min={CALIBRATION_MIN_MM}
          max={CALIBRATION_MAX_MM}
          value={value}
          onChange={(e) => {
            const parsed = parseCalibrationInput(e.target.value);
            if (parsed !== null) onChange(clampCalibration(parsed));
          }}
          disabled={disabled}
          style={{ borderRadius: "0 var(--radius-control) var(--radius-control) 0 !important", textAlign: "center", fontVariantNumeric: "tabular-nums" }}
        />
      </div>
      <button
        type="button"
        className="button small secondary"
        disabled={disabled}
        onClick={increase}
        title={`Increase ${label} by ${step} mm`}
        style={{ padding: "6px 8px", minWidth: 32, justifyContent: "center" }}
      >
        +
      </button>
      <button
        type="button"
        className="text-button"
        disabled={disabled || value === 0}
        onClick={reset}
        title={`Reset ${label} to 0`}
        style={{ fontSize: "0.8rem", padding: "4px 6px" }}
      >
        Reset
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template selector
// ---------------------------------------------------------------------------

function BankSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const options = useMemo(() => getBankOptions(), []);
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor="bank-select">{t("selectBank")}</label>
      <select id="bank-select" required value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">— {t("selectBank")} —</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={!option.hasTemplate}>
            {option.label}
          </option>
        ))}
      </select>
      <small>{t("bankTemplateNote")}</small>
    </div>
  );
}

function BankTemplateSelector({
  templates,
  selectedId,
  onChange,
  disabled,
}: {
  templates: BankTemplate[];
  selectedId: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor="template-select">{t("selectBank")}</label>
      <select id="template-select" required value={selectedId} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">— {t("selectBankTemplate")} —</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <small>{t("pickTemplateHelp")}</small>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prep checklist — shows what is verified before the print dialog opens. The
// real gate is the sequential validation inside handlePrint.
// ---------------------------------------------------------------------------

interface PrepChecklistProps {
  template: BankTemplate | null;
  date: string;
  payee: string;
  amount: string;
  amountWords: string;
  printMode: ProfileKey;
  calibration: Calibration;
  isDF: boolean;
  safeZonesClear: boolean;
}

function PrepChecklist({
  template,
  date,
  payee,
  amount,
  amountWords,
  printMode,
  calibration,
  isDF,
  safeZonesClear,
}: PrepChecklistProps) {
  const { t } = useTranslation();
  const payeeCheck = validatePayee(payee);
  const amountCheck = validateAmount(amount);
  const consistency =
    amountCheck.valid && amountWords.trim() !== ""
      ? checkAmountWordsConsistency(amount, amountWords)
      : { consistent: false, expected: "" };
  const dateCheck = date ? validateChequeDate(date) : { valid: false, error: t("dateRequiredError") };
  const calOk = validateCalibrationPair(calibration.x, calibration.y) === null;
  const geometryOk = template ? validatePrintGeometry(resolvePrintGeometry(template, printMode), template, printMode) === null : false;

  const items: { label: string; ok: boolean }[] = [
    { label: t("checklistBankTemplate"), ok: !!template && validateTemplateForPrint(template) === null },
    { label: t("checklistDate"), ok: dateCheck.valid },
    { label: t("checklistPayee"), ok: payeeCheck.valid },
    { label: t("checklistAmount"), ok: amountCheck.valid && amountCheck.paisa > 0 },
    { label: t("checklistAmountWords"), ok: consistency.consistent },
    { label: t("checklistPrintMode"), ok: !!printMode },
    { label: t("checklistCalibration", isDF ? t("directFeed") : t("a4Carrier")), ok: calOk },
    { label: t("checklistGeometry"), ok: geometryOk },
    { label: t("checklistSafeZones"), ok: safeZonesClear },
  ];
  const allOk = items.every((i) => i.ok);
  // Non-blocking: a template whose geometry has never been checked against a
  // real cheque can still be test-printed on plain paper (that is how it gets
  // verified), but the operator must know the ink position is a guess.
  const geometryUnverified = template?.verification?.status === "unverified";

  return (
    <div aria-label="Print readiness checklist (application-level checks only)" className="card" style={{ marginTop: 12 }}>
      <strong style={{ fontSize: "0.85rem", display: "block", marginBottom: 6 }}>
        {allOk ? t("printReadinessTitleReady") : t("printReadinessTitleIncomplete")}
      </strong>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: "0.82rem" }}>
        {items.map((item) => (
          <li key={item.label} style={{ display: "flex", gap: 8 }}>
            <span aria-hidden="true" style={{ color: item.ok ? "var(--success)" : "var(--danger)" }}>
              {item.ok ? "✓" : "✗"}
            </span>
            <span>{item.label}</span>
            {!item.ok && <span className="sr-only">{t("fieldNeedsAttention")}: {item.label}</span>}
          </li>
        ))}
      </ul>
      {geometryUnverified && (
        <p
          role="status"
          style={{ margin: "8px 0 0 0", fontSize: "0.78rem", fontWeight: 600, color: "var(--warning)" }}
        >
          ⚠ {t("geometryWarning")}
        </p>
      )}
      <p style={{ margin: "8px 0 0 0", fontSize: "0.76rem", color: "var(--text-muted)" }}>
        {t("checklistDisclaimer")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export interface WorkspaceProps {
  /** When set (deep-linked bank route), the bank selection is locked. */
  bankId?: string;
  /** When set (deep-linked template route), the template selection is locked. */
  templateId?: string;
}

export default function Workspace({ bankId: boundBankId, templateId: boundTemplateId }: WorkspaceProps = {}) {
  useEffect(() => {
    // Order matters: sizes and banks must be loaded before templates are
    // validated against them.
    initChequeSizes();
    initBankCatalogue();
    initRuntimeTemplates();
  }, []);

  const [selectedBankId, setSelectedBankId] = useState(boundBankId ?? "");
  const [templateId, setTemplateId] = useState(boundTemplateId ?? "");
  const [date, setDate] = useState("");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [amountWords, setAmountWords] = useState("");
  const [accountPayee, setAccountPayee] = useState(true);
  const [printMode, setPrintMode] = useState<ProfileKey>("custom_short");
  const [calibrations, setCalibrations] = useState<CalibrationMap>({});
  const [debugMode, setDebugMode] = useState(false);
  const [printError, setPrintError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printCompleted, setPrintCompleted] = useState(false);
  const [pdfOverlayUrl, setPdfOverlayUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const wordOverrideRef = useRef(false);
  const printStyleRef = useRef<HTMLStyleElement | null>(null);
  const printOutputRef = useRef<HTMLDivElement | null>(null);
  const printKeyRef = useRef(0);
  const printLockRef = useRef(false);
  const afterPrintRef = useRef<(() => void) | null>(null);
  const beforePrintRef = useRef<(() => void) | null>(null);
  const calibrationsLoadedRef = useRef(false);

  // Persisted per (template, mode) calibration, restored once on mount.
  useEffect(() => {
    setCalibrations(loadCalibrations());
    calibrationsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!calibrationsLoadedRef.current) return;
    persistCalibrations(calibrations);
  }, [calibrations]);

  const bank = useMemo(() => (selectedBankId ? getBank(selectedBankId) : undefined), [selectedBankId]);

  const templates = useMemo(() => {
    if (boundBankId) return getActiveTemplatesForBank(boundBankId);
    if (selectedBankId) return getActiveTemplatesForBank(selectedBankId);
    return getAllActiveTemplates();
  }, [boundBankId, selectedBankId]);

  const template = useMemo(() => {
    if (!templateId) return null;
    const found = getTemplate(templateId) ?? null;
    // Deep-link safety: never serve a template under a different bank.
    if (found && boundBankId && found.bankId !== boundBankId) return null;
    return found;
  }, [templateId, boundBankId]);

  // Keep the selected template inside the bank's own template list.
  useEffect(() => {
    if (!templateId) return;
    const allowed = templates.some((t) => t.id === templateId);
    if (!allowed) setTemplateId("");
  }, [templates, templateId]);

  const supportedModes = useMemo(() => supportedModesOf(template), [template]);

  useEffect(() => {
    if (!supportedModes.includes(printMode)) setPrintMode(supportedModes[0]);
  }, [supportedModes, printMode]);

  const isDF = isDirectFeed(printMode);
  const paper = template ? resolvePaper(template, printMode) : null;
  const profile = template?.profiles[printMode];  const currentCalibration = useMemo<Calibration>(() => {
    if (!template) return { x: 0, y: 0 };
    return getCalibrationFor(calibrations, template.id, printMode, templateDefaultCalibration(template));
  }, [template, calibrations, printMode]);

  function updateCalibration(next: Calibration) {
    if (!template) return;
    setCalibrations((prev) => setCalibrationFor(prev, template.id, printMode, next));
  }

  function resetAllCalibration() {
    if (!template) return;
    setCalibrations((prev) => resetCalibrationFor(prev, template.id, printMode));
  }

  const chequeData: ChequeData = { date, payee, amount, amountWords, accountPayee, locale: appLocale };

  const safeZonesClear = useMemo(
    () => (template ? validateSafeZoneClearance(template).length === 0 : true),
    [template],
  );

  const autoWords = useMemo(() => {
    const v = validateAmount(amount);
    if (!v.valid || v.paisa === 0) return "";
    try {
      return amountToWordsFromPaisaLocalized(v.paisa, appLocale);
    } catch {
      return "";
    }
  }, [amount, appLocale]);

  const amountError = useMemo(() => {
    const v = validateAmount(amount);
    return v.valid ? "" : v.error ?? "";
  }, [amount]);

  const hasAmount = useMemo(() => {
    const v = validateAmount(amount);
    return v.valid && v.paisa > 0;
  }, [amount]);

  // -----------------------------------------------------------------------
  // Explicit workflow state + print-readiness (single source of truth for the
  // reason the print button surfaces).
  // -----------------------------------------------------------------------
  const { t, locale: appLocale, toggleLocale } = useTranslation();

  const printReadiness = useMemo<PrintReadiness>(() => {
    if (!template) return { ready: false, reason: t("selectBankTemplateError") };
    if (!date || !validateChequeDate(date).valid) {
      const dc = date ? validateChequeDate(date) : { valid: false, error: t("dateRequiredError") };
      return { ready: false, reason: dc.error ?? t("dateRequiredError") };
    }
    const payeeVal = validatePayee(payee);
    if (!payeeVal.valid) return { ready: false, reason: payeeVal.error ?? t("payeeRequiredError") };
    const amountVal = validateAmount(amount);
    if (!amountVal.valid) return { ready: false, reason: amountVal.error ?? t("amountRequiredError") };
    if (amountVal.paisa === 0) return { ready: false, reason: t("amountZeroError") };
    if (!amountWords.trim()) return { ready: false, reason: t("amountWordsRequiredError") };
    const consistency = checkAmountWordsConsistency(amount, amountWords);
    if (!consistency.consistent) {
      return { ready: false, reason: t("amountWordsMismatchError") };
    }
    if (!printMode) return { ready: false, reason: t("selectPrintModeError") };
    if (validateCalibrationPair(currentCalibration.x, currentCalibration.y) !== null) {
      return { ready: false, reason: t("calibrationError") };
    }
    if (!safeZonesClear) return { ready: false, reason: t("reservedZoneError") };
    return { ready: true, reason: null };
  }, [template, date, payee, amount, amountWords, printMode, currentCalibration, safeZonesClear, t]);

  const derivedFormState = useMemo<FormState>(() => {
    if (isPrinting) return "printing";
    if (printCompleted) return "done";
    if (!template) return "empty";
    const hasDate = isValidDate(date) && validateChequeDate(date).valid;
    const hasPayee = validatePayee(payee).valid;
    const hasWords = amountWords.trim() !== "";
    if (!hasDate && !hasPayee && !hasAmount && !hasWords) return "template-selected";
    const calOk = validateCalibrationPair(currentCalibration.x, currentCalibration.y) === null;
    if (!hasDate || !hasPayee || !hasAmount || !hasWords || !printMode || !calOk) return "data-entering";
    return "ready-print";
  }, [template, isPrinting, printCompleted, date, payee, hasAmount, amountWords, printMode, currentCalibration]);

  // Reset terminal states when the bank template changes and abort any
  // in-progress print cycle: remove injected print styles, drop lingering
  // beforeprint/afterprint/pagehide listeners, and release the print lock.
  useEffect(() => {
    if (printStyleRef.current) {
      printStyleRef.current.remove();
      printStyleRef.current = null;
    }
    if (beforePrintRef.current) {
      window.removeEventListener("beforeprint", beforePrintRef.current);
      beforePrintRef.current = null;
    }
    if (afterPrintRef.current) {
      window.removeEventListener("afterprint", afterPrintRef.current);
      window.removeEventListener("pagehide", afterPrintRef.current);
      afterPrintRef.current = null;
    }
    setPrintCompleted(false);
    setPrintError("");
    setIsPrinting(false);
    printLockRef.current = false;
    return () => {
      if (printStyleRef.current) {
        printStyleRef.current.remove();
        printStyleRef.current = null;
      }
      if (beforePrintRef.current) {
        window.removeEventListener("beforeprint", beforePrintRef.current);
        beforePrintRef.current = null;
      }
      if (afterPrintRef.current) {
        window.removeEventListener("afterprint", afterPrintRef.current);
        window.removeEventListener("pagehide", afterPrintRef.current);
        afterPrintRef.current = null;
      }
      printLockRef.current = false;
    };
  }, [templateId]);

  // Clean up generated PDF overlay URL when template changes
  useEffect(() => {
    return () => {
      if (pdfOverlayUrl) {
        URL.revokeObjectURL(pdfOverlayUrl);
        setPdfOverlayUrl(null);
      }
    };
  }, [templateId]);

  // Auto-sync words when the amount changes (user edits are preserved).
  useEffect(() => {
    if (!wordOverrideRef.current) {
      if (autoWords) setAmountWords(autoWords);
      else if (amount !== "") setAmountWords("");
    }
  }, [autoWords, amount]);

  function handleAmountChange(raw: string) {
    wordOverrideRef.current = false;
    setAmount(raw);
  }

  function handleWordEdit(val: string) {
    wordOverrideRef.current = true;
    setAmountWords(val);
  }

  function handleModeChange(newMode: ProfileKey) {
    setPrintMode(newMode);
    setPrintError("");
  }

  function handlePrint() {
    // DUPLICATE-PRINT GUARD: synchronously lock to prevent double-click from
    // triggering duplicate print attempts.
    if (printLockRef.current || isPrinting) return;
    printLockRef.current = true;
    setIsPrinting(true);

    setPrintError("");
    setPrintCompleted(false);

    const release = () => {
      printLockRef.current = false;
      setIsPrinting(false);
    };

     // STEP 1: VALIDATE DATA
    const dateCheck = validateChequeDate(date);
    if (!dateCheck.valid) { setPrintError(dateCheck.error ?? t("dateInvalidError")); release(); return; }
    const payeeCheck = validatePayee(payee);
    if (!payeeCheck.valid) { setPrintError(payeeCheck.error ?? t("payeeRequiredError")); release(); return; }
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) { setPrintError(amountValidation.error ?? t("amountRequiredError")); release(); return; }
    if (amountValidation.paisa === 0) { setPrintError(t("amountZeroError")); release(); return; }
    if (!amountWords.trim()) { setPrintError(t("printErrorAmountRequired")); release(); return; }
    const consistency = checkAmountWordsConsistencyLocalized(amount, amountWords, appLocale);
    if (!consistency.consistent) {
      setPrintError(
        consistency.expected
          ? `${t("printErrorWordsMismatch")} (${t("expectedWords")}: ${consistency.expected})`
          : t("printErrorWordsMismatch"),
      );
      release();
      return;
    }

    // STEP 2: VALIDATE BANK TEMPLATE
    if (!template) { setPrintError(t("selectBankTemplateError")); release(); return; }
    const resolvedTemplate = template; // narrow for closure safety
    const templateErrors = validateTemplateForPrint(resolvedTemplate);
    if (templateErrors) {
      setPrintError(t("printErrorTemplate"));
      release();
      return;
    }
    const owningBank = getBank(resolvedTemplate.bankId);
    if (!owningBank || !owningBank.enabled) {
      setPrintError(t("printErrorBankDisabled"));
      release();
      return;
    }

    // STEP 3: VALIDATE PRINT MODE
    if (!printMode) { setPrintError(t("printErrorMode")); release(); return; }
    if (!supportedModes.includes(printMode)) {
      setPrintError(t("printErrorModeUnsupported"));
      release();
      return;
    }

    // STEP 4: APPLY CALIBRATION (per template + print mode; range + finiteness checked)
    const cal = currentCalibration;
    const calError = validateCalibrationPair(cal.x, cal.y);
    if (calError) { setPrintError(sanitizeError(calError)); release(); return; }

    // STEP 5: PREPARE PRINT LAYOUT
    const resolvedProfile = resolvedTemplate.profiles[printMode];
    if (!resolvedProfile) { setPrintError(t("printErrorProfile")); release(); return; }

    // STEP 5b: VALIDATE GEOMETRY (single source of truth guard)
    const geom = resolvePrintGeometry(resolvedTemplate, printMode);
    const geomErrors = validatePrintGeometry(geom, resolvedTemplate, printMode);
    if (geomErrors) {
      setPrintError(t("printErrorLayout"));
      release();
      return;
    }

    // STEP 5c: CALIBRATED BOUNDS CHECK — the cheque must stay within the page.
    const calBoundsErrors = validateCalibratedBounds(resolvedTemplate, printMode);
    if (calBoundsErrors) {
      setPrintError(t("printErrorCalibration"));
      release();
      return;
    }

    // STEP 5d: RESERVED ZONE CHECK — no printable field may enter the MICR band.
    if (validateSafeZoneClearance(resolvedTemplate).length > 0) {
      setPrintError(t("reservedZoneError"));
      release();
      return;
    }

    // STEP 6: INJECT PAGE RULES — top-level @page plus mode-specific container
    // sizing before window.print(). Both come from the same resolver the print
    // DOM uses, so @page and the container box can never disagree.
    const currentPrintKey = ++printKeyRef.current;

    if (printStyleRef.current) {
      printStyleRef.current.remove();
      printStyleRef.current = null;
    }

    const containerSelector = isDirectFeed(printMode) ? ".print-direct-feed" : ".print-a4-carrier";
    const css = `
@page {
  size: ${geom.pageW.toFixed(1)}mm ${geom.pageH.toFixed(1)}mm;
  margin: 0;
}
@media print {
  ${containerSelector} {
    display: block !important;
    width: ${geom.containerW}mm !important;
    height: ${geom.containerH}mm !important;
  }
}
`;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    printStyleRef.current = style;

    // STEP 7: TRIGGER BROWSER PRINT via beforeprint for deterministic timing
    function onBeforePrint() {
      if (printOutputRef.current) {
        printOutputRef.current.dataset.printKey = String(currentPrintKey);
        printOutputRef.current.dataset.templateId = resolvedTemplate.id;
        printOutputRef.current.dataset.mode = printMode;
        printOutputRef.current.dataset.calx = String(cal.x);
        printOutputRef.current.dataset.caly = String(cal.y);
      }
    }

    function onAfterPrint() {
      if (!printLockRef.current) return;
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("pagehide", onAfterPrint);
      beforePrintRef.current = null;
      afterPrintRef.current = null;
      if (printStyleRef.current) {
        printStyleRef.current.remove();
        printStyleRef.current = null;
      }
      printLockRef.current = false;
      setIsPrinting(false);
      setPrintCompleted(true);
    }

    beforePrintRef.current = onBeforePrint;
    afterPrintRef.current = onAfterPrint;
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("pagehide", onAfterPrint);
    try {
      window.print();
    } catch (err) {
      setPrintError(sanitizeError(err));
      printLockRef.current = false;
      setIsPrinting(false);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("pagehide", onAfterPrint);
      beforePrintRef.current = null;
      afterPrintRef.current = null;
   }
   }

   async function handleGeneratePdfOverlay() {
     if (!template || isGeneratingPdf) return;

     setPrintError("");
     setIsGeneratingPdf(true);

     try {
       const result = await generateOverlayPdf(template, chequeData, printMode, currentCalibration);
       // Revoke any previous URL to avoid leaks
       if (pdfOverlayUrl) URL.revokeObjectURL(pdfOverlayUrl);
       setPdfOverlayUrl(result.blobUrl);
     } catch (err) {
       setPrintError(err instanceof Error ? err.message : "Failed to generate PDF overlay.");
     } finally {
       setIsGeneratingPdf(false);
     }
   }

   function handleClear() {
    // Preserve system configuration (print mode is a persistent UI preference);
    // only reset cheque data and transient state, with an explicit confirmation.
    const calibrationDirty = Object.keys(calibrations).length > 0;
    if (
      templateId !== "" ||
      date !== "" ||
      payee !== "" ||
      amount !== "" ||
      amountWords !== "" ||
      calibrationDirty ||
      pdfOverlayUrl !== null
    ) {
      if (!window.confirm("Clear all cheque details and calibration? This cannot be undone.")) return;
    }

    setDate("");
    setPayee("");
    setAmount("");
    setAmountWords("");
    setAccountPayee(true);
    setPrintCompleted(false);
    setPrintError("");
    setIsPrinting(false);
    wordOverrideRef.current = false;
    printLockRef.current = false;
    printKeyRef.current = 0;
    if (printStyleRef.current) {
      printStyleRef.current.remove();
      printStyleRef.current = null;
    }
     // Deep-linked selection is restored by the URL, so only an unbound
     // selection is cleared here.
     if (!boundTemplateId) setTemplateId("");
     if (!boundBankId) setSelectedBankId("");
     setCalibrations({});

     // Clean up PDF overlay
     if (pdfOverlayUrl) {
       URL.revokeObjectURL(pdfOverlayUrl);
       setPdfOverlayUrl(null);
     }
     setIsGeneratingPdf(false);
   }

  const calibrationRows = useMemo(() => {
    if (!template) return [];
    return supportedModes.map((mode) => ({
      mode,
      calibration: getCalibrationFor(calibrations, template.id, mode, templateDefaultCalibration(template)),
    }));
  }, [template, calibrations, supportedModes]);

  const dateWarning = date && !validateChequeDate(date).valid ? validateChequeDate(date).error : "";

  return (
    <>
      {/* ================================================================
          SCREEN UI — wrapped in no-print so it disappears during browser print
          ================================================================ */}
      <div className="no-print">
        <div className="compose-grid">
          {/* ---------- LEFT: Form ---------- */}
               <form
               className="panel cheque-form"
               id="cheque-form"
               autoComplete="off"
               onSubmit={(e) => { e.preventDefault(); handlePrint(); }}
             >
               <div className="panel-heading">
                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                   <span className="step">01</span>
                   <h2>{t("chequeDetails")}</h2>
                   <span
                     className="state-badge"
                     style={{
                       fontSize: "0.72rem",
                       fontWeight: 600,
                       padding: "2px 8px",
                       borderRadius: "12px",
                       background:
                         derivedFormState === "ready-print" || derivedFormState === "ready-preview"
                           ? "color-mix(in srgb, var(--success) 14%, transparent)"
                           : derivedFormState === "printing"
                             ? "color-mix(in srgb, var(--info) 14%, transparent)"
                             : "color-mix(in srgb, var(--text-secondary) 10%, transparent)",
                       color:
                         derivedFormState === "ready-print" || derivedFormState === "ready-preview"
                           ? "var(--success)"
                           : derivedFormState === "printing"
                             ? "var(--info)"
                             : "var(--text-secondary)",
                     }}
                     aria-label={`Workflow state: ${derivedFormState}`}
                   >
                     {derivedFormState === "empty"
                       ? t("stateSelectBank")
                       : derivedFormState === "template-selected"
                         ? t("stateBankSelected")
                         : derivedFormState === "data-entering"
                           ? t("stateFillingDetails")
                           : derivedFormState === "ready-preview"
                             ? t("stateReviewPreview")
                             : derivedFormState === "ready-print"
                               ? t("stateReadyToPrint")
                               : derivedFormState === "printing"
                                 ? t("statePrinting")
                                 : t("statePrintFinished")}
                   </span>
                 </div>
                 <button type="button" className="text-button" onClick={handleClear} aria-label={t("clearAllAria")}>
                   {t("clearAllBtn")}
                 </button>
               </div>

            {boundBankId ? (
              <div className="field">
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>BANK</span>
                <div style={{ fontWeight: 700 }}>{bank ? formatBankLabel(bank) : boundBankId}</div>
                <small>
                  Selected from the address bar. <Link href="/" className="text-button">Choose another bank</Link>
                </small>
              </div>
            ) : (
              <BankSelector value={selectedBankId} onChange={(id) => { setSelectedBankId(id); setTemplateId(""); }} />
            )}

            <BankTemplateSelector
              templates={templates}
              selectedId={templateId}
              onChange={setTemplateId}
              disabled={templates.length === 0}
            />
            {templates.length === 0 && (
              <p className="error-state" role="status">
                {t("noTemplates")}
              </p>
            )}

            {/* Print Mode + Date */}
            <div className="two-columns">
              <div className="field">
                <label htmlFor="print-mode">Print Mode</label>
                <select
                  id="print-mode"
                  value={printMode}
                  onChange={(e) => handleModeChange(e.target.value as ProfileKey)}
                  disabled={!template}
                  aria-required={true}
                  aria-describedby={template ? "print-mode-help" : "field-disabled-bank"}
                  aria-disabled={!template}
                >
                <optgroup label={t("directFeedGroup")}>
                  {supportedModes
                    .filter((m) => isDirectFeed(m))
                    .map((m) => (
                      <option key={m} value={m}>
                        {localizedProfileLabel(m, appLocale)}
                      </option>
                    ))}
                </optgroup>
                <optgroup label={t("a4CarrierGroup")}>
                  {supportedModes
                    .filter((m) => !isDirectFeed(m))
                    .map((m) => (
                      <option key={m} value={m}>
                        {localizedProfileLabel(m, appLocale)}
                      </option>
                    ))}
                </optgroup>
                </select>
                <small id="print-mode-help">{t("printModeHelp")}</small>
              </div>
              <div className="field">
                <label htmlFor="date-input">{t("dateLabel")}</label>
                <input
                  id="date-input"
                  type="date"
                  value={date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!template}
                  aria-required={true}
                  aria-describedby={template ? "date-help" : "field-disabled-bank"}
                  aria-disabled={!template}
                />
                <small id="date-help">
                  {dateWarning ? <span className="error-state">{dateWarning}</span> : t("dateHelpText")}
                </small>
              </div>
            </div>

            {/* Payee */}
              <div className="field">
                <label htmlFor="payee-input">{t("payeeLabel")}</label>
                <input
                  id="payee-input"
                  type="text"
                  maxLength={120}
                  placeholder={template ? t("payeePlaceholder") : ""}
                  value={payee}
                  onChange={(e) => setPayee(e.target.value.slice(0, 120))}
                  disabled={!template}
                  aria-describedby={template ? "payee-help" : "field-disabled-bank"}
                  aria-disabled={!template}
                />
                {(() => {
                  const pc = validatePayee(payee);
                  return !pc.valid && payee !== "" ? <span className="error-state" role="alert">{pc.error}</span> : null;
                })()}
                <small id="payee-help">{t("payeeHelpText")}</small>
                {!template && (
                  <span id="field-disabled-bank" className="sr-only">
                    {t("fieldDisabledBank")}
                  </span>
                )}
              </div>

            {/* Amount + Amount in Words */}
            <div className="two-columns">
              <div className="field">
                <label htmlFor="amount-input">Amount (NPR)</label>
                <div className="input-prefix">
                  <b aria-hidden="true">Rs.</b>
                  <label htmlFor="amount-input" className="sr-only">Amount</label>
                  <input
                    id="amount-input"
                    type="text"
                    inputMode="decimal"
                    placeholder={template ? "0.00" : ""}
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    disabled={!template}
                    aria-invalid={!!amountError}
                    aria-describedby={amountError ? "amount-error" : template ? undefined : "field-disabled-bank"}
                    aria-required={true}
                  />
                </div>
                {amountError && <span className="error-state" id="amount-error" role="alert">{amountError}</span>}
                <small>Enter whole numbers or decimals up to 2 places.</small>
              </div>
              <div className="field">
                <label htmlFor="words-input">Amount in Words</label>
                <textarea
                  id="words-input"
                  rows={3}
                  maxLength={240}
                  placeholder={template ? "Auto-generated" : ""}
                  value={amountWords}
                  onChange={(e) => handleWordEdit(e.target.value)}
                  disabled={!template}
                  aria-describedby={template ? "words-help" : "field-disabled-bank"}
                  aria-disabled={!template}
                />
                <small id="words-help">You may edit the generated wording before printing.</small>
              </div>
            </div>

            {/* A/C Payee Only */}
            <div className="field check">
              <input
                id="ac-payee"
                type="checkbox"
                checked={accountPayee}
                onChange={(e) => setAccountPayee(e.target.checked)}
                disabled={!template}
                aria-describedby={template ? undefined : "field-disabled-bank"}
                aria-disabled={!template}
              />
              <label htmlFor="ac-payee" style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                Print <b>A/C PAYEE ONLY</b>
                <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {" "}· Adds a centred account-payee crossing
                </span>
              </label>
            </div>

            {/* Print Settings / Size Management */}
            {template && paper && (
              <div className="field" style={{ marginTop: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Print Settings / Size Management
                </h3>
                <div style={{ display: "grid", gap: 10, fontSize: "0.85rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>PRINT MODE</span>
                    <b style={{ color: isDF ? "var(--brand-blue)" : "var(--brand-teal)" }}>
                      {isDF ? "Custom Cheque Size" : "A4 Carrier"}
                    </b>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>CHEQUE SIZE</span>
                    <b>{template.widthMm} mm × {template.heightMm} mm</b>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>ORIENTATION</span>
                    <b>{template.orientation === "portrait" ? "Portrait" : "Landscape"} cheque</b>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>PAPER</span>
                    <b>{paper.label}</b>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>CALIBRATION</span>
                    <b>{formatCalibration(currentCalibration)}</b>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>SCALE</span>
                    <b>100% / Actual Size</b>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>TEMPLATE STATUS</span>
                    <b>
                      {template.verification?.status === "physically-calibrated"
                        ? "Physically calibrated"
                        : template.verification?.status === "browser-verified"
                          ? "Browser verified — physical test pending"
                          : "Unverified layout"}
                    </b>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>MODE CALIBRATIONS (independent)</span>
                    <b style={{ fontSize: "0.8rem" }}>
                      {calibrationRows
                        .map((row) => `${PROFILE_LABELS[row.mode].split(" · ")[0]}: ${formatCalibration(row.calibration)}`)
                        .join(" · ")}
                    </b>
                  </div>
                </div>

                {/* Debug mode toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingLeft: 2 }}>
                  <label htmlFor="debug-toggle" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.82rem" }}>
                    <input
                      id="debug-toggle"
                      type="checkbox"
                      checked={debugMode}
                      onChange={(e) => setDebugMode(e.target.checked)}
                    />
                    <span style={{ color: "var(--text-muted)" }}>Show debug measurement guides</span>
                  </label>
                  <small style={{ color: "var(--text-muted)" }}>Dev/admin only</small>
                </div>
              </div>
            )}

            {/* Calibration — mode-aware heading */}
            <div className="field" style={{ marginTop: 8 }}>
              <span>
                Calibration (mm offset) ·{" "}
                <b style={{ color: isDF ? "var(--brand-blue)" : "var(--brand-teal)" }}>
                  {isDF ? "Direct Feed" : "A4 Carrier"}
                </b>
              </span>
              <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                <CalibrationControl
                  label="X Offset"
                  value={currentCalibration.x}
                  onChange={(v) => updateCalibration({ ...currentCalibration, x: clampCalibration(v) })}
                  disabled={!template}
                />
                <CalibrationControl
                  label="Y Offset"
                  value={currentCalibration.y}
                  onChange={(v) => updateCalibration({ ...currentCalibration, y: clampCalibration(v) })}
                  disabled={!template}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <button
                    type="button"
                    className="text-button"
                    disabled={!template || isNeutralCalibration(currentCalibration)}
                    onClick={resetAllCalibration}
                    title="Reset X and Y to 0 for the current template and print mode"
                    style={{ fontSize: "0.8rem", padding: "4px 6px" }}
                  >
                    Reset All
                  </button>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {calibrationRows
                      .map((row) => `${PROFILE_LABELS[row.mode].split(" · ")[0]}: X ${row.calibration.x.toFixed(1)} Y ${row.calibration.y.toFixed(1)}`)
                      .join(" · ")}
                  </span>
                </div>
              </div>
              <small>
                Fine adjustment in {CALIBRATION_STEP_MM} mm steps, ±{CALIBRATION_MAX_MM} mm range. Calibration is stored per cheque
                template and per print mode, moves X and Y independently, and never changes the cheque&apos;s physical size.
              </small>
            </div>

            {/* Selected template summary */}
            {template && profile && (
              <div className="template-summary" aria-label="Selected template info">
                <div><span>Bank · </span><b>{template.bankName}</b></div>
                <div><span>Layout · </span><b>{template.label}</b></div>
                <div><span>Size · </span><b>{template.widthMm} × {template.heightMm} mm ({template.orientation})</b></div>
                <div><span>Mode · </span><b>{PROFILE_LABELS[printMode]}</b></div>
                <div><span>Page · </span><b>{profile.pageWidth} × {profile.pageHeight} mm</b></div>
                <div><span>Calibration · </span><b>{formatCalibration(currentCalibration)}</b></div>
              </div>
            )}

            <PrepChecklist
              template={template}
              date={date}
              payee={payee}
              amount={amount}
              amountWords={amountWords}
              printMode={printMode}
              calibration={currentCalibration}
              isDF={isDF}
              safeZonesClear={safeZonesClear}
            />

            <div className="form-actions" style={{ marginTop: 16, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <button
                type="button"
                className="button secondary"
                disabled={!printReadiness.ready || isPrinting}
                onClick={handlePrint}
                aria-disabled={!printReadiness.ready || isPrinting}
                aria-describedby={printReadiness.ready ? "print-help" : "print-reason"}
                aria-label={
                  isPrinting
                    ? "Printing cheque — wait for the print dialog"
                    : printCompleted
                      ? "Print completed — select a new bank or clear to start over"
                      : printReadiness.ready
                        ? "Print cheque"
                        : `Print cheque — requires: ${printReadiness.reason ?? "all fields complete"}`
                }
              >
                {isPrinting ? "Printing…" : printCompleted ? "Print Again" : "Print Cheque"}
              </button>
              {!printReadiness.ready && !isPrinting && (
                <p id="print-reason" className="error-state" role="status" aria-live="polite">
                  {printReadiness.reason}
                </p>
              )}
              <p id="print-help" className="sr-only">
                Prints the cheque at actual size. Ensure printer is set to Actual Size (100%).
              </p>

              {/* PDF Overlay export — generates a transparent 1:1mm PDF overlay
                  for printing on transparency film over existing cheque stock. */}
              <button
                type="button"
                className="button secondary"
                style={{ fontSize: "0.82rem" }}
                disabled={!printReadiness.ready || isGeneratingPdf || isPrinting}
                onClick={handleGeneratePdfOverlay}
                aria-label={isGeneratingPdf ? "Generating PDF overlay..." : "Generate transparent PDF overlay for printing"}
                title="Generate a transparent PDF overlay to print on transparency film over an existing cheque"
              >
                {isGeneratingPdf ? "Generating PDF…" : "PDF Overlay"}
              </button>
            </div>

            {printError && (
              <p className="error-state" style={{ marginTop: 8 }} role="alert" aria-live="assertive">{printError}</p>
            )}
            {isPrinting && (
              <p className="info-state" style={{ marginTop: 8 }} aria-live="polite">
                Opening print dialog. Please confirm <b>Actual Size (100%)</b> in your printer settings.
              </p>
            )}
          </form>

          {/* ---------- RIGHT: Preview ---------- */}
          <section className="preview-column">
            <div className="preview-heading">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="step">02</span>
                <h2>Live Print Preview</h2>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                {template?.bankName || "No bank selected"}
              </span>
            </div>

            <div className="preview-stage" id="preview-stage" tabIndex={-1}>
              {template ? (
                <ChequeSheet
                  template={template}
                  data={chequeData}
                  mode={printMode}
                  calibration={currentCalibration}
                  variant="preview"
                  debugMode={debugMode}
                />
              ) : (
                <div
                  className="cheque-preview"
                  style={{ width: Math.round(STANDARD_CHEQUE_W_MM * SCALE), height: Math.round(STANDARD_CHEQUE_H_MM * SCALE) }}
                  role="img"
                  aria-label="No bank template selected — preview unavailable"
                >
                  <div className="cheque-watermark" aria-hidden="true">NO TEMPLATE SELECTED</div>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Select a bank template to begin</span>
                  </div>
                </div>
              )}
            </div>

            {template && (
              <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Preview box: {Math.round(template.widthMm * SCALE)} × {Math.round(template.heightMm * SCALE)} px at 1 mm = {SCALE} px.
                Reserved MICR band: bottom {Math.max(0, Math.round(template.heightMm * SCALE * 0.08))} px — never printed.
              </p>
            )}

             <div className="tip-card">
               <div className="tip-icon" aria-hidden="true">i</div>
               <div>
                 <strong>Before printing a real cheque</strong>
                 <p>
                   {isDF ? (
                     <>
                       For <b>Direct Feed</b>: feed a blank cheque directly into your printer. Set print dialog to <b>Actual Size (100%)</b> — do NOT fit to page. Ensure margins are set to minimum/none. Use X/Y calibration to align if needed.
                     </>
                   ) : (
                     <>
                       For <b>A4 Carrier</b>: print on plain A4 paper. Set print dialog to <b>Actual Size (100%)</b> with no margins. Cut out the cheque along the border. Use X/Y calibration to align if needed.
                     </>
                   )}
                 </p>
               </div>
             </div>

             {/* PDF Overlay preview — shows when a transparent PDF has been generated */}
             {pdfOverlayUrl && (
               <div className="card" style={{ marginTop: 12, padding: 12 }}>
                 <h3 style={{ margin: "0 0 8px 0", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                   Transparent PDF Overlay
                 </h3>
                 <p style={{ margin: "0 0 8px 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                   Print this overlay at 100% scale on transparency film, then place it over your physical cheque. Only the variable fields (date, payee, amount, words) are printed — the cheque background and MICR band are not covered.
                 </p>
                 <iframe
                   src={pdfOverlayUrl}
                   title="Cheque overlay PDF preview"
                   style={{ width: "100%", height: "200px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                 />
                 <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                   <a
                     href={pdfOverlayUrl}
                     download="cheque-overlay.pdf"
                     className="text-button"
                     style={{ fontSize: "0.8rem" }}
                     onClick={() => {
                       // Clean up URL after download starts
                       setTimeout(() => {
                         if (pdfOverlayUrl) URL.revokeObjectURL(pdfOverlayUrl);
                         setPdfOverlayUrl(null);
                       }, 1000);
                     }}
                   >
                     Download PDF
                   </a>
                   <button
                     type="button"
                     className="text-button"
                     style={{ fontSize: "0.8rem" }}
                     onClick={() => {
                       if (pdfOverlayUrl) URL.revokeObjectURL(pdfOverlayUrl);
                       setPdfOverlayUrl(null);
                     }}
                   >
                     Discard
                   </button>
                 </div>
               </div>
             )}
           </section>
        </div>
      </div>

      {/* ================================================================
          PRINT OUTPUT — hidden off-screen on display, visible only during
          browser print. Rendered by the SAME component as the preview, at
          physical 1:1 mm scale.
          ================================================================ */}
      {template && profile && (
        <div
          ref={printOutputRef}
          data-print-key={printKeyRef.current}
          data-template-id={template.id}
          data-mode={printMode}
          data-calx={String(currentCalibration.x)}
          data-caly={String(currentCalibration.y)}
          className="print-output-screen"
        >
          <PrintOutput
            template={template}
            data={chequeData}
            mode={printMode}
            calibration={currentCalibration}
          />
        </div>
      )}
    </>
  );
}

/** The print payload: the same sheet, at 1:1 physical scale. */
function PrintOutput({
  template,
  data,
  mode,
  calibration,
}: {
  template: BankTemplate;
  data: ChequeData;
  mode: ProfileKey;
  calibration: Calibration;
}) {
  return <ChequeSheet template={template} data={data} mode={mode} calibration={calibration} variant="print" />;
}

/** Screen-only guard: the print payload must fit inside its cheque box. */
export function layoutFits(template: BankTemplate, data: ChequeData, mode: ProfileKey, calibration: Calibration): boolean {
  return fieldsWithinCheque(computeSheetLayout(template, data, mode, calibration));
}
