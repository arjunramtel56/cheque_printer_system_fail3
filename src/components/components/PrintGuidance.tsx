// ---------------------------------------------------------------------------
// PrintGuidance — a visual guide that appears BEFORE print, showing the MICR
// safety zone and print area so operators never accidentally print over the
// pre-printed MICR band.
//
// Rendered on screen only (excluded from @media print in print.css — the
// .no-print class hides it). Uses CSS variables from globals.css so it adapts
// to both light and dark themes automatically.
//
// Security: this is a display-only aid. The actual MICR guard enforcement
// lives in lib/security/micrGuard.ts and runs during PDF generation.
// ---------------------------------------------------------------------------

import { useTranslation } from "@/lib/i18n";
import type { BankTemplate } from "@/lib/types";
import { MICR_BAND_MM } from "@/data/templates";
import { PREVIEW_SCALE } from "@/components/ChequeSheet";

export function PrintGuidance({ template }: { template: BankTemplate }) {
  const { t } = useTranslation();
  if (!template) return null;

  const chequeHeightMm = template.heightMm;
  const micrBandMm = MICR_BAND_MM;
  const micrPx = Math.round(chequeHeightMm * PREVIEW_SCALE * (micrBandMm / chequeHeightMm));
  const chequeHeightPx = Math.round(chequeHeightMm * PREVIEW_SCALE);

  return (
    <div className="tip-card" style={{ marginTop: 12 }}>
      <div className="tip-icon" aria-hidden="true">i</div>
      <div>
        <strong>{t("printInstructionTitle")}</strong>
        <p style={{ margin: "4px 0 6px 0", fontSize: "0.82rem" }}>
          {t("beforePrintingA4Carrier")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: "0.8rem", marginTop: 8 }}>
          <span style={{ color: "var(--text-muted)" }}>{t("micrSafetyTitle")}</span>
          <b style={{ color: "var(--danger)" }}>Bottom {micrBandMm} mm — NEVER printed</b>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: `${chequeHeightPx}px`,
            background: "repeating-linear-gradient(0deg, rgba(16,95,224,0.05) 0, rgba(16,95,224,0.05) 1px, transparent 1px, transparent 12px)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            marginTop: 6,
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: `${micrPx}px`,
              background: "rgba(213,42,42,0.15)",
              borderTop: "1px dashed var(--border-strong)",
            }}
          >
            <span style={{
              position: "absolute",
              top: "2px",
              left: "6px",
              fontSize: "0.6rem",
              color: "var(--danger)",
              fontFamily: "var(--font-mono)",
            }}>
              MICR — {t("neverPrinted")}
            </span>
          </div>
        </div>

        <p style={{ margin: "8px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {t("micrSafetyNote")}
        </p>
      </div>
    </div>
  );
}
