// ---------------------------------------------------------------------------
// Domain types for the Nepal cheque printing engine.
//
// The model is deliberately split into two concepts that the previous version
// conflated:
//
//   Bank          — an institution (name, NRB class, code, status)
//   ChequeTemplate— a printable cheque layout belonging to exactly one bank
//                   (physical size, orientation, fields, safe zones, profiles)
//
// Physical dimensions always originate from the millimetre registries in
// lib/sizes.ts; a template references a size by id AND denormalizes widthMm /
// heightMm so validation can prove the two can never drift apart.
// ---------------------------------------------------------------------------

export type ProfileKey = "custom_short" | "custom_long" | "a4_vertical" | "a4_horizontal";

/** Physical orientation of the cheque/page box. Never a CSS transform. */
export type Orientation = "portrait" | "landscape";

/** Nepal Rastra Bank institution classes. */
export type NrbClass = "A" | "B" | "C" | "D";

export type BankStatus = "active" | "merged" | "defunct" | "inactive";

/** How far a template has been validated. Only physically-calibrated implies
 *  a real sheet of cheque stock has been measured. */
export type VerificationStatus = "unverified" | "browser-verified" | "physically-calibrated";

/** What a field renders as. The renderer switches on this — never on a key. */
export type FieldKind =
  | "date-grid"
  | "payee"
  | "words"
  | "amount"
  | "ac-payee"
  | "label"
  | "signature"
  | "reference";

export interface Calibration {
  x: number;
  y: number;
}

export interface ChequeFieldCoords {
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  minFontSize?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  /** Legacy render hint kept for backwards compatibility. */
  render?: "text" | "date-grid";
  height?: number;
}

/** A printable field: geometry plus everything the renderer needs. */
export interface TemplateField extends ChequeFieldCoords {
  key: string;
  label: string;
  kind: FieldKind;
  /** Static text for kind === "label". */
  text?: string;
  /** Only these fields take user input; the rest are derived or fixed. */
  editable?: boolean;
}

export interface StructuralPosition {
  x: number;
  y: number;
  width: number;
  height?: number;
}

export interface PrintProfile {
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
}

export interface PrintConfig {
  calibration: {
    defaultX: number;
    defaultY: number;
  };
  supportedModes: ProfileKey[];
}

export const DEFAULT_SUPPORTED_MODES: ProfileKey[] = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];

// ---------------------------------------------------------------------------
// Size registries
// ---------------------------------------------------------------------------

/** Physical cheque stock. Dimensions are the truth; orientation is declared
 *  per template because the same stock can be fed either way. */
export interface ChequeSize {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  /** True for built-in sizes that admin templates may reference. */
  builtin?: boolean;
}

/** Carrier/printer paper. Independent from the cheque's own size. */
export interface PaperSize {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  orientation: Orientation;
}

// ---------------------------------------------------------------------------
// Safe zones
// ---------------------------------------------------------------------------

/** A region of the cheque that must never receive printed content — the MICR
 *  band is pre-printed by the bank and printing over it can invalidate a
 *  cheque. Fields overlapping a safe zone are rejected by validation. */
export interface SafeZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Banks
// ---------------------------------------------------------------------------

export interface Bank {
  /** URL-safe identifier, e.g. "siddhartha". */
  id: string;
  name: string;
  nrbClass: NrbClass;
  /** NRB licence / SWIFT-style identifier where published. */
  code?: string;
  status: BankStatus;
  /** Enabled banks are selectable by users; disabled banks stay in the
   *  catalogue for admin reference but never appear in the print workflow. */
  enabled: boolean;
  /** Ids of cheque templates belonging to this bank. This is derived by
   *  lib/catalogue.ts from each template's `bankId` — never hand-maintained —
   *  so a bank and its templates can never drift apart. */
  templateIds: string[];
  /** Bank this institution merged into, when status === "merged". */
  supersededBy?: string;
  /** ISO date the catalogue entry was last checked against an NRB source. */
  verifiedAt?: string;
}

// ---------------------------------------------------------------------------
// Cheque templates
// ---------------------------------------------------------------------------

export interface TemplateVerification {
  status: VerificationStatus;
  verifiedAt?: string;
  note?: string;
}

export interface BankTemplate {
  id: string;
  /** Owning bank id (lib/catalogue resolves bank <-> template both ways). */
  bankId: string;
  /** Denormalized display name, kept so a template is self-describing. */
  bankName: string;
  /** Human label for this layout, e.g. "Standard 190.5 × 88.9 landscape". */
  label: string;
  /** Registry id of the physical cheque stock. */
  sizeId: string;
  /** Resolved size, mirrored from the registry (validated for consistency). */
  widthMm: number;
  heightMm: number;
  /** Declared physical orientation of the cheque box. */
  orientation: Orientation;
  fields: Record<string, TemplateField>;
  structural?: Record<string, StructuralPosition>;
  safeZones?: SafeZone[];
  profiles: Record<ProfileKey, PrintProfile>;
  print: PrintConfig;
  verification: TemplateVerification;
  enabled: boolean;
}

export const DIRECT_FEED_MODES: ProfileKey[] = ["custom_short", "custom_long"];
export const A4_CARRIER_MODES: ProfileKey[] = ["a4_vertical", "a4_horizontal"];

export function isDirectFeed(mode: ProfileKey): boolean {
  return DIRECT_FEED_MODES.includes(mode);
}

export function isA4Carrier(mode: ProfileKey): boolean {
  return A4_CARRIER_MODES.includes(mode);
}

/** Paper registry id used by a print mode. Direct feed prints on the cheque
 *  itself, so the paper id is the cheque size id. */
export function paperIdForMode(mode: ProfileKey, chequeSizeId: string): string {
  if (isDirectFeed(mode)) return chequeSizeId;
  return mode === "a4_vertical" ? "a4-portrait" : "a4-landscape";
}

/** Map a field kind to whether it is printed content (subject to safe-zone
 *  rules) or a screen-only placeholder. */
export function isPrintableKind(kind: FieldKind): boolean {
  return kind !== "signature";
}
