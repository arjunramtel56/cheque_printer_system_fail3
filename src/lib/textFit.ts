// ---------------------------------------------------------------------------
// Text fitting for cheque fields.
//
// Preview and print MUST measure text identically, otherwise a payee that fits
// on screen can overflow on paper. Both paths call these functions, and the
// only difference between them is a linear scale factor applied by the renderer.
// ---------------------------------------------------------------------------

import type { BankTemplate, TemplateField } from "./types.ts";
import { MIN_PAYEE_FONT_SIZE } from "./amountWords.ts";

/** Hard floor so text is never rendered at an unreadable size, regardless of
 *  what a template asks for. */
export { MIN_PAYEE_FONT_SIZE };

/** Width of one character in mm for a given point size in the monospace face
 *  used for cheque output. */
const MM_PER_PT = 0.352778;
const MONOSPACE_ADVANCE_RATIO = 0.55;

/**
 * Largest font size (pt) at which `text` fits inside the field width.
 * Steps down by 0.25 pt to the field's floor (never below MIN_PAYEE_FONT_SIZE).
 */
export function fitFontSize(
  text: string,
  field: { width: number; fontSize?: number; minFontSize?: number; letterSpacing?: number },
): number {
  const preferred = Number(field.fontSize || 10);
  const rawMinimum = Number(field.minFontSize ?? Math.max(7, preferred - 3));
  const minimum = Math.max(rawMinimum, MIN_PAYEE_FONT_SIZE);
  const spacing = Number(field.letterSpacing ?? 0);
  const widthMm = Number(field.width);
  for (let size = preferred; size >= minimum; size -= 0.25) {
    const estimated = [...String(text)].length * (size * MM_PER_PT * MONOSPACE_ADVANCE_RATIO + spacing);
    if (estimated <= widthMm - 0.8) return Math.round(size * 100) / 100;
  }
  return minimum;
}

/** Estimated rendered width of a text run in mm (used by tests and the admin
 *  preview to warn about overflowing fields). */
export function estimateTextWidthMm(text: string, fontSizePt: number, letterSpacingMm = 0): number {
  return [...String(text)].length * (fontSizePt * MM_PER_PT * MONOSPACE_ADVANCE_RATIO + letterSpacingMm);
}

/**
 * Greedy wrap of amount-in-words across the template's word fields, preserving
 * the historical two-line behaviour (line 1 packed as far as it fits).
 */
export function splitWordsToLines(words: string, template: BankTemplate): [string, string] {
  const wordList = words.trim().split(/\s+/);
  const first: string[] = [];
  const second: string[] = [];
  const firstField = template.fields.words1;
  for (const word of wordList) {
    const candidate = [...first, word].join(" ");
    if (
      !second.length &&
      firstField &&
      fitFontSize(candidate, firstField) > Number(firstField.minFontSize ?? 7)
    ) {
      first.push(word);
    } else {
      second.push(word);
    }
  }
  return [first.join(" "), second.join(" ")];
}

/**
 * Generalised wrap for templates that declare any number of word lines, in the
 * order the fields are rendered. Falls back to two lines when the template has
 * the classic words1/words2 pair.
 */
export function splitWordsAcrossFields(words: string, fields: TemplateField[]): string[] {
  const trimmed = words.trim();
  if (fields.length === 0) return [];
  if (fields.length === 1) return [trimmed];
  const wordList = trimmed === "" ? [] : trimmed.split(/\s+/);
  const lines: string[] = fields.map(() => "");
  let lineIndex = 0;
  for (const word of wordList) {
    const candidate = lines[lineIndex] === "" ? word : `${lines[lineIndex]} ${word}`;
    const field = fields[lineIndex] as TemplateField;
    const floor = Number(field.minFontSize ?? 7);
    if (lineIndex < fields.length - 1 && fitFontSize(candidate, { ...field, minFontSize: floor + 0.5 }) > floor) {
      lines[lineIndex] = candidate;
    } else if (lineIndex < fields.length - 1) {
      lineIndex += 1;
      lines[lineIndex] = lines[lineIndex] === "" ? word : `${lines[lineIndex]} ${word}`;
    } else {
      lines[lineIndex] = candidate;
    }
  }
  return lines;
}
