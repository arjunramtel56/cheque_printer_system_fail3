"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAllTemplates, getTemplate } from "@/lib/templates";
import type { BankTemplate, ProfileKey, Calibration } from "@/lib/types";
import { isDirectFeed } from "@/lib/types";
import {
  amountToWordsFromPaisa,
  formatDateDigits,
  formatAmountDisplay,
  validateAmount,
} from "@/lib/amountWords";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const PROFILE_LABELS: Record<ProfileKey, string> = {
  custom_short: "Direct Feed · Short Edge First (90°)",
  custom_long: "Direct Feed · Long Edge First (0°)",
  a4_vertical: "A4 Carrier · Portrait",
  a4_horizontal: "A4 Carrier · Landscape",
};

const SCALE = 2.4;
const A4_MM_WIDTH = 210;
const A4_MM_HEIGHT = 297;
const A4_LANDSCAPE_WIDTH = 297;
const A4_LANDSCAPE_HEIGHT = 210;

function fitFontSize(text: string, field: { fontSize?: number; minFontSize?: number; letterSpacing?: number; width: number }): number {
  const preferred = Number(field.fontSize || 10);
  const minimum = Number(field.minFontSize ?? Math.max(7, preferred - 3));
  const spacing = Number(field.letterSpacing ?? 0);
  const widthMm = Number(field.width);
  for (let size = preferred; size >= minimum; size -= 0.25) {
    const estimated = [...String(text)].length * (size * 0.352778 * 0.55 + spacing);
    if (estimated <= widthMm - 0.8) return Math.round(size * 100) / 100;
  }
  return minimum;
}

function splitWordsToLines(words: string, template: BankTemplate): [string, string] {
  const wordList = words.trim().split(/\s+/);
  const first: string[] = [];
  const second: string[] = [];
  for (const word of wordList) {
    const candidate = [...first, word].join(" ");
    if (!second.length && fitFontSize(candidate, template.fields.words1) > Number(template.fields.words1.minFontSize ?? 7)) {
      first.push(word);
    } else {
      second.push(word);
    }
  }
  return [first.join(" "), second.join(" ")];
}

// ---------------------------------------------------------------------------
// ChequePreview — Direct Feed mode (screen, scaled for readability)
// ---------------------------------------------------------------------------

interface PreviewProps {
  template: BankTemplate;
  date: string;
  payee: string;
  amount: string;
  amountWords: string;
  accountPayee: boolean;
  offsetX: number;
  offsetY: number;
}

function DirectFeedPreview({ template, date, payee, amount, amountWords, accountPayee, offsetX, offsetY }: PreviewProps) {
  const dateDigits = date ? formatDateDigits(date) : "";
  const amountPaisa = validateAmount(amount).paisa;
  const words = amountWords || (amountPaisa > 0 ? amountToWordsFromPaisa(amountPaisa) : "");
  const [words1, words2] = amountPaisa > 0 ? splitWordsToLines(words, template) : ["", ""];

  const calX = Number(offsetX ?? 0);
  const calY = Number(offsetY ?? 0);
  const displayW = Math.round(template.widthMm * SCALE);
  const displayH = Math.round(template.heightMm * SCALE);

  function pos(fieldX: number, fieldY: number) {
    return { x: (fieldX + calX) * SCALE, y: (fieldY + calY) * SCALE };
  }

  function renderField(key: string, text: string, coords: { x: number; y: number; width: number; fontSize?: number; letterSpacing?: number; align?: string }, extraClass = "") {
    if (!text) return null;
    const p = pos(coords.x, coords.y);
    const fs = fitFontSize(text, coords);
    const style: React.CSSProperties = {
      position: "absolute",
      left: `${p.x}px`,
      top: `${p.y}px`,
      width: `${coords.width * SCALE}px`,
      fontSize: `${fs * SCALE}px`,
      letterSpacing: `${(coords.letterSpacing ?? 0) * SCALE}px`,
      textAlign: (coords.align as any) || "left",
      fontFamily: '"Courier New", monospace',
      whiteSpace: "nowrap",
      overflow: "hidden",
      lineHeight: 1.1,
      color: "#111",
    };
    return <div key={key} className={`preview-field ${extraClass}`} style={style}>{text}</div>;
  }

  return (
    <div
      className="cheque-preview print-direct-feed"
      style={{ width: displayW, height: displayH }}
      role="img"
      aria-label={`Cheque preview for ${template.bankName} — Direct Feed mode`}
    >
      <div className="cheque-watermark" aria-hidden="true">PREVIEW</div>

      {/* Bank name */}
      <div style={{ position: "absolute", top: 4 * SCALE, left: 8 * SCALE, fontWeight: 800, fontSize: 11 * SCALE, color: "#111" }}>
        {template.bankName}
      </div>

      {/* A/C Payee only */}
      {accountPayee &&
        renderField("accountPayee", "// A/C PAYEE ONLY //", {
          x: 0,
          y: template.fields.accountPayee?.y ?? 16,
          width: template.widthMm,
          fontSize: template.fields.accountPayee?.fontSize ?? 9,
          align: "center",
        }, "account-payee-line")}

      {/* Date */}
      {dateDigits &&
        renderField("date", dateDigits, template.fields.date ?? { x: 128, y: 6, width: 52 })}

      {/* Pay label */}
      <div style={{
        position: "absolute",
        left: (template.structural?.payLabel?.x ?? 12) * SCALE,
        top: (template.structural?.payLabel?.y ?? 24) * SCALE,
        fontSize: 7 * SCALE,
        color: "#555",
      }}>
        Pay against this cheque to
      </div>

      {/* Payee */}
      {payee &&
        renderField("payee", payee, template.fields.payee ?? { x: 12, y: 28, width: 90 })}

      {/* Or Bearer */}
      <div style={{
        position: "absolute",
        left: (template.structural?.orBearer?.x ?? 100) * SCALE,
        top: (template.structural?.orBearer?.y ?? 24) * SCALE,
        fontSize: 7 * SCALE,
        color: "#555",
      }}>
        Or Bearer
      </div>

      {/* Amount in words */}
      {words1 && renderField("words1", words1, template.fields.words1 ?? { x: 12, y: 44, width: 150 })}
      {words2 && renderField("words2", words2, template.fields.words2 ?? { x: 12, y: 54, width: 150 })}

      {/* Numeric amount */}
      {amountPaisa > 0 &&
        renderField("amount", `Rs. ${formatAmountDisplay(amountPaisa)}`, template.fields.amount ?? { x: 110, y: 66, width: 65 }, "amount-field")}

      {/* Signature placeholders */}
      <SignatureBox x={template.structural?.sig1?.x ?? 12} y={template.structural?.sig1?.y ?? 78} w={template.structural?.sig1?.width ?? 55} h={template.structural?.sig1?.height ?? 8} scale={SCALE} />
      <SignatureBox x={template.structural?.sig2?.x ?? 72} y={template.structural?.sig2?.y ?? 78} w={template.structural?.sig2?.width ?? 55} h={template.structural?.sig2?.height ?? 8} scale={SCALE} />

      {/* MICR line */}
      <div style={{
        position: "absolute",
        bottom: 2 * SCALE,
        left: 8 * SCALE,
        fontSize: 6 * SCALE,
        color: "#444",
        letterSpacing: "0.12em",
        fontFamily: "monospace",
      }}>
        ⑆ 000000000 ⑈ 000000 ⑆ 00
      </div>
    </div>
  );
}

