// ---------------------------------------------------------------------------
// Bank template adapter — bridges the legacy BankTemplate type (from lib/types.ts)
// with the PDF overlay workflow's expected interface.
//
// The existing BankTemplate has a single `bankName` field (English). The overlay
// workflow expects bankNameEn / bankNameNe and a securityNote. This module
// derives the display shape the overlay needs from the real template data and
// the bank catalogue, without duplicating or contradicting the source of truth.
// ---------------------------------------------------------------------------

import type { BankTemplate } from "./types.ts";
import { getBank } from "@/lib/catalogue";
import { getAllActiveTemplates } from "@/lib/templates";

/**
 * The shape the PDF overlay form and components expect.
 * bankNameEn and bankNameNe are display strings; securityNote is a safety
 * advisory tied to each bank's template verification status.
 */
export interface BankTemplateOverlay {
  id: string;
  bankKey: string;
  bankNameEn: string;
  bankNameNe: string;
  bankName: string;
  label: string;
  widthMm: number;
  heightMm: number;
  orientation: "portrait" | "landscape";
  securityNote: string;
  micrBandHeightMm: number;
}

/** Maps a template verification status to a human-readable security advisory. */
function securityNoteFor(template: BankTemplate): string {
  const status = template.verification?.status ?? "unverified";
  switch (status) {
    case "physically-calibrated":
      return "Layout verified against a physical cheque sample. Printable fields are confirmed clear of the MICR band.";
    case "browser-verified":
      return "Layout verified on screen against a reference image. Print a test overlay on plain paper before using real cheque stock.";
    case "unverified":
    default:
      return "Layout has not been verified against a physical cheque. Print a test overlay on plain paper first and confirm alignment by eye.";
  }
}

/** Derive the Nepali display name. The bank catalogue stores English names;
 *  we map the well-known Class A banks to Devanagari for display, and fall
 *  back to the English name otherwise. */
function nepaliBankName(bankName: string, bankKey: string): string {
  const map: Record<string, string> = {
    nabil: "नभेल बैंक लिमिटेड",
    siddhartha: "सिधार्थ बैंक लिमिटेड",
    "nic-asia": "एनआइसी एसिया बैंक लिमिटेड",
    everest: "एभरेस्ट बैंक लिमिटेड",
    "bank-of-pokhara": "बैंक अफ़ पोखरा लिमिटेड",
    adbl: "एग्रीकल्चरल डेभलपमेन्ट बैंक लिमिटेड",
    citizens: "सिटिजन्स बैंक इन्टरन्याशनल लिमिटेड",
    "global-ime": "ग्लोबल आईएमई बैंक लिमिटेड",
    himalayan: "हिमालयन बैंक लिमिटेड",
    kumari: "कुमारी बैंक लिमिटेड",
    "laxmi-sunrise": "लक्ष्मी सुनराइज़ बैंक लिमिटेड",
    machhapuchchhre: "माछापुच्छ्रे बैंक लिमिटेड",
    "nepal-bank": "नेपाल बैंक लिमिटेड",
    "nepal-investment-mega": "नेपाल इन्वेस्टमेन्ट मेगा बैंक लिमिटेड",
    "nepal-sbi": "नेपाल एसबीआई बैंक लिमिटेड",
    nmb: "एनएमबी बैंक लिमिटेड",
    prabhu: "प्रभु बैंक लिमिटेड",
    prime: "प्राइम वाणिज्य बैंक लिमिटेड",
    "rastriya-banijya": "राष्ट्रिय व्यापार बैंक लिमिटेड",
    sanima: "सनिमा बैंक लिमिटेड",
    "standard-chartered": "स्ट्यान्डर्ड च्यार्टर्ड बैंक नेपाल लिमिटेड",
  };
  return map[bankKey] ?? "";
}

/** Convert a full BankTemplate into the overlay-friendly adapter shape. */
export function toOverlayTemplate(template: BankTemplate): BankTemplateOverlay {
  const bankKey = template.bankId;
  const bank = getBank(bankKey);
  const bankName = bank?.name ?? template.bankName;
  const bankNameNe = nepaliBankName(bankName, bankKey) || bankName;

  return {
    id: template.id,
    bankKey,
    bankNameEn: bankName,
    bankNameNe,
    bankName,
    label: template.label,
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    orientation: template.orientation,
    securityNote: securityNoteFor(template),
    micrBandHeightMm: 7,
  };
}

/**
 * Map of all active templates, keyed by template id, as overlay objects.
 * Consumers iterate this to populate the bank/template selector.
 */
export function getBankTemplateMap(): Record<string, BankTemplateOverlay> {
  const map: Record<string, BankTemplateOverlay> = {};
  for (const template of getAllActiveTemplates()) {
    const overlay = toOverlayTemplate(template);
    map[overlay.id] = overlay;
  }
  return map;
}
