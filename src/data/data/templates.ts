// ---------------------------------------------------------------------------
// Seeded cheque templates.
//
// Every template is pure data: physical size (from the registry in
// lib/sizes.ts), declared orientation, fields with their own labels and kinds,
// non-printable safe zones, carrier placements and print configuration. The
// renderer, the print engine, the admin editor and the tests all read the same
// structures — no field key, caption or coordinate appears in a component.
//
// The five seeded layouts below keep the field geometry that was verified for
// these banks. Only Siddhartha Bank has a layout taken from a real reference
// sample; the others are marked `unverified` because their coordinates have
// never been checked against a physical cheque, and the UI says so.
// ---------------------------------------------------------------------------

import type {
  BankTemplate,
  FieldKind,
  Orientation,
  ProfileKey,
  PrintProfile,
  SafeZone,
  TemplateField,
  TemplateVerification,
} from "../lib/types.ts";
import { DEFAULT_SUPPORTED_MODES } from "../lib/types.ts";

/** Height of the reserved MICR/security band at the foot of a Nepalese cheque.
 *  The app never prints into this band — see lib/validation.ts. */
export const MICR_BAND_MM = 7;

/** Standard Nepalese cheque stock used by every seeded template. */
export const STANDARD_SIZE_ID = "standard-190x89";

export function micrSafeZone(widthMm: number, heightMm: number): SafeZone {
  return {
    id: "micr",
    label: `MICR / security band — reserved, never printed (bottom ${MICR_BAND_MM} mm)`,
    x: 0,
    y: heightMm - MICR_BAND_MM,
    width: widthMm,
    height: MICR_BAND_MM,
  };
}

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  minFontSize?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  height?: number;
  text?: string;
  editable?: boolean;
}

function fieldMap(specs: FieldSpec[]): Record<string, TemplateField> {
  const out: Record<string, TemplateField> = {};
  for (const spec of specs) {
    out[spec.key] = {
      key: spec.key,
      label: spec.label,
      kind: spec.kind,
      x: spec.x,
      y: spec.y,
      width: spec.width,
      fontSize: spec.fontSize,
      minFontSize: spec.minFontSize,
      letterSpacing: spec.letterSpacing,
      align: spec.align,
      height: spec.height,
      text: spec.text,
      editable: spec.editable,
      // Legacy hint kept in sync so older readers still work.
      render: spec.kind === "date-grid" ? "date-grid" : "text",
    };
  }
  return out;
}

/**
 * Direct-feed page box = the cheque itself; carrier modes = the paper box with
 * the cheque placed inside it. Values are the verified placements for the
 * standard 190.5 × 88.9 mm stock on A4.
 *
 * The cheque is centered on the A4 page in all carrier modes:
 *   Portrait:  (210 - 190.5) / 2 = 9.75 mm from left, (297 - 88.9) / 2 = 104.05 mm from top
 *   Landscape: (297 - 190.5) / 2 = 53.25 mm from left, (210 - 88.9) / 2 = 60.55 mm from top
 */
function standardProfiles(widthMm: number, heightMm: number): Record<ProfileKey, PrintProfile> {
  return {
    custom_short: { x: 0, y: 0, pageWidth: widthMm, pageHeight: heightMm },
    custom_long: { x: 0, y: 0, pageWidth: widthMm, pageHeight: heightMm },
    a4_vertical: { x: 9.75, y: 104.05, pageWidth: 210, pageHeight: 297 },
    a4_horizontal: { x: 53.25, y: 60.55, pageWidth: 297, pageHeight: 210 },
  };
}

interface TemplateSeed {
  id: string;
  bankId: string;
  bankName: string;
  label: string;
  orientation: Orientation;
  specs: FieldSpec[];
  verification: TemplateVerification;
  sizeId?: string;
  widthMm?: number;
  heightMm?: number;
}

function makeTemplate(seed: TemplateSeed): BankTemplate {
  const sizeId = seed.sizeId ?? STANDARD_SIZE_ID;
  const widthMm = seed.widthMm ?? 190.5;
  const heightMm = seed.heightMm ?? 88.9;
  return {
    id: seed.id,
    bankId: seed.bankId,
    bankName: seed.bankName,
    label: seed.label,
    sizeId,
    widthMm,
    heightMm,
    orientation: seed.orientation,
    fields: fieldMap(seed.specs),
    safeZones: [micrSafeZone(widthMm, heightMm)],
    profiles: standardProfiles(widthMm, heightMm),
    print: {
      calibration: { defaultX: 0, defaultY: 0 },
      supportedModes: [...DEFAULT_SUPPORTED_MODES],
    },
    verification: seed.verification,
    enabled: true,
  };
}

/** Fields that only exist for on-screen guidance or signing. Signature boxes
 *  are screen placeholders: the bank pre-prints its own signature panel, so the
 *  app must never ink that area. */
function signature(key: string, label: string, x: number, width: number, y: number): FieldSpec {
  return { key, label, kind: "signature", x, y, width, height: 6 };
}