function A4CarrierPreview({ template, profile, date, payee, amount, amountWords, accountPayee, offsetX, offsetY }: PreviewProps & { profile: { x: number; y: number; pageWidth: number; pageHeight: number; rotate: 0 | 90 } }) {
  const dateDigits = date ? formatDateDigits(date) : "";
  const amountPaisa = validateAmount(amount).paisa;
  const words = amountWords || (amountPaisa > 0 ? amountToWordsFromPaisa(amountPaisa) : "");
  const [words1, words2] = amountPaisa > 0 ? splitWordsToLines(words, template) : ["", ""];

  const calX = Number(offsetX ?? 0);
  const calY = Number(offsetY ?? 0);

  const paperW = profile.pageWidth;
  const paperH = profile.pageHeight;
  const displayPW = Math.round(paperW * SCALE);
  const displayPH = Math.round(paperH * SCALE);

  // Cheque position on A4 paper in mm, with calibration
  const chequeX = profile.x + calX;
  const chequeY = profile.y + calY;
  const chequeW = template.widthMm;
  const chequeH = template.heightMm;

  function pos(fieldX: number, fieldY: number) {
    return { x: (chequeX + fieldX) * SCALE, y: (chequeY + fieldY) * SCALE };
  }

  function renderField(key: string, text: string, coords: { x: number; y: number; width: number; fontSize?: number; letterSpacing?: number; align?: string }, extraClass = "") {
    if (!text) return null;
    const p = pos(coords.x, coords.y);
    const fs = fitFontSize(text, coords);
    const style: React.CSSProperties = {
      position: "absolute",
      left: `${p.x}px`,
      top: `${p.y}px`,
      width: `${coords.width * SCALE}px`,
      fontSize: `${fs * SCALE}px`,
      letterSpacing: `${(coords.letterSpacing ?? 0) * SCALE}px`,
      textAlign: (coords.align as any) || "left",
      fontFamily: '"Courier New", monospace',
      whiteSpace: "nowrap",
      overflow: "hidden",
      lineHeight: 1.1,
      color: "#111",
    };
    return <div key={key} className={`preview-field ${extraClass}`} style={style}>{text}</div>;
  }

  return (
    <div
      className="cheque-preview print-a4-carrier"
      style={{ width: displayPW, height: displayPH }}
      role="img"
      aria-label={`A4 carrier preview for ${template.bankName}`}
    >
      {/* A4 paper background */}
      <div
        className="a4-paper"
        style={{
          position: "absolute",
          inset: 0,
          background: "#fff",
          border: "1px solid #bbb",
        }}
      />

      {/* Cheque area — positioned on A4 */}
      <div
        className="cheque-on-paper"
        style={{
          position: "absolute",
          left: `${chequeX * SCALE}px`,
          top: `${chequeY * SCALE}px`,
          width: `${chequeW * SCALE}px`,
          height: `${chequeH * SCALE}px`,
          background: "#fff",
          border: "1px solid #999",
          overflow: "hidden",
        }}
      >
        <div className="cheque-watermark" aria-hidden="true">PREVIEW</div>

        {/* Bank name */}
        <div style={{ position: "absolute", top: 4 * SCALE, left: 8 * SCALE, fontWeight: 800, fontSize: 11 * SCALE, color: "#111" }}>
          {template.bankName}
        </div>

        {/* A/C Payee only */}
        {accountPayee &&
          renderField("accountPayee", "// A/C PAYEE ONLY //", {
            x: 0,
            y: template.fields.accountPayee?.y ?? 16,
            width: template.widthMm,
            fontSize: template.fields.accountPayee?.fontSize ?? 9,
            align: "center",
          }, "account-payee-line")}

        {/* Date */}
        {dateDigits &&
          renderField("date", dateDigits, template.fields.date ?? { x: 128, y: 6, width: 52 })}

        {/* Pay label */}
        <div style={{
          position: "absolute",
          left: (template.structural?.payLabel?.x ?? 12) * SCALE,
          top: (template.structural?.payLabel?.y ?? 24) * SCALE,
          fontSize: 7 * SCALE,
          color: "#555",
        }}>
          Pay against this cheque to
        </div>

        {/* Payee */}
        {payee &&
          renderField("payee", payee, template.fields.payee ?? { x: 12, y: 28, width: 90 })}

        {/* Or Bearer */}
        <div style={{
          position: "absolute",
          left: (template.structural?.orBearer?.x ?? 100) * SCALE,
          top: (template.structural?.orBearer?.y ?? 24) * SCALE,
          fontSize: 7 * SCALE,
          color: "#555",
        }}>
          Or Bearer
        </div>

        {/* Amount in words */}
        {words1 && renderField("words1", words1, template.fields.words1 ?? { x: 12, y: 44, width: 150 })}
        {words2 && renderField("words2", words2, template.fields.words2 ?? { x: 12, y: 54, width: 150 })}

        {/* Numeric amount */}
        {amountPaisa > 0 &&
          renderField("amount", `Rs. ${formatAmountDisplay(amountPaisa)}`, template.fields.amount ?? { x: 110, y: 66, width: 65 }, "amount-field")}

        {/* Signature placeholders */}
        <SignatureBox x={template.structural?.sig1?.x ?? 12} y={template.structural?.sig1?.y ?? 78} w={template.structural?.sig1?.width ?? 55} h={template.structural?.sig1?.height ?? 8} scale={SCALE} />
        <SignatureBox x={template.structural?.sig2?.x ?? 72} y={template.structural?.sig2?.y ?? 78} w={template.structural?.sig2?.width ?? 55} h={template.structural?.sig2?.height ?? 8} scale={SCALE} />

        {/* MICR line */}
        <div style={{
          position: "absolute",
          bottom: 2 * SCALE,
          left: 8 * SCALE,
          fontSize: 6 * SCALE,
          color: "#444",
          letterSpacing: "0.12em",
          fontFamily: "monospace",
        }}>
          ⑆ 000000000 ⑈ 000000 ⑆ 00
        </div>
      </div>

      {/* Dimension labels */}
      <div style={{ position: "absolute", bottom: 4, right: 6, fontSize: 9 * SCALE, color: "#888", fontFamily: "monospace" }}>
        {paperW}×{paperH} mm
      </div>
    </div>
  );
}

