// ---------------------------------------------------------------------------
// Nepal-specific print math engine — A4 overlay layout for multiple cheques.
//
// This module computes the positions of printable fields (payee, amount, amount
// in words) on an A4 carrier sheet, accounting for Nepal-specific realities:
//
//   - Standard Nepalese cheque stock: 190.5 x 88.9 mm (landscape).
//   - NRB CTS 2010 MICR band: bottom 7 mm of the cheque — never printed over.
//   - Field Y tolerance ranges vary per bank (see nepal/bankVariants.ts).
//   - Printer unprintable margins: 3-6 mm depending on inkjet/laser
//     (see nepal/printProfile.json).
//   - "Fit to Page" can scale output by ±2-8%; users must disable it.
//
// The function calculateA4OverlayPositions computes where each field of each
// cheque should land on an A4 page, given a user-selected orientation and number
// of cheques per page. It returns field-level coordinates in mm from the
// A4 page top-left origin.
//
// All positions are computed in cheque-local coordinates first (relative to
// each cheque's top-left corner on the A4 sheet), then translated to page-
// global coordinates. The MICR guard (lib/security/micrGuard.ts) runs on the
// final layout to enforce the hard boundary.
// ---------------------------------------------------------------------------

import type { BankTemplate, ProfileKey } from "@/lib/types";
import { MICR_BAND_MM } from "@/data/templates";

// ---------------------------------------------------------------------------
// Physical constants (from nepal/printProfile.json)
// ---------------------------------------------------------------------------

/** A4 paper dimensions in millimetres (portrait). */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/** A4 landscape swaps width and height. */
export const A4_LANDSCAPE_WIDTH_MM = A4_HEIGHT_MM;
export const A4_LANDSCAPE_HEIGHT_MM = A4_WIDTH_MM;

/** Standard Nepalese cheque stock: 190.5 x 88.9 mm (landscape). */
export const CHEQUE_WIDTH_MM = 190.5;
export const CHEQUE_HEIGHT_MM = 88.9;

/** MICR band height from NRB CTS 2010 (bottom 7mm of cheque). */
export const MICR_BAND_HEIGHT_MM = MICR_BAND_MM; // 7

/**
 * Safety margin below the MICR top to account for printer scaling.
 * "Fit to Page" can shift content down by ~2mm.
 */
export const MICR_SAFETY_MARGIN_MM = 2;

/**
 * The Y-coordinate (mm from cheque top) of the top edge of the MICR safety zone.
 * No printable field's bottom edge may reach this line.
 */
export const MICR_SAFETY_TOP_MM = CHEQUE_HEIGHT_MM - MICR_BAND_HEIGHT_MM - MICR_SAFETY_MARGIN_MM;

// ---------------------------------------------------------------------------
// Printer profile margins (from nepal/printProfile.json)
// ---------------------------------------------------------------------------

export interface PrinterMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Default unprintable margins for consumer printers common in Nepal. */
export const DEFAULT_INKJET_MARGINS: PrinterMargins = {
  top: 4,
  bottom: 5,
  left: 3,
  right: 4,
};

export const DEFAULT_LASER_MARGINS: PrinterMargins = {
  top: 5,
  bottom: 6,
  left: 4,
  right: 5,
};

// ---------------------------------------------------------------------------
// Overlay configuration
// ---------------------------------------------------------------------------

export type OverlayOrientation = "portrait" | "landscape";

export interface OverlayConfig {
  /** Which bank's cheque template to use. */
  bankKey: string;
  /** A4 orientation for the overlay page. */
  orientation: OverlayOrientation;
  /** How many cheques to lay out on the single A4 page. */
  chequesPerPage: number;
  /** User calibration offset for this printer (mm). */
  offsetX: number;
  /** User calibration offset for this printer (mm). */
  offsetY: number;
  /** Printer margins to compensate for (from printer profile). */
  printerMargins: PrinterMargins;
  /** Whether the user has confirmed physical verification. */
  verified: boolean;
}

export interface FieldPosition {
  /** Field key (e.g., "payee", "amount", "words1"). */
  key: string;
  /** Label for display. */
  label: string;
  /** X position on the A4 page in mm (from page top-left). */
  xMm: number;
  /** Y position on the A4 page in mm (from page top-left). */
  yMm: number;
  /** Width of the field in mm. */
  widthMm: number;
  /** Height of the field in mm. */
  heightMm: number;
  /** Field text to render. */
  text: string;
  /** Font size in points. */
  fontSizePt: number;
  /** Whether this field is MICR-safe. */
  micrSafe: boolean;
}

export interface ChequePlacement {
  /** Index of this cheque on the page (0-based). */
  index: number;
  /** Cheque-local X offset from page top-left (mm). */
  chequeX: number;
  /** Cheque-local Y offset from page top-left (mm). */
  chequeY: number;
  /** All printable field positions for this cheque. */
  fields: FieldPosition[];
  /** Whether this cheque's fields are all MICR-safe. */
  allMicrSafe: boolean;
}

