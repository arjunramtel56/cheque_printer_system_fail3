"use client";

import { ChequeTemplate } from "@/types";

interface ChequePreviewProps {
  template: ChequeTemplate | null;
  fields: Record<string, string>;
  chequeImage?: string;
  className?: string;
}

export default function ChequePreview({ template, fields, chequeImage, className = "" }: ChequePreviewProps) {
  if (!template) {
    return (
      <div className={`cheque-preview-placeholder rounded-lg border-2 border-dashed border-slate-300 p-8 text-center ${className}`}>
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
      {chequeImage && (
        <img
          src={chequeImage}
          alt="Cheque background"
          className="absolute inset-0 z-1 h-full w-full object-fill"
        />
      )}
      <div className="absolute inset-0 z-2 flex flex-col justify-between p-2">
        {template.fields.map((field) => {
          const value = fields[field.field] || "";
          const shouldShow = field.field === "date" || field.field === "payee" || field.field === "amountWords" || field.field === "amountNumber";

          if (!shouldShow && !value) return null;

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
    </div>
  );
}