function SignatureBox({ x, y, w, h, scale }: { x: number; y: number; w: number; h: number; scale: number }) {
  return (
    <div style={{
      position: "absolute",
      left: x * scale,
      top: y * scale,
      width: w * scale,
      height: h * scale,
    }}>
      <div style={{ borderBottom: "1px solid #111", width: "100%", marginTop: 6 * scale }} />
      <span style={{ fontSize: 6 * scale, color: "#555", textAlign: "center" as const, display: "block" }}>
        Authorized Signature
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PrintOutput — Actual-size rendering (1:1 mm, no SCALE)
// Used only for browser print, hidden on screen
// ---------------------------------------------------------------------------

interface PrintOutputProps {
  template: BankTemplate;
  date: string;
  payee: string;
  amount: string;
  amountWords: string;
  accountPayee: boolean;
  offsetX: number;
  offsetY: number;
  mode: ProfileKey;
  profile: { x: number; y: number; pageWidth: number; pageHeight: number; rotate: 0 | 90 };
}

function PrintOutput({ template, date, payee, amount, amountWords, accountPayee, offsetX, offsetY, mode, profile }: PrintOutputProps) {
  const dateDigits = date ? formatDateDigits(date) : "";
  const amountPaisa = validateAmount(amount).paisa;
  const words = amountWords || (amountPaisa > 0 ? amountToWordsFromPaisa(amountPaisa) : "");
  const [words1, words2] = amountPaisa > 0 ? splitWordsToLines(words, template) : ["", ""];

  const calX = Number(offsetX ?? 0);
  const calY = Number(offsetY ?? 0);
  const isDF = isDirectFeed(mode);

  // Direct Feed: cheque container = cheque size, fields positioned relative to cheque origin
  // A4 Carrier: outer container = A4 size, cheque inset positioned at profile.x/y + calibration
  if (isDF) {
    const pw = template.widthMm;
    const ph = template.heightMm;
    return (
      <div
        className="print-direct-feed"
        style={{
          width: `${pw}mm`,
          height: `${ph}mm`,
          position: "relative",
          background: "#fff",
          overflow: "hidden",
          fontFamily: '"Courier New", monospace',
          color: "#111",
        }}
      >
        {/* Bank name */}
        <div style={{ position: "absolute", top: "4mm", left: "8mm", fontWeight: 800, fontSize: "11pt", color: "#111" }}>
          {template.bankName}
        </div>

        {/* A/C Payee only */}
        {accountPayee && (
          <PrintField
            key="accountPayee"
            text="// A/C PAYEE ONLY //"
            x={0}
            y={template.fields.accountPayee?.y ?? 16}
            width={template.widthMm}
            fontSize={template.fields.accountPayee?.fontSize ?? 9}
            align="center"
            offsetX={calX}
            offsetY={calY}
          />
        )}

        {/* Date */}
        {dateDigits && (
          <PrintField
            key="date"
            text={dateDigits}
            x={(template.fields.date?.x ?? 128) + calX}
            y={(template.fields.date?.y ?? 6) + calY}
            width={template.fields.date?.width ?? 52}
            fontSize={template.fields.date?.fontSize}
            letterSpacing={template.fields.date?.letterSpacing}
          />
        )}

        {/* Pay label */}
        <div style={{
          position: "absolute",
          left: `${((template.structural?.payLabel?.x ?? 12) + calX)}mm`,
          top: `${((template.structural?.payLabel?.y ?? 24) + calY)}mm`,
          fontSize: "7pt",
          color: "#555",
        }}>
          Pay against this cheque to
        </div>

        {/* Payee */}
        {payee && (
          <PrintField
            key="payee"
            text={payee}
            x={(template.fields.payee?.x ?? 12) + calX}
            y={(template.fields.payee?.y ?? 28) + calY}
            width={template.fields.payee?.width ?? 90}
            fontSize={template.fields.payee?.fontSize}
          />
        )}

        {/* Or Bearer */}
        <div style={{
          position: "absolute",
          left: `${((template.structural?.orBearer?.x ?? 100) + calX)}mm`,
          top: `${((template.structural?.orBearer?.y ?? 24) + calY)}mm`,
          fontSize: "7pt",
          color: "#555",
        }}>
          Or Bearer
        </div>

        {/* Amount in words */}
        {words1 && (
          <PrintField
            key="words1"
            text={words1}
            x={(template.fields.words1?.x ?? 12) + calX}
            y={(template.fields.words1?.y ?? 44) + calY}
            width={template.fields.words1?.width ?? 150}
            fontSize={template.fields.words1?.fontSize}
            letterSpacing={template.fields.words1?.letterSpacing}
          />
        )}
        {words2 && (
          <PrintField
            key="words2"
            text={words2}
            x={(template.fields.words2?.x ?? 12) + calX}
            y={(template.fields.words2?.y ?? 54) + calY}
            width={template.fields.words2?.width ?? 150}
            fontSize={template.fields.words2?.fontSize}
            letterSpacing={template.fields.words2?.letterSpacing}
          />
        )}

        {/* Numeric amount */}
        {amountPaisa > 0 && (
          <PrintField
            key="amount"
            text={`Rs. ${formatAmountDisplay(amountPaisa)}`}
            x={(template.fields.amount?.x ?? 110) + calX}
            y={(template.fields.amount?.y ?? 66) + calY}
            width={template.fields.amount?.width ?? 65}
            fontSize={template.fields.amount?.fontSize}
          />
        )}

        {/* Signature boxes */}
        <PrintSignatureBox
          x={(template.structural?.sig1?.x ?? 12) + calX}
          y={(template.structural?.sig1?.y ?? 78) + calY}
          w={template.structural?.sig1?.width ?? 55}
          h={template.structural?.sig1?.height ?? 8}
        />
        <PrintSignatureBox
          x={(template.structural?.sig2?.x ?? 72) + calX}
          y={(template.structural?.sig2?.y ?? 78) + calY}
          w={template.structural?.sig2?.width ?? 55}
          h={template.structural?.sig2?.height ?? 8}
        />

        {/* MICR line */}
        <div style={{
          position: "absolute",
          bottom: "2mm",
          left: `${8 + calX}mm`,
          fontSize: "6pt",
          color: "#444",
          letterSpacing: "0.12em",
          fontFamily: "monospace",
        }}>
          ⑆ 000000000 ⑈ 000000 ⑆ 00
        </div>
      </div>
    );
  }

  // A4 Carrier mode
  const isPortrait = mode === "a4_vertical";
  const paperW = isPortrait ? A4_MM_WIDTH : A4_LANDSCAPE_WIDTH;
  const paperH = isPortrait ? A4_MM_HEIGHT : A4_LANDSCAPE_HEIGHT;
  const chequeX = profile.x + calX;
  const chequeY = profile.y + calY;

  return (
    <div
      className="print-a4-carrier"
      style={{
        width: `${paperW}mm`,
        height: `${paperH}mm`,
        position: "relative",
        background: "#fff",
        overflow: "hidden",
        fontFamily: '"Courier New", monospace',
        color: "#111",
      }}
    >
      {/* Cheque bounding box */}
      <div
        style={{
          position: "absolute",
          left: `${chequeX}mm`,
          top: `${chequeY}mm`,
          width: `${template.widthMm}mm`,
          height: `${template.heightMm}mm`,
          overflow: "hidden",
        }}
      >
        {/* Bank name */}
        <div style={{ position: "absolute", top: "4mm", left: "8mm", fontWeight: 800, fontSize: "11pt", color: "#111" }}>
          {template.bankName}
        </div>

        {/* A/C Payee only */}
        {accountPayee && (
          <PrintField
            key="accountPayee"
            text="// A/C PAYEE ONLY //"
            x={0}
            y={template.fields.accountPayee?.y ?? 16}
            width={template.widthMm}
            fontSize={template.fields.accountPayee?.fontSize ?? 9}
            align="center"
            offsetX={0}
            offsetY={0}
          />
        )}

        {/* Date */}
        {dateDigits && (
          <PrintField
            key="date"
            text={dateDigits}
            x={template.fields.date?.x ?? 128}
            y={template.fields.date?.y ?? 6}
            width={template.fields.date?.width ?? 52}
            fontSize={template.fields.date?.fontSize}
            letterSpacing={template.fields.date?.letterSpacing}
          />
        )}

        {/* Pay label */}
        <div style={{
          position: "absolute",
          left: `${template.structural?.payLabel?.x ?? 12}mm`,
          top: `${template.structural?.payLabel?.y ?? 24}mm`,
          fontSize: "7pt",
          color: "#555",
        }}>
          Pay against this cheque to
        </div>

        {/* Payee */}
        {payee && (
          <PrintField
            key="payee"
            text={payee}
            x={template.fields.payee?.x ?? 12}
            y={template.fields.payee?.y ?? 28}
            width={template.fields.payee?.width ?? 90}
            fontSize={template.fields.payee?.fontSize}
          />
        )}

        {/* Or Bearer */}
        <div style={{
          position: "absolute",
          left: `${template.structural?.orBearer?.x ?? 100}mm`,
          top: `${template.structural?.orBearer?.y ?? 24}mm`,
          fontSize: "7pt",
          color: "#555",
        }}>
          Or Bearer
        </div>

        {/* Amount in words */}
        {words1 && (
          <PrintField
            key="words1"
            text={words1}
            x={template.fields.words1?.x ?? 12}
            y={template.fields.words1?.y ?? 44}
            width={template.fields.words1?.width ?? 150}
            fontSize={template.fields.words1?.fontSize}
            letterSpacing={template.fields.words1?.letterSpacing}
          />
        )}
        {words2 && (
          <PrintField
            key="words2"
            text={words2}
            x={template.fields.words2?.x ?? 12}
            y={template.fields.words2?.y ?? 54}
            width={template.fields.words2?.width ?? 150}
            fontSize={template.fields.words2?.fontSize}
            letterSpacing={template.fields.words2?.letterSpacing}
          />
        )}

        {/* Numeric amount */}
        {amountPaisa > 0 && (
          <PrintField
            key="amount"
            text={`Rs. ${formatAmountDisplay(amountPaisa)}`}
            x={template.fields.amount?.x ?? 110}
            y={template.fields.amount?.y ?? 66}
            width={template.fields.amount?.width ?? 65}
            fontSize={template.fields.amount?.fontSize}
          />
        )}

        {/* Signature boxes */}
        <PrintSignatureBox
          x={template.structural?.sig1?.x ?? 12}
          y={template.structural?.sig1?.y ?? 78}
          w={template.structural?.sig1?.width ?? 55}
          h={template.structural?.sig1?.height ?? 8}
        />
        <PrintSignatureBox
          x={template.structural?.sig2?.x ?? 72}
          y={template.structural?.sig2?.y ?? 78}
          w={template.structural?.sig2?.width ?? 55}
          h={template.structural?.sig2?.height ?? 8}
        />

        {/* MICR line */}
        <div style={{
          position: "absolute",
          bottom: "2mm",
          left: "8mm",
          fontSize: "6pt",
          color: "#444",
          letterSpacing: "0.12em",
          fontFamily: "monospace",
        }}>
          ⑆ 000000000 ⑈ 000000 ⑆ 00
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PrintField — Renders a single text field at mm coordinates (for print output)
// ---------------------------------------------------------------------------

interface PrintFieldProps {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  letterSpacing?: number;
  align?: string;
  offsetX?: number;
  offsetY?: number;
}

function PrintField({ text, x, y, width, fontSize, letterSpacing, align, offsetX = 0, offsetY = 0 }: PrintFieldProps) {
  if (!text) return null;
  const fs = fitFontSize(text, { fontSize, minFontSize: undefined, letterSpacing, width });
  const finalX = x + offsetX;
  const finalY = y + offsetY;
  return (
    <div
      style={{
        position: "absolute",
        left: `${finalX}mm`,
        top: `${finalY}mm`,
        width: `${width}mm`,
        fontSize: `${fs}pt`,
        letterSpacing: `${letterSpacing ?? 0}mm`,
        textAlign: (align as any) || "left",
        fontFamily: '"Courier New", monospace',
        whiteSpace: "nowrap",
        overflow: "hidden",
        lineHeight: 1.1,
        color: "#111",
      }}
    >
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PrintSignatureBox — Signature line for print output
// ---------------------------------------------------------------------------

function PrintSignatureBox({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div style={{
      position: "absolute",
      left: `${x}mm`,
      top: `${y}mm`,
      width: `${w}mm`,
      height: `${h}mm`,
    }}>
      <div style={{ borderBottom: "1px solid #111", width: "100%", marginTop: "6mm" }} />
      <span style={{ fontSize: "6pt", color: "#555", textAlign: "center" as const, display: "block" }}>
        Authorized Signature
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CalibrationControl
// ---------------------------------------------------------------------------

interface CalibrationControlProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  disabled: boolean;
}

function CalibrationControl({ label, value, onChange, disabled }: CalibrationControlProps) {
  const step = 0.1;
  const increase = () => onChange(Math.round((value + step) * 10) / 10);
  const decrease = () => onChange(Math.round((value - step) * 10) / 10);
  const reset = () => onChange(0);

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
          min={-25}
          max={25}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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
// Template Selector
// ---------------------------------------------------------------------------

function BankTemplateSelector({
  templates,
  selectedId,
  onChange,
}: {
  templates: BankTemplate[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="template-select">Bank Template</label>
      <select
        id="template-select"
        required
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Select a Bank Template —</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.bankName}
          </option>
        ))}
      </select>
      <small>Pick the correct bank before entering cheque details.</small>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Print Validation
// ---------------------------------------------------------------------------

interface PrintValidationResult {
  valid: boolean;
  error: string;
}

function validatePrintData(
  template: BankTemplate | null,
  date: string,
  payee: string,
  amount: string,
  amountWords: string,
  printMode: ProfileKey,
  dfCalibration: Calibration,
  a4Calibration: Calibration,
): PrintValidationResult {
  if (!template) return { valid: false, error: "No bank template selected." };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { valid: false, error: "Invalid or missing date." };
  if (!payee.trim()) return { valid: false, error: "Payee name is required." };

  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) return { valid: false, error: amountValidation.error ?? "Invalid amount." };
  if (amountValidation.paisa === 0) return { valid: false, error: "Amount must be greater than zero." };

  if (!amountWords.trim()) return { valid: false, error: "Amount in words is required." };

  if (!printMode) return { valid: false, error: "Print mode not selected." };

  const cal = isDirectFeed(printMode) ? dfCalibration : a4Calibration;
  if (cal.x < -25 || cal.x > 25 || cal.y < -25 || cal.y > 25) {
    return { valid: false, error: "Calibration values must be between -25 and 25 mm." };
  }

  const profile = template.profiles[printMode];
  if (!profile) return { valid: false, error: "Print layout not available for selected mode." };

  return { valid: true, error: "" };
}

// ---------------------------------------------------------------------------
// Main Workspace
// ---------------------------------------------------------------------------

export default function Workspace() {
  const templates = useMemo(() => getAllTemplates(), []);
  const [templateId, setTemplateId] = useState("");
  const [date, setDate] = useState("");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [amountWords, setAmountWords] = useState("");
  const [accountPayee, setAccountPayee] = useState(true);
  const [printMode, setPrintMode] = useState<ProfileKey>("custom_short");

  // Independent calibrations per mode group
  const [dfCalibration, setDfCalibration] = useState<Calibration>({ x: 0, y: 0 });
  const [a4Calibration, setA4Calibration] = useState<Calibration>({ x: 0, y: 0 });

  const wordOverrideRef = useRef(false);
  const printStyleRef = useRef<HTMLStyleElement | null>(null);
  const printOutputRef = useRef<HTMLDivElement | null>(null);
  const [printError, setPrintError] = useState("");

  const template = useMemo(() => getTemplate(templateId) ?? null, [templateId]);
  const isDF = template ? isDirectFeed(printMode) : true;
  const currentCalibration = isDF ? dfCalibration : a4Calibration;
  const setCurrentCalibration = isDF ? setDfCalibration : setA4Calibration;

  const profile = template?.profiles[printMode];

  const autoWords = useMemo(() => {
    const v = validateAmount(amount);
    if (!v.valid || v.paisa === 0) return "";
    try {
      return amountToWordsFromPaisa(v.paisa);
    } catch {
      return "";
    }
  }, [amount]);

  const amountError = useMemo(() => {
    const v = validateAmount(amount);
    if (!v.valid) return v.error ?? "";
    return "";
  }, [amount]);

  // canPrint requires amount > 0 (so words will exist) and all other fields filled
  const hasAmount = useMemo(() => {
    const v = validateAmount(amount);
    return v.valid && v.paisa > 0;
  }, [amount]);

  const canPrint = templateId !== "" && date !== "" && payee.trim() !== "" && hasAmount && !amountError && amountWords.trim() !== "";

  // Auto-sync words when amount changes (only if user hasn't manually overridden)
  useEffect(() => {
    if (!wordOverrideRef.current && autoWords) {
      setAmountWords(autoWords);
    }
  }, [autoWords]);

  function handleAmountChange(raw: string) {
    wordOverrideRef.current = false;
    setAmount(raw);
  }

  function handleWordEdit(val: string) {
    wordOverrideRef.current = true;
    setAmountWords(val);
  }

  function setCalibrationX(val: number) {
    setCurrentCalibration((prev) => ({ ...prev, x: val }));
  }

  function setCalibrationY(val: number) {
    setCurrentCalibration((prev) => ({ ...prev, y: val }));
  }

  function handlePrint() {
    setPrintError("");

    const validationResult = validatePrintData(
      template,
      date,
      payee,
      amount,
      amountWords,
      printMode,
      dfCalibration,
      a4Calibration,
    );

    if (!validationResult.valid) {
      setPrintError(validationResult.error);
      return;
    }

    if (!template || !profile) return;

    const mode = printMode;
    const isPrintDF = isDirectFeed(mode);

    let css = "";
    if (isPrintDF) {
      const pw = template.widthMm;
      const ph = template.heightMm;
      const pageW = mode === "custom_short" ? ph : pw;
      const pageH = mode === "custom_short" ? pw : ph;
       css = `
@media print {
  @page {
    size: ${pageW.toFixed(1)}mm ${pageH.toFixed(1)}mm;
    margin: 0;
  }
  .print-output-screen {
    display: block !important;
  }
  .print-direct-feed {
    display: block !important;
    width: ${pw}mm !important;
    height: ${ph}mm !important;
  }
  .print-a4-carrier {
    display: none !important;
  }
}
      `;
    } else {
      const isPortrait = mode === "a4_vertical";
      const pageW = isPortrait ? A4_MM_WIDTH : A4_LANDSCAPE_WIDTH;
      const pageH = isPortrait ? A4_MM_HEIGHT : A4_LANDSCAPE_HEIGHT;
       css = `
@media print {
  @page {
    size: ${pageW}mm ${pageH}mm;
    margin: 0;
  }
  .print-output-screen {
    display: block !important;
  }
  .print-a4-carrier {
    display: block !important;
    width: ${pageW}mm !important;
    height: ${pageH}mm !important;
  }
  .print-direct-feed {
    display: none !important;
  }
}
      `;
    }

    // Remove old injected style
    if (printStyleRef.current) {
      printStyleRef.current.remove();
      printStyleRef.current = null;
    }

    // Inject new style before print
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    printStyleRef.current = style;

    // Sync the print output ref to current state
    if (printOutputRef.current) {
      // Force re-render by toggling key
      printOutputRef.current.dataset.key = `${templateId}-${mode}-${dfCalibration.x}-${dfCalibration.y}-${a4Calibration.x}-${a4Calibration.y}-${date}-${payee}-${amount}-${amountWords}-${accountPayee}`;
    }

    window.print();

    // Clean up after print dialog closes
    setTimeout(() => {
      if (printStyleRef.current) {
        printStyleRef.current.remove();
        printStyleRef.current = null;
      }
    }, 2000);
  }

  function handleClear() {
    setTemplateId("");
    setDate("");
    setPayee("");
    setAmount("");
    setAmountWords("");
    wordOverrideRef.current = false;
    setAccountPayee(true);
    setDfCalibration({ x: 0, y: 0 });
    setA4Calibration({ x: 0, y: 0 });
    setPrintError("");
  }

  function handleModeChange(newMode: ProfileKey) {
    setPrintMode(newMode);
    setPrintError("");
  }

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
                <h2>Cheque Details</h2>
              </div>
              <button type="button" className="text-button" onClick={handleClear}>
                Clear All
              </button>
            </div>

            <BankTemplateSelector templates={templates} selectedId={templateId} onChange={setTemplateId} />

            {/* Print Mode + Date */}
            <div className="two-columns">
              <div className="field">
                <label htmlFor="print-mode">Print Mode</label>
                <select
                  id="print-mode"
                  value={printMode}
                  onChange={(e) => handleModeChange(e.target.value as ProfileKey)}
                  disabled={!template}
                >
                  <optgroup label="Direct Feed (actual-size cheque)">
                    <option value="custom_short">{PROFILE_LABELS.custom_short}</option>
                    <option value="custom_long">{PROFILE_LABELS.custom_long}</option>
                  </optgroup>
                  <optgroup label="A4 Carrier (cheque on A4 sheet)">
                    <option value="a4_vertical">{PROFILE_LABELS.a4_vertical}</option>
                    <option value="a4_horizontal">{PROFILE_LABELS.a4_horizontal}</option>
                  </optgroup>
                </select>
                <small>Choose Direct Feed for blank cheques or A4 Carrier for test prints on paper.</small>
              </div>
              <div className="field">
                <label htmlFor="date-input">Cheque Date</label>
                <input
                  id="date-input"
                  type="date"
                  value={date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!template}
                />
              </div>
            </div>

            {/* Payee */}
            <div className="field">
              <label htmlFor="payee-input">Payee Name</label>
              <input
                id="payee-input"
                type="text"
                maxLength={100}
                placeholder="e.g. Ram Bahadur Thapa"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                disabled={!template}
              />
            </div>

            {/* Amount + Amount in Words */}
            <div className="two-columns">
              <div className="field">
                <label htmlFor="amount-input">Amount (NPR)</label>
                <div className="input-prefix">
                  <b>Rs.</b>
                  <input
                    id="amount-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    disabled={!template}
                  />
                </div>
                {amountError && <span className="error-state">{amountError}</span>}
                <small>Enter whole numbers or decimals up to 2 places.</small>
              </div>
              <div className="field">
                <label htmlFor="words-input">Amount in Words</label>
                <textarea
                  id="words-input"
                  rows={3}
                  maxLength={240}
                  placeholder="Auto-generated"
                  value={amountWords}
                  onChange={(e) => handleWordEdit(e.target.value)}
                  disabled={!template}
                />
                <small>You may edit the generated wording before printing.</small>
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
              />
              <label htmlFor="ac-payee" style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                Print <b>A/C PAYEE ONLY</b>
                <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {" "}· Adds a centred account-payee crossing
                </span>
              </label>
            </div>

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
                  onChange={setCalibrationX}
                  disabled={!template}
                />
                <CalibrationControl
                  label="Y Offset"
                  value={currentCalibration.y}
                  onChange={setCalibrationY}
                  disabled={!template}
                />
              </div>
              <small>
                Fine adjustment in 0.1 mm steps. ±25 mm range. Calibration is independent per print mode — changing A4 Carrier values will not affect Direct Feed calibration and vice versa.
              </small>
            </div>

            {/* Current calibration summary */}
            {template && (
              <div className="template-summary" aria-label="Selected template info">
                <div><span>Bank · </span><b>{template.bankName}</b></div>
                <div><span>Size · </span><b>{template.widthMm} × {template.heightMm} mm</b></div>
                <div><span>Mode · </span><b>{PROFILE_LABELS[printMode]}</b></div>
                {profile && (
                  <div><span>Page · </span><b>{profile.pageWidth} × {profile.pageHeight} mm</b></div>
                )}
                <div><span>Calibration · </span><b>X: {currentCalibration.x.toFixed(1)} mm · Y: {currentCalibration.y.toFixed(1)} mm</b></div>
                <div><span>Mode calibrations · </span>
                  <b>
                    DF X:{dfCalibration.x.toFixed(1)} Y:{dfCalibration.y.toFixed(1)} ·
                    A4 X:{a4Calibration.x.toFixed(1)} Y:{a4Calibration.y.toFixed(1)}
                  </b>
                </div>
              </div>
            )}

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="button" className="button secondary" disabled={!canPrint} onClick={handlePrint}>
                Print
              </button>
            </div>

            {printError && (
              <p className="error-state" style={{ marginTop: 8 }}>{printError}</p>
            )}
            {!canPrint && templateId !== "" && (
              <p className="error-state" style={{ marginTop: 8 }}>
                Fill all required fields (date, payee, amount) before printing.
              </p>
            )}
            {!template && (
              <p className="error-state" style={{ marginTop: 8 }}>
                Printing is disabled until a bank template is selected.
              </p>
            )}
          </form>

          {/* ---------- RIGHT: Preview (stays outside no-print scope during print) ---------- */}
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

            <div className="preview-stage">
              {template ? (
                isDirectFeed(printMode) ? (
                  <DirectFeedPreview
                    template={template}
                    date={date}
                    payee={payee}
                    amount={amount}
                    amountWords={amountWords}
                    accountPayee={accountPayee}
                    offsetX={dfCalibration.x}
                    offsetY={dfCalibration.y}
                  />
                ) : (
                  <A4CarrierPreview
                    template={template}
                    profile={profile!}
                    date={date}
                    payee={payee}
                    amount={amount}
                    amountWords={amountWords}
                    accountPayee={accountPayee}
                    offsetX={a4Calibration.x}
                    offsetY={a4Calibration.y}
                  />
                )
              ) : (
                <div
                  className="cheque-preview"
                  style={{ width: 456, height: 210 }}
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

            <div className="tip-card">
              <div className="tip-icon" aria-hidden="true">i</div>
              <div>
                <strong>Before printing a real cheque</strong>
                <p>
                  {isDirectFeed(printMode) ? (
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
          </section>
        </div>
      </div>

      {/* ================================================================
          PRINT OUTPUT — Hidden on screen, visible only during browser print.
          Renders at 1:1 mm scale for actual-size output.
          ================================================================ */}
      {template && profile && (
        <div
          ref={printOutputRef}
          data-mode={printMode}
          className="print-output-screen"
        >
          <PrintOutput
            template={template}
            date={date}
            payee={payee}
            amount={amount}
            amountWords={amountWords}
            accountPayee={accountPayee}
            offsetX={isDF ? dfCalibration.x : a4Calibration.x}
            offsetY={isDF ? dfCalibration.y : a4Calibration.y}
            mode={printMode}
            profile={profile}
          />
        </div>
      )}
    </>
  );
}
