// ---------------------------------------------------------------------------
// Sheet layout — the ONE place that turns (template + cheque data + calibration)
// into positioned millimetre rectangles.
//
// The screen preview and the print output both render the output of
// computeSheetLayout(); the only difference is a linear scale factor. That is
// what makes "preview == print" structural rather than a promise, and it is
// asserted by tests/preview-print-parity.test.mjs.
//
// Calibration semantics (see lib/calibration.ts):
//   - direct feed: the cheque fills the page, so calibration shifts the CONTENT
//     inside the cheque box; the page box never moves.
//   - carrier: the page is the paper and calibration shifts the CHEQUE box.
//   - either way, X only moves horizontally, Y only vertically, and the
//     cheque's physical size is untouched.
// ---------------------------------------------------------------------------

import type { BankTemplate, Calibration, FieldKind, Orientation, ProfileKey, SafeZone } from "./types.ts";
import { isDirectFeed, isPrintableKind } from "./types.ts";
import { resolveCalibratedGeometry } from "./printGeometry.ts";
import {
  amountToWordsFromPaisa,
  formatAmountDisplay,
  formatDateDigits,
  validateAmount,
  validatePayee,
} from "./amountWords.ts";
import { fitFontSize, splitWordsAcrossFields } from "./textFit.ts";
import { normalizeCalibration } from "./calibration.ts";
// MICR guard: fail-safe boundary enforcement for the MICR band.
// Imported as a side-effect to verify the layout function is available;
// the actual call lives inside computeSheetLayout below.
import { enforceMicrSafety, MicrSecurityError } from "@/lib/security/micrGuard";

export interface ChequeData {
  date: string;
  payee: string;
  amount: string;
  amountWords: string;
  accountPayee: boolean;
  /** Language for auto-generated amount-in-words fallback ("en" | "ne"). */
  locale?: "en" | "ne";
}

export interface LaidOutField {
  key: string;
  label: string;
  kind: FieldKind;
  /** Absolute position on the page, in millimetres. */
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSizePt: number;
  letterSpacingMm: number;
  align: "left" | "center" | "right";
  text: string;
  /** False for screen-only placeholders (signature panels). */
  printable: boolean;
}

export interface SheetLayout {
  mode: ProfileKey;
  orientation: Orientation;
  paperId: string;
  pageW: number;
  pageH: number;
  chequeX: number;
  chequeY: number;
  chequeW: number;
  chequeH: number;
  /** Calibration actually applied after clamping. */
  calibration: Calibration;
  /** True when the requested calibration had to be clamped to stay on paper. */
  clamped: boolean;
  fields: LaidOutField[];
  safeZones: SafeZone[];
}

function alignOf(field: { align?: "left" | "center" | "right" }): "left" | "center" | "right" {
  return field.align ?? "left";
}

function safeDateDigits(date: string): string {
  try {
    return formatDateDigits(date);
  } catch {
    return "";
  }
}

/** Effective words text: the user's own wording when present, otherwise the
 *  value derived from the numeric amount. */
export function resolveWords(data: ChequeData): string {
  if (data.amountWords.trim() !== "") return data.amountWords.trim();
  const parsed = validateAmount(data.amount);
  if (!parsed.valid || parsed.paisa === 0) return "";
  try {
    return amountToWordsFromPaisa(parsed.paisa);
  } catch {
    return "";
  }
}

/**
 * Compute the complete mm layout for one sheet.
 *
 * Deterministic and side-effect free: the same inputs always produce the same
 * rectangles, which is what the parity test compares.
 */