function acPayee(y: number, widthMm: number): FieldSpec {
  return {
    key: "accountPayee",
    label: "A/C PAYEE ONLY crossing",
    kind: "ac-payee",
    x: 0,
    y,
    width: widthMm,
    fontSize: 9,
    minFontSize: 7,
    align: "center",
    text: "// A/C PAYEE ONLY //",
  };
}

export const TEMPLATE_SEEDS: BankTemplate[] = [
  makeTemplate({
    id: "siddhartha",
    bankId: "siddhartha",
    bankName: "Siddhartha Bank Limited",
    label: "Standard 190.5 × 88.9 landscape",
    orientation: "landscape",
    verification: {
      status: "browser-verified",
      verifiedAt: "2026-09-17",
      note: "Layout derived from the supplied Siddhartha Bank reference sample. Browser preview verified; physical printer verification still pending.",
    },
    specs: [
      { key: "bankNameLine", label: "Bank name", kind: "label", x: 8, y: 4, width: 90, fontSize: 11, text: "Siddhartha Bank Limited" },
      acPayee(16, 190.5),
      { key: "date", label: "Date", kind: "date-grid", x: 128, y: 6, width: 52, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, editable: true },
      { key: "payLabel", label: "\"Pay against this cheque to\" caption", kind: "label", x: 12, y: 24, width: 90, fontSize: 7, text: "Pay against this cheque to" },
      { key: "payee", label: "Payee name", kind: "payee", x: 12, y: 28, width: 90, fontSize: 10, minFontSize: 7, editable: true },
      { key: "orBearer", label: "\"Or Bearer\" caption", kind: "label", x: 100, y: 24, width: 40, fontSize: 7, text: "Or Bearer" },
      { key: "words1", label: "Amount in words (line 1)", kind: "words", x: 12, y: 44, width: 150, fontSize: 9, minFontSize: 6.5 },
      { key: "words2", label: "Amount in words (line 2)", kind: "words", x: 12, y: 54, width: 150, fontSize: 9, minFontSize: 6.5 },
      { key: "amount", label: "Numeric amount", kind: "amount", x: 110, y: 66, width: 65, fontSize: 11, minFontSize: 8 },
      signature("sig1", "Authorized signature (cheque stock panel)", 12, 55, 74),
      signature("sig2", "Authorized signature (cheque stock panel)", 72, 55, 74),
    ],
  }),

  makeTemplate({
    id: "nabil",
    bankId: "nabil",
    bankName: "Nabil Bank Limited",
    label: "Standard 190.5 × 88.9 landscape",
    orientation: "landscape",
    verification: { status: "unverified", note: "Seeded layout has never been checked against a physical Nabil cheque." },
    specs: [
      { key: "bankNameLine", label: "Bank name", kind: "label", x: 8, y: 4, width: 90, fontSize: 11, text: "Nabil Bank Limited" },
      acPayee(14, 190.5),
      { key: "date", label: "Date", kind: "date-grid", x: 130, y: 5, width: 50, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, editable: true },
      { key: "payLabel", label: "\"Pay against this cheque to\" caption", kind: "label", x: 10, y: 22, width: 95, fontSize: 7, text: "Pay against this cheque to" },
      { key: "payee", label: "Payee name", kind: "payee", x: 10, y: 26, width: 95, fontSize: 10, minFontSize: 7, editable: true },
      { key: "orBearer", label: "\"Or Bearer\" caption", kind: "label", x: 102, y: 22, width: 38, fontSize: 7, text: "Or Bearer" },
      { key: "words1", label: "Amount in words (line 1)", kind: "words", x: 10, y: 42, width: 148, fontSize: 9, minFontSize: 6.5 },
      { key: "words2", label: "Amount in words (line 2)", kind: "words", x: 10, y: 52, width: 148, fontSize: 9, minFontSize: 6.5 },
      { key: "amount", label: "Numeric amount", kind: "amount", x: 108, y: 64, width: 70, fontSize: 11, minFontSize: 8 },
      signature("sig1", "Authorized signature (cheque stock panel)", 10, 55, 74),
      signature("sig2", "Authorized signature (cheque stock panel)", 70, 55, 74),
    ],
  }),

  makeTemplate({
    id: "nicadc",
    bankId: "nic-asia",
    bankName: "NIC Asia Bank Limited",
    label: "Standard 190.5 × 88.9 landscape",
    orientation: "landscape",
    verification: { status: "unverified", note: "Seeded layout has never been checked against a physical NIC Asia cheque." },
    specs: [
      { key: "bankNameLine", label: "Bank name", kind: "label", x: 8, y: 4, width: 90, fontSize: 11, text: "NIC Asia Bank Limited" },
      acPayee(18, 190.5),
      { key: "date", label: "Date", kind: "date-grid", x: 126, y: 7, width: 54, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, editable: true },
      { key: "payLabel", label: "\"Pay against this cheque to\" caption", kind: "label", x: 14, y: 26, width: 88, fontSize: 7, text: "Pay against this cheque to" },
      { key: "payee", label: "Payee name", kind: "payee", x: 14, y: 30, width: 88, fontSize: 10, minFontSize: 7, editable: true },
      { key: "orBearer", label: "\"Or Bearer\" caption", kind: "label", x: 100, y: 26, width: 40, fontSize: 7, text: "Or Bearer" },
      { key: "words1", label: "Amount in words (line 1)", kind: "words", x: 14, y: 48, width: 145, fontSize: 9, minFontSize: 6.5 },
      { key: "words2", label: "Amount in words (line 2)", kind: "words", x: 14, y: 58, width: 145, fontSize: 9, minFontSize: 6.5 },
      { key: "amount", label: "Numeric amount", kind: "amount", x: 112, y: 70, width: 68, fontSize: 11, minFontSize: 8 },
      signature("sig1", "Authorized signature (cheque stock panel)", 14, 52, 74),
      signature("sig2", "Authorized signature (cheque stock panel)", 72, 52, 74),
    ],
  }),

  makeTemplate({
    id: "everest",
    bankId: "everest",
    bankName: "Everest Bank Limited",
    label: "Standard 190.5 × 88.9 landscape",
    orientation: "landscape",
    verification: { status: "unverified", note: "Seeded layout has never been checked against a physical Everest Bank cheque." },
    specs: [
      { key: "bankNameLine", label: "Bank name", kind: "label", x: 8, y: 4, width: 90, fontSize: 11, text: "Everest Bank Limited" },
      acPayee(12, 190.5),
      { key: "date", label: "Date", kind: "date-grid", x: 132, y: 4, width: 48, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, editable: true },
      { key: "payLabel", label: "\"Pay against this cheque to\" caption", kind: "label", x: 8, y: 21, width: 92, fontSize: 7, text: "Pay against this cheque to" },
      { key: "payee", label: "Payee name", kind: "payee", x: 8, y: 25, width: 92, fontSize: 10, minFontSize: 7, editable: true },
      { key: "orBearer", label: "\"Or Bearer\" caption", kind: "label", x: 100, y: 21, width: 40, fontSize: 7, text: "Or Bearer" },
      { key: "words1", label: "Amount in words (line 1)", kind: "words", x: 8, y: 40, width: 152, fontSize: 9, minFontSize: 6.5 },
      { key: "words2", label: "Amount in words (line 2)", kind: "words", x: 8, y: 50, width: 152, fontSize: 9, minFontSize: 6.5 },
      { key: "amount", label: "Numeric amount", kind: "amount", x: 105, y: 62, width: 75, fontSize: 11, minFontSize: 8 },
      signature("sig1", "Authorized signature (cheque stock panel)", 8, 55, 74),
      signature("sig2", "Authorized signature (cheque stock panel)", 68, 55, 74),
    ],
  }),

  makeTemplate({
    id: "bankpokhara",
    bankId: "bank-of-pokhara",
    bankName: "Bank of Pokhara Limited",
    label: "Standard 190.5 × 88.9 landscape",
    orientation: "landscape",
    verification: { status: "unverified", note: "Seeded layout has never been checked against a physical Bank of Pokhara cheque." },
    specs: [
      { key: "bankNameLine", label: "Bank name", kind: "label", x: 8, y: 4, width: 90, fontSize: 11, text: "Bank of Pokhara Limited" },
      acPayee(20, 190.5),
      { key: "date", label: "Date", kind: "date-grid", x: 125, y: 8, width: 55, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, editable: true },
      { key: "payLabel", label: "\"Pay against this cheque to\" caption", kind: "label", x: 10, y: 28, width: 90, fontSize: 7, text: "Pay against this cheque to" },
      { key: "payee", label: "Payee name", kind: "payee", x: 10, y: 32, width: 90, fontSize: 10, minFontSize: 7, editable: true },
      { key: "orBearer", label: "\"Or Bearer\" caption", kind: "label", x: 100, y: 28, width: 40, fontSize: 7, text: "Or Bearer" },
      { key: "words1", label: "Amount in words (line 1)", kind: "words", x: 10, y: 50, width: 140, fontSize: 9, minFontSize: 6.5 },
      { key: "words2", label: "Amount in words (line 2)", kind: "words", x: 10, y: 60, width: 140, fontSize: 9, minFontSize: 6.5 },
      { key: "amount", label: "Numeric amount", kind: "amount", x: 110, y: 72, width: 70, fontSize: 11, minFontSize: 8 },
      signature("sig1", "Authorized signature (cheque stock panel)", 10, 52, 74),
      signature("sig2", "Authorized signature (cheque stock panel)", 70, 52, 74),
    ],
  }),
];

/** Field kinds the renderer understands, in draw order for equal coordinates. */
export const FIELD_RENDER_ORDER: FieldKind[] = [
  "label",
  "ac-payee",
  "date-grid",
  "payee",
  "words",
  "amount",
  "signature",
];
