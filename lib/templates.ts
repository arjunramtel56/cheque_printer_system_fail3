import type { BankTemplate } from "./types.ts";
import { validateBankTemplate } from "./validation.ts";
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
  },
];

for (const t of BANK_TEMPLATES) assertNoTemplateErrors(t);

export function getTemplate(id: string): BankTemplate | undefined {
  return BANK_TEMPLATES.find((t) => t.id === id);
}

export function getAllTemplates(): BankTemplate[] {
  return BANK_TEMPLATES;
}