export interface A4OverlayLayout {
  /** Page dimensions in mm. */
  pageWidth: number;
  pageHeight: number;
  /** Orientation of the A4 page. */
  orientation: OverlayOrientation;
  /** All cheque placements on this page. */
  cheques: ChequePlacement[];
  /** Whether ALL fields across ALL cheques are MICR-safe. */
  fullyMicrSafe: boolean;
}

// ---------------------------------------------------------------------------
// Layout math
// ---------------------------------------------------------------------------

/**
 * Compute the grid placement for N cheques on an A4 page.
 *
 * Portrait: 1 column, up to N rows stacked vertically.
 * Landscape: optimises for 2+ cheques per row (2x2 = 4 max, 3x1 = 3, etc.).
 *
 * Returns the (x, y) offset for the top-left corner of each cheque in
 * page-global coordinates.
 */
function computeChequeGrid(
  pageWidth: number,
  pageHeight: number,
  chequeWidth: number,
  chequeHeight: number,
  count: number,
  orientation: OverlayOrientation,
  margins: PrinterMargins,
): Array<{ x: number; y: number }> {
  const placements: Array<{ x: number; y: number }> = [];

  // Effective printable area after accounting for printer unprintable margins.
  const usableWidth = pageWidth - margins.left - margins.right;
  const usableHeight = pageHeight - margins.top - margins.bottom;

  if (orientation === "portrait") {
    // Stack vertically, centered horizontally.
    const cols = 1;
    const rows = Math.ceil(count / cols);
    const colGap = 0;
    const rowGap = Math.max(5, (usableHeight - rows * chequeHeight) / Math.max(rows - 1, 1));

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = margins.left + col * (chequeWidth + colGap) + (usableWidth - chequeWidth) / 2;
      const y = margins.top + row * (chequeHeight + rowGap);
      placements.push({ x, y });
    }
  } else {
    // Landscape: try to fit 2+ per row, centered on the page.
    const maxPerRow = Math.max(1, Math.floor((usableWidth + 5) / (chequeWidth + 5)));
    const cols = Math.min(count, maxPerRow);
    const rows = Math.ceil(count / cols);
    const colGap = cols > 1 ? Math.max(2, (usableWidth - cols * chequeWidth) / (cols - 1)) : 0;
    const rowGap = rows > 1 ? Math.max(5, (usableHeight - rows * chequeHeight) / (rows - 1)) : 0;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = margins.left + col * (chequeWidth + colGap);
      const y = margins.top + row * (chequeHeight + rowGap);
      placements.push({ x, y });
    }
  }

  return placements;
}

/**
 * Clamp a cheque placement so it stays within the printable area of the A4 page.
 */
function clampToPage(
  x: number,
  y: number,
  chequeWidth: number,
  chequeHeight: number,
  pageWidth: number,
  pageHeight: number,
  margins: PrinterMargins,
): { x: number; y: number } {
  const px = Math.max(margins.left, Math.min(x, pageWidth - margins.right - chequeWidth));
  const py = Math.max(margins.top, Math.min(y, pageHeight - margins.bottom - chequeHeight));
  return { x: px, y: py };
}

// ---------------------------------------------------------------------------
// MICR safety check
// ---------------------------------------------------------------------------

/**
 * Check whether a field element at (yMm, heightMm) in cheque-local coordinates
 * is safe from the MICR band. Returns true if the element's bottom edge is
 * above the MICR safety line.
 *
 * @param yMm       Y position of the element's top edge, in cheque-local mm.
 * @param heightMm  Height of the element in mm.
 */
export function isOverlayFieldMicrSafe(yMm: number, heightMm: number): boolean {
  return yMm + heightMm <= MICR_SAFETY_TOP_MM;
}

// ---------------------------------------------------------------------------
// Main public API
// ---------------------------------------------------------------------------

/**
 * Get the BankTemplate for a given bank key.
 */
import { getBank } from "@/lib/catalogue";
import { getAllActiveTemplates } from "@/lib/templates";
import { enforceMicrSafety } from "@/lib/security/micrGuard";

function resolveTemplate(bankKey: string): BankTemplate | null {
  const templates = getAllActiveTemplates();
  const template = templates.find((t) => t.bankId === bankKey || t.id === bankKey);
  return template ?? null;
}