export function computeSheetLayout(
  template: BankTemplate,
  data: ChequeData,
  mode: ProfileKey,
  calibration: Calibration,
): SheetLayout {
  const geom = resolveCalibratedGeometry(template, mode, calibration);
  const df = isDirectFeed(mode);

  // Direct feed: calibration shifts the CONTENT inside the cheque (the page box
  // is the cheque, so finalChequeX/Y stay 0 and the offset is applied here).
  // Carrier: resolveCalibratedGeometry already moved the cheque box.
  const requested = normalizeCalibration(calibration);
  const contentOffsetX = df ? requested.x : 0;
  const contentOffsetY = df ? requested.y : 0;
  // Carrier: resolveCalibratedGeometry already produced the calibrated cheque
  // position (clamped so it can never leave the paper).
  const chequeX = df ? 0 : geom.finalChequeX;
  const chequeY = df ? 0 : geom.finalChequeY;
  const applied: Calibration = df
    ? requested
    : {
        x: Math.round((chequeX - geom.chequeX) * 10) / 10,
        y: Math.round((chequeY - geom.chequeY) * 10) / 10,
      };

  const words = resolveWords(data);
  const wordFields = Object.values(template.fields)
    .filter((f) => f.kind === "words")
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const wordLines = splitWordsAcrossFields(words, wordFields);
  const wordLineFor = new Map<string, string>();
  wordFields.forEach((field, index) => wordLineFor.set(field.key, wordLines[index] ?? ""));

  const dateDigits = data.date ? safeDateDigits(data.date) : "";
  const payeeCheck = validatePayee(data.payee);
  const payeeText = payeeCheck.valid ? payeeCheck.payee : "";
  const amountCheck = validateAmount(data.amount);
  const amountText = amountCheck.valid && amountCheck.paisa > 0 ? `Rs. ${formatAmountDisplay(amountCheck.paisa)}` : "";

  const fields: LaidOutField[] = Object.values(template.fields)
    .sort((a, b) => a.y - b.y || a.x - b.x || a.key.localeCompare(b.key))
    .map((field) => {
      let text = "";
      switch (field.kind) {
        case "label":
          text = field.text ?? "";
          break;
        case "ac-payee":
          text = data.accountPayee ? field.text ?? "// A/C PAYEE ONLY //" : "";
          break;
        case "date-grid":
          text = dateDigits;
          break;
        case "payee":
          text = payeeText;
          break;
        case "words":
          text = wordLineFor.get(field.key) ?? "";
          break;
        case "amount":
          text = amountText;
          break;
        case "signature":
          text = field.text ?? field.label;
          break;
      }

      const fontSizePt = fitFontSize(text, {
        width: field.width,
        fontSize: field.fontSize,
        minFontSize: field.kind === "payee" ? Math.max(field.minFontSize ?? 7, 6) : field.minFontSize,
        letterSpacing: field.letterSpacing,
      });
      const heightMm = field.height ?? Math.max(fontSizePt * 0.352778 * 1.4, 2);

      return {
        key: field.key,
        label: field.label,
        kind: field.kind,
        xMm: chequeX + contentOffsetX + field.x,
        yMm: chequeY + contentOffsetY + field.y,
        widthMm: field.width,
        heightMm,
        fontSizePt,
        letterSpacingMm: field.letterSpacing ?? 0,
        align: alignOf(field),
        text,
        printable: isPrintableKind(field.kind),
      } satisfies LaidOutField;
    });

  // MICR SAFETY GUARD: verify that no printable field with actual text content
  // extends into the MICR band. This is the runtime enforcement that backs the
  // template-level safe zone validation — it catches any field whose Y-position
  // (after calibration) would place its bottom edge at or below the MICR safety
  // line. If a violation is found, enforceMicrSafety throws a MicrSecurityError
  // and the layout is never returned to the renderer.
  const micrElements = fields
    .filter((f) => f.printable && f.text !== "")
    .map((f) => ({ yMm: f.yMm, heightMm: f.heightMm }));
  enforceMicrSafety(micrElements, template.heightMm);

  return {
    mode,
    orientation: template.orientation,
    paperId: geom.paperId,
    pageW: geom.pageW,
    pageH: geom.pageH,
    chequeX,
    chequeY,
    chequeW: geom.chequeW,
    chequeH: geom.chequeH,
    calibration: applied,
    clamped: geom.calibratedClamped,
    fields,
    safeZones: template.safeZones ?? [],
  };
}

/** Fields that will actually reach paper for this layout. */
export function printableFields(layout: SheetLayout): LaidOutField[] {
  return layout.fields.filter((f) => f.printable && f.text !== "");
}

/** True when every printable field's rectangle stays inside the cheque box. */
export function fieldsWithinCheque(layout: SheetLayout): boolean {
  return layout.fields
    .filter((f) => f.printable && f.text !== "")
    .every(
      (f) =>
        f.xMm >= layout.chequeX - 0.05 &&
        f.yMm >= layout.chequeY - 0.05 &&
        f.xMm + f.widthMm <= layout.chequeX + layout.chequeW + 0.05 &&
        f.yMm + f.heightMm <= layout.chequeY + layout.chequeH + 0.05,
    );
}
