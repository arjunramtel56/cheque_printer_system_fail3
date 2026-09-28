"use client";

import { ChequeTemplate } from "@/types";
import { CHEQUE, CROSSING_CENTER_Y_MM, FIELD_POSITIONS } from "@/lib/cheque/constants";

interface ChequePreviewProps {
  template: ChequeTemplate | null;
  fields: Record<string, string>;
  chequeImage?: string;
  className?: string;
}

/** Render the DDMMYYYY date as eight digits in individual boxes (print parity). */
function DateDigitBoxes({ value }: { value: string }) {
  const digits = value.replace(/\D/g, "").slice(0, FIELD_POSITIONS.date.boxes);
  return (
    <div
      className="cheque-date-row"
      style={{
        left: `${FIELD_POSITIONS.date.x}mm`,
        top: `${FIELD_POSITIONS.date.y}mm`,
        width: `${FIELD_POSITIONS.date.w}mm`,
        height: `${FIELD_POSITIONS.date.h}mm`,
      }}
    >
      {Array.from({ length: FIELD_POSITIONS.date.boxes }).map((_, i) => (
        <div key={i} className="cheque-date-box">
          {digits[i] ?? ""}
        </div>
      ))}
    </div>
  );
}

/** Amount box on the right of the beneficiary line (print parity). */
function AmountBox({ value }: { value: string }) {
  return (
    <div
      className="cheque-amount-box"
      style={{
        left: `${FIELD_POSITIONS.amountFig.x}mm`,
        top: `${FIELD_POSITIONS.amountFig.y}mm`,
        width: `${FIELD_POSITIONS.amountFig.w}mm`,
        height: `${FIELD_POSITIONS.amountFig.h}mm`,
      }}
    >
      {value}
    </div>
  );
}

export default function ChequePreview({
  template,
  fields,
  chequeImage,
  className = "",
}: ChequePreviewProps) {
  if (!template) {
    return (
      <div
        className={`cheque-preview-placeholder rounded-lg border-2 border-dashed border-slate-300 p-8 text-center ${className}`}
      >
        <p className="text-sm text-slate-500">Select a bank to see cheque preview</p>
      </div>
    );
  }

  const width = template.chequeWidth;
  const height = template.chequeHeight;

  return (
    <div
      className={`cheque-preview-container relative overflow-hidden bg-white shadow-xl ${className}`}
      style={{
        width: "100%",
        maxWidth: `${width}mm`,
        aspectRatio: `${width}/${height}`,
      }}
    >
      {template.backgroundUrl && (
        <img
          src={template.backgroundUrl}
          alt="Cheque background"
          className="absolute inset-0 z-1 h-full w-full object-fill"
        />
      )}
      {chequeImage && !template.backgroundUrl && (
        <img
          src={chequeImage}
          alt="Cheque background"
          className="absolute inset-0 z-1 h-full w-full object-fill"
        />
      )}

      {/* A/C PAYEE ONLY — horizontal band centred on the date line */}
      <div
        className="cheque-crossing"
        style={{
          top: `${(CROSSING_CENTER_Y_MM / CHEQUE.HEIGHT_MM) * 100}%`,
        }}
      >
        A/C PAYEE ONLY
      </div>

      {template.fields.map((field) => {
        const value = fields[field.field] || "";
        const shouldShow =
          field.field === "date" ||
          field.field === "payee" ||
          field.field === "amountWords" ||
          field.field === "amountNumber";

        if (!shouldShow && !value) return null;

        // Date renders as individual digit boxes; amount figure renders
        // inside a right-aligned box — both identical to print output.
        if (field.field === "date") {
          return <DateDigitBoxes key={field.id} value={value} />;
        }
        if (field.field === "amountNumber") {
          return <AmountBox key={field.id} value={value} />;
        }

        return (
          <div
            key={field.id}
            className="pointer-events-none absolute whitespace-nowrap font-mono"
            style={{
              left: `${field.x}%`,
              top: `${field.y}%`,
              fontSize: `${field.fontSize || 12}px`,
              fontFamily: field.fontFamily || "Arial, sans-serif",
              fontWeight: field.fontWeight || "normal",
              letterSpacing: field.letterSpacing ? `${field.letterSpacing}px` : "normal",
              textAlign: (field.align || "left") as any,
              color: field.color || "#000000",
              transform: field.rotation ? `rotate(${field.rotation}deg)` : "none",
              maxWidth: field.width ? `${field.width}%` : "auto",
              maxHeight: field.height ? `${field.height}%` : "auto",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {value}
          </div>
        );
      })}
    </div>
  );
}