/**
 * Calculate the complete A4 overlay layout for multiple cheques.
 *
 * This is the core math engine for the A4 overlay feature: it computes where
 * each cheque's printable fields (payee, amount, amount-in-words, date) should
 * land on an A4 page, after applying user calibration and printer margin
 * compensation.
 *
 * Security: the MICR guard runs on every field of every cheque. If any field's
 * bottom edge would reach the MICR safety line, `allMicrSafe` is false and
 * `fullyMicrSafe` is false, which MUST block PDF generation.
 *
 * @param template   The bank cheque template with field geometry.
 * @param config     Overlay configuration (orientation, count, calibration, etc.)
 * @param data       The cheque data to lay out (payee, amount, words, date).
 * @returns          Complete A4 overlay layout with all field positions.
 */
export function calculateA4OverlayLayout(
  template: BankTemplate,
  config: OverlayConfig,
  data: {
    date: string;
    payee: string;
    amount: string;
    amountWords: string;
    accountPayee: boolean;
  },
): A4OverlayLayout {
  const isLandscape = config.orientation === "landscape";
  const pageWidth = isLandscape ? A4_LANDSCAPE_WIDTH_MM : A4_WIDTH_MM;
  const pageHeight = isLandscape ? A4_LANDSCAPE_HEIGHT_MM : A4_HEIGHT_MM;

  // Compute grid of cheque placements.
  const gridPlacements = computeChequeGrid(
    pageWidth,
    pageHeight,
    CHEQUE_WIDTH_MM,
    CHEQUE_HEIGHT_MM,
    config.chequesPerPage,
    config.orientation,
    config.printerMargins,
  );

  // Build field positions for each cheque placement.
  const cheques: ChequePlacement[] = gridPlacements.map((placement, index) => {
    // Apply user calibration to the placement.
    const calibratedX = placement.x + config.offsetX;
    const calibratedY = placement.y + config.offsetY;

    // Clamp to page.
    const clamped = clampToPage(
      calibratedX,
      calibratedY,
      CHEQUE_WIDTH_MM,
      CHEQUE_HEIGHT_MM,
      pageWidth,
      pageHeight,
      config.printerMargins,
    );

    // Compute each printable field's position in page-global coordinates.
    const fields: FieldPosition[] = [];
    const fieldKeys = Object.values(template.fields).filter((f) => f.kind !== "signature" && f.kind !== "label");

    for (const field of fieldKeys) {
      const fieldHeightMm = field.height ?? Math.max((field.fontSize ?? 10) * 0.352778 * 1.4, 4);
      const yMm = clamped.y + field.y + (config.offsetY - (clamped.y - placement.y));
      const xMm = clamped.x + field.x + (config.offsetX - (clamped.x - placement.x));

      // Determine field text based on kind and data.
      let text = "";
      switch (field.kind) {
        case "payee":
          text = data.payee;
          break;
        case "amount":
          text = `Rs. ${data.amount}`;
          break;
        case "words":
          text = data.amountWords;
          break;
        case "date-grid":
          text = data.date;
          break;
        case "ac-payee":
          text = data.accountPayee ? (field.text ?? "// A/C PAYEE ONLY //") : "";
          break;
        case "label":
          text = field.text ?? "";
          break;
      }

      const micrSafe = isOverlayFieldMicrSafe(field.y, fieldHeightMm);

      fields.push({
        key: field.key,
        label: field.label,
        xMm,
        yMm,
        widthMm: field.width ?? 50,
        heightMm: fieldHeightMm,
        text,
        fontSizePt: field.fontSize ?? 10,
        micrSafe,
      });
    }

    const allMicrSafe = fields.every((f) => f.micrSafe || f.text === "");

    return {
      index,
      chequeX: clamped.x,
      chequeY: clamped.y,
      fields,
      allMicrSafe,
    };
  });

  // Overall MICR safety: all printable fields across all cheques must be safe.
  const printableFields = cheques
    .flatMap((c) => c.fields)
    .filter((f) => f.text !== "");

  let fullyMicrSafe = true;
  if (printableFields.length > 0) {
    const micrElements = printableFields.map((f) => ({
      yMm: f.yMm,
      heightMm: f.heightMm,
    }));

    try {
      enforceMicrSafety(micrElements, CHEQUE_HEIGHT_MM);
    } catch {
      fullyMicrSafe = false;
    }
  }

  return {
    pageWidth,
    pageHeight,
    orientation: config.orientation,
    cheques,
    fullyMicrSafe,
  };
}

/**
 * Resolve the BankTemplate for a bank key, throwing if none is found.
 * Used by the API route to fail-fast on unknown banks.
 */
export function requireTemplate(bankKey: string): BankTemplate {
  const template = resolveTemplate(bankKey);
  if (!template) {
    throw new Error(`No template found for bank key: ${bankKey}`);
  }
  return template;
}

/**
 * Load the Nepal print profile constants (printer margins, tolerances).
 * This is a pure data lookup — no side effects.
 */
export async function loadNepalPrintProfile(): Promise<typeof import("./nepal/printProfile.json")> {
  return await import("./nepal/printProfile.json", {
    with: { type: "json" },
  }).then((m) => m.default ?? m);
}
