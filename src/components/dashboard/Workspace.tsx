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
import ChequeSheet from "@/components/cheque/ChequeSheet";
import { generateOverlayPdf } from "@/components/cheque/ChequeOverlayPDF";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

const SCALE = 2.4;

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

function supportedModesOf(template: BankTemplate | null): ProfileKey[] {
  const modes = template?.print?.supportedModes ?? [];
  const order: ProfileKey[] = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];
  const filtered = order.filter((m) => modes.includes(m));
  return filtered.length > 0 ? filtered : ["custom_short"];
}

const PROFILE_LABELS: Record<ProfileKey, string> = {
  custom_short: "Direct Feed · Short Edge First",
  custom_long: "Direct Feed · Long Edge First",
  a4_vertical: "A4 Carrier · Portrait",
  a4_horizontal: "A4 Carrier · Landscape",
};

function localizedProfileLabel(mode: ProfileKey, locale: "en" | "ne"): string {
  const key = `profileLabel_${mode}`;
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
// Workspace
// ---------------------------------------------------------------------------

export interface WorkspaceProps {
  bankId?: string;
  templateId?: string;
}

export default function Workspace({ bankId: boundBankId, templateId: boundTemplateId }: WorkspaceProps = {}) {
  useEffect(() => {
    initChequeSizes();
    initBankCatalogue();
    initRuntimeTemplates();
  }, []);

  const [selectedBankId, setSelectedBankId] = useState(boundBankId ?? "");
  const [templateId, setTemplateId] = useState(boundTemplateId ?? "");
  const [date, setDate] = useState("");
  const [payee, setPayee] = useState("");
  const [reference, setReference] = useState("");
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
  const [micrVerified, setMicrVerified] = useState(false);
  const [currency, setCurrency] = useState("NPR");

  const wordOverrideRef = useRef(false);
  const printStyleRef = useRef<HTMLStyleElement | null>(null);
  const printOutputRef = useRef<HTMLDivElement | null>(null);
  const printKeyRef = useRef(0);
  const printLockRef = useRef(false);
  const afterPrintRef = useRef<(() => void) | null>(null);
  const beforePrintRef = useRef<(() => void) | null>(null);
  const calibrationsLoadedRef = useRef(false);

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
    if (found && boundBankId && found.bankId !== boundBankId) return null;
    return found;
  }, [templateId, boundBankId]);

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
  const profile = template?.profiles[printMode];
  const currentCalibration = useMemo<Calibration>(() => {
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

  const { t, locale: appLocale, toggleLocale } = useTranslation();

  const chequeData: ChequeData = { date, payee, reference, amount, amountWords, accountPayee, locale: appLocale };

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
    if (!micrVerified) return { ready: false, reason: t("micrConfirmError") };
    return { ready: true, reason: null };
  }, [template, date, payee, amount, amountWords, printMode, currentCalibration, safeZonesClear, micrVerified, t]);

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

  useEffect(() => {
    return () => {
      if (pdfOverlayUrl) {
        URL.revokeObjectURL(pdfOverlayUrl);
        setPdfOverlayUrl(null);
      }
    };
  }, [templateId]);

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
    if (printLockRef.current || isPrinting) return;
    printLockRef.current = true;
    setIsPrinting(true);
    setPrintError("");
    setPrintCompleted(false);

    const release = () => {
      printLockRef.current = false;
      setIsPrinting(false);
    };

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

    if (!template) { setPrintError(t("selectBankTemplateError")); release(); return; }
    const resolvedTemplate = template;
    const templateErrors = validateTemplateForPrint(resolvedTemplate);
    if (templateErrors) { setPrintError(t("printErrorTemplate")); release(); return; }
    const owningBank = getBank(resolvedTemplate.bankId);
    if (!owningBank || !owningBank.enabled) { setPrintError(t("printErrorBankDisabled")); release(); return; }

    if (!printMode) { setPrintError(t("printErrorMode")); release(); return; }
    if (!supportedModes.includes(printMode)) { setPrintError(t("printErrorModeUnsupported")); release(); return; }

    const cal = currentCalibration;
    const calError = validateCalibrationPair(cal.x, cal.y);
    if (calError) { setPrintError(sanitizeError(calError)); release(); return; }

    const resolvedProfile = resolvedTemplate.profiles[printMode];
    if (!resolvedProfile) { setPrintError(t("printErrorProfile")); release(); return; }

    const geom = resolvePrintGeometry(resolvedTemplate, printMode);
    const geomErrors = validatePrintGeometry(geom, resolvedTemplate, printMode);
    if (geomErrors) { setPrintError(t("printErrorLayout")); release(); return; }

    const calBoundsErrors = validateCalibratedBounds(resolvedTemplate, printMode);
    if (calBoundsErrors) { setPrintError(t("printErrorCalibration")); release(); return; }

    if (validateSafeZoneClearance(resolvedTemplate).length > 0) { setPrintError(t("reservedZoneError")); release(); return; }

    if (!micrVerified) { setPrintError(t("micrConfirmError")); release(); return; }

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
      if (pdfOverlayUrl) URL.revokeObjectURL(pdfOverlayUrl);
      setPdfOverlayUrl(result.blobUrl);
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : t("printErrorGeneral"));
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  function handleClear() {
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
      if (!window.confirm(t("clearConfirm"))) return;
    }
    setDate("");
    setPayee("");
    setReference("");
    setAmount("");
    setAmountWords("");
    setAccountPayee(true);
    setMicrVerified(false);
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
    if (!boundTemplateId) setTemplateId("");
    if (!boundBankId) setSelectedBankId("");
    setCalibrations({});
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
                <h2>{t("chequeDetails")}</h2>
                <span
                  className="state-badge"
                  style={{
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link href="/overlay" className="text-button" style={{ fontSize: "0.78rem" }}>
                  Overlay Tool
                </Link>
                <ThemeToggle />
                <LanguageToggle />
                <button type="button" className="text-button" onClick={handleClear} aria-label={t("clearAllAria")}>
                  {t("clearAllBtn")}
                </button>
              </div>
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
              <div className="field">
                <label htmlFor="bank-select">{t("selectBank")}</label>
                <select
                  id="bank-select"
                  required
                  value={selectedBankId}
                  onChange={(e) => { setSelectedBankId(e.target.value); setTemplateId(""); }}
                >
                  <option value="">— {t("selectBank")} —</option>
                  {getBankOptions().map((option) => (
                    <option key={option.value} value={option.value} disabled={!option.hasTemplate}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>{t("bankTemplateNote")}</small>
              </div>
            )}

            {templates.length > 0 && (
              <div className="field">
                <label htmlFor="template-select">{t("selectBankTemplate")}</label>
                <select
                  id="template-select"
                  required
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <option value="">— {t("selectBankTemplate")} —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <small>{t("pickTemplateHelp")}</small>
              </div>
            )}
            {templates.length === 0 && (
              <p className="error-state" role="status">{t("noTemplates")}</p>
            )}

            {/* Print Mode + Date */}
            <div className="two-columns">
              <div className="field">
                <label htmlFor="print-mode">{t("printModeLabel")}</label>
                <select
                  id="print-mode"
                  value={printMode}
                  onChange={(e) => handleModeChange(e.target.value as ProfileKey)}
                  disabled={!template}
                >
                  <optgroup label={t("directFeedGroup")}>
                    {supportedModes
                      .filter((m) => isDirectFeed(m))
                      .map((m) => (
                        <option key={m} value={m}>{localizedProfileLabel(m, appLocale)}</option>
                      ))}
                  </optgroup>
                  <optgroup label={t("a4CarrierGroup")}>
                    {supportedModes
                      .filter((m) => !isDirectFeed(m))
                      .map((m) => (
                        <option key={m} value={m}>{localizedProfileLabel(m, appLocale)}</option>
                      ))}
                  </optgroup>
                </select>
                <small>{t("printModeHelp")}</small>
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
                />
                <small>
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
              />
              {(() => {
                const pc = validatePayee(payee);
                return !pc.valid && payee !== "" ? <span className="error-state" role="alert">{pc.error}</span> : null;
              })()}
              <small>{t("payeeHelpText")}</small>
            </div>

            {/* Amount + Amount in Words */}
            <div className="two-columns">
              <div className="field">
                <label htmlFor="amount-input">{t("amountLabel")}</label>
                <div className="input-prefix">
                  <b aria-hidden="true">{t("amountPrefix")}</b>
                  <input
                    id="amount-input"
                    type="text"
                    inputMode="decimal"
                    placeholder={template ? "0.00" : ""}
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    disabled={!template}
                  />
                </div>
                {amountError && <span className="error-state" role="alert">{amountError}</span>}
                <small>{t("amountHelp")}</small>
              </div>
              <div className="field">
                <label htmlFor="words-input">{t("amountWordsLabel")}</label>
                <textarea
                  id="words-input"
                  rows={3}
                  maxLength={240}
                  placeholder={template ? t("amountWordsPlaceholder") : ""}
                  value={amountWords}
                  onChange={(e) => handleWordEdit(e.target.value)}
                  disabled={!template}
                />
                <small>{t("wordsHelp")}</small>
              </div>
            </div>

            {/* Reference */}
            <div className="field">
              <label htmlFor="reference-input">{t("referenceLabel")}</label>
              <input
                id="reference-input"
                type="text"
                maxLength={60}
                placeholder={template ? t("referencePlaceholder") : ""}
                value={reference}
                onChange={(e) => setReference(e.target.value.slice(0, 60))}
                disabled={!template}
              />
              <small>{t("referenceHelpText")}</small>
            </div>

            {/* A/C Payee Only */}
            <div className="field check">
              <input
                id="ac-payee"
                type="checkbox"
                checked={accountPayee}
                onChange={(e) => setAccountPayee(e.target.checked)}
                disabled={!template}
              />
              <label htmlFor="ac-payee" style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                {t("acPayeeOnly")} <b>A/C PAYEE ONLY</b>
                <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {" "}·{t("acPayeeHelp")}
                </span>
              </label>
            </div>

            {/* MICR Verification */}
            <div className="field check" style={{ marginTop: 8, padding: "8px 10px", border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)", borderRadius: "var(--radius-sm)", background: "color-mix(in srgb, var(--warning) 4%, transparent)" }}>
              <input
                id="micr-verify"
                type="checkbox"
                checked={micrVerified}
                onChange={(e) => setMicrVerified(e.target.checked)}
                disabled={!template}
              />
              <label htmlFor="micr-verify" style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--warning)" }}>
                {appLocale === "ne" ? "कृपया MICR लाईन सफा पुष्टि गर्नुस्" : "MICR line (bottom 0.5\" of cheque) is clear?"}
                <small style={{ display: "block", marginTop: 2, fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>
                  {appLocale === "ne" ? "चेकको तल ०.५ इंचको MICR ब्यान्ड कुनै पनि स्याहीले छोएको छैन भन्न जाँच गर्नुहोस्।" : "Check that no ink overlaps the MICR band (bottom 0.5\")."}
                </small>
              </label>
            </div>

            {/* Advanced Settings: Calibration */}
            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8 }}>
                  Advanced Settings ▼
                </summary>
                <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Calibration (mm offset) · <b style={{ color: isDF ? "var(--brand-blue)" : "var(--brand-teal)" }}>
                        {isDF ? t("directFeed") : t("a4Carrier")}
                      </b>
                    </span>
                    <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                      <CalibrationControl
                        label={t("xOffsetLabel")}
                        value={currentCalibration.x}
                        onChange={(v) => updateCalibration({ ...currentCalibration, x: clampCalibration(v) })}
                        disabled={!template}
                      />
                      <CalibrationControl
                        label={t("yOffsetLabel")}
                        value={currentCalibration.y}
                        onChange={(v) => updateCalibration({ ...currentCalibration, y: clampCalibration(v) })}
                        disabled={!template}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          className="text-button"
                          disabled={!template || isNeutralCalibration(currentCalibration)}
                          onClick={resetAllCalibration}
                          title={t("resetCalibrationHint")}
                          style={{ fontSize: "0.8rem", padding: "4px 6px" }}
                        >
                          {t("resetAllBtn")}
                        </button>
                      </div>
                    </div>
                    <small>{t("calibrationHelp")}{CALIBRATION_STEP_MM} {t("mmSteps")}{CALIBRATION_MAX_MM} {t("mmRange")}</small>
                  </div>
                </div>
              </details>
            </div>

            {/* Print Actions */}
            <div className="sticky-print-bar" style={{ marginTop: 16 }}>
              <div className="form-actions" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={!printReadiness.ready || isPrinting}
                  onClick={handlePrint}
                >
                  {isPrinting ? t("printingLabel") : printCompleted ? t("printAgain") : t("printChequeBtn")}
                </button>
                {!printReadiness.ready && !isPrinting && (
                  <p className="error-state" role="status" aria-live="polite">
                    {printReadiness.reason}
                  </p>
                )}
                <button
                  type="button"
                  className="button secondary"
                  style={{ fontSize: "0.82rem" }}
                  disabled={!printReadiness.ready || isGeneratingPdf || isPrinting}
                  onClick={handleGeneratePdfOverlay}
                >
                  {isGeneratingPdf ? t("generatingPdf") : t("generateBtn")}
                </button>
              </div>
            </div>

            {printError && (
              <p className="error-state" style={{ marginTop: 8 }} role="alert" aria-live="assertive">{printError}</p>
            )}
            {isPrinting && (
              <p className="info-state" style={{ marginTop: 8 }} aria-live="polite">
                {t("printDialogHint")} <b>Actual Size (100%)</b> {t("printDialogHint2")}
              </p>
            )}
          </form>

          {/* ---------- RIGHT: Preview ---------- */}
          <section className="preview-column">
            <div className="preview-heading">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2>{t("previewTitle")}</h2>
                <span className="preview-label">Live Preview</span>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                {template?.bankName || t("noBankSelected")}
              </span>
            </div>

            <div className="preview-stage" id="preview-stage" tabIndex={-1}>
              {template ? (
                <ChequeSheet
                  date={date}
                  payeeName={payee}
                  amountInWords={amountWords}
                  amount={amount}
                />
              ) : (
                <div
                  className="cheque-preview"
                  style={{ width: Math.round(STANDARD_CHEQUE_W_MM * SCALE), height: Math.round(STANDARD_CHEQUE_H_MM * SCALE) }}
                  role="img"
                  aria-label="No bank template selected — preview unavailable"
                >
                  <div className="cheque-watermark" aria-hidden="true">{t("noTemplateWatermark")}</div>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{t("noTemplatePreview")}</span>
                  </div>
                </div>
              )}
            </div>

            {template && (
              <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {t("previewBoxLabel")} {Math.round(template.widthMm * SCALE)} × {Math.round(template.heightMm * SCALE)} px {t("previewScaleLabel")}{SCALE} px.
                {t("reservedMicrLabel")} {Math.max(0, Math.round(template.heightMm * SCALE * 0.08))} px — {t("neverPrinted")}.
              </p>
            )}

            <div className="tip-card">
              <div className="tip-icon" aria-hidden="true">i</div>
              <div>
                <strong>{t("beforePrintingTitle")}</strong>
                <p>
                  {isDF ? (
                    <>{t("beforePrintingDirectFeed")}</>
                  ) : (
                    <>{t("beforePrintingA4Carrier")}</>
                  )}
                </p>
              </div>
            </div>

            {pdfOverlayUrl && (
              <div className="card" style={{ marginTop: 12, padding: 12 }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                  {t("pdfOverlayTitle")}
                </h3>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {t("pdfOverlayHelp")}
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
                      setTimeout(() => {
                        if (pdfOverlayUrl) URL.revokeObjectURL(pdfOverlayUrl);
                        setPdfOverlayUrl(null);
                      }, 1000);
                    }}
                  >
                    {t("downloadPdf")}
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
                    {t("discardBtn")}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* PRINT OUTPUT */}
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
          <ChequeSheet
            date={date}
            payeeName={payee}
            amountInWords={amountWords}
            amount={amount}
          />
        </div>
      )}
    </>
  );
}

export function layoutFits(template: BankTemplate, data: ChequeData, mode: ProfileKey, calibration: Calibration): boolean {
  return fieldsWithinCheque(computeSheetLayout(template, data, mode, calibration));
}
