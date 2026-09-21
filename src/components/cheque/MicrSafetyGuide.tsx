"use client";

import { useLanguage } from "@/components/layout/LanguageProvider";
import { getChequeSize } from "@/lib/sizes";
import { STANDARD_SIZE_ID } from "@/data/templates";

export default function MicrSafetyGuide() {
  const { t, locale } = useLanguage();

  const standardSize = getChequeSize(STANDARD_SIZE_ID);
  const chequeSizeLabel = standardSize
    ? `${standardSize.widthMm} × ${standardSize.heightMm} mm`
    : "";

  const micrLabel = t("printOnlyThisAreaNe");
  const renderMicrLabel = micrLabel && micrLabel !== "printOnlyThisAreaNe"
    ? micrLabel
    : t("printOnlyThisArea");

  return (
    <section
      className="no-print"
      style={{
        background: "linear-gradient(135deg, color-mix(in srgb, var(--info) 4%, transparent) 0%, color-mix(in srgb, var(--info) 8%, transparent) 100%)",
        padding: "28px 20px",
        borderRadius: "var(--radius-md)",
        border: "1px solid color-mix(in srgb, var(--info) 20%, transparent)",
        margin: "20px auto",
        maxWidth: "720px",
      }}
      data-micr-safety-section
    >
      <div style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 8px 0", color: "var(--text-primary)" }}>
          {t("secureNepalCheques")}
        </h1>

        <p style={{ margin: "0 0 20px 0", fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
          {t("disclaimer")}
        </p>

        {/* Visual MICR guide — shows exact red zone (bottom 0.5" / 7mm) */}
        <div
          style={{
            position: "relative",
            margin: "0 auto 16px",
            width: "100%",
            maxWidth: "360px",
            height: "176px",
            background: "#fff",
            border: "2px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(16,24,40,0.08)",
          }}
          data-micr-guide="true"
        >
          {/* Cheque body area */}
          <div
            style={{
              position: "absolute",
              inset: "0",
              background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0, rgba(0,0,0,0.02) 4px, transparent 4px, transparent 8px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px",
            }}
          >
            <div style={{ width: "100%", maxWidth: "240px", textAlign: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px" }}>
                {chequeSizeLabel && (
                  <>
                    {t("chequeSizeLabel")}: {chequeSizeLabel}
                  </>
                )}
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {t("payeeLabel")}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {t("amountLabel")}
              </div>
            </div>
          </div>

          {/* MICR safety zone — red overlay at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "0.5in",
              minHeight: "7mm",
              background: "rgba(213, 42, 42, 0.10)",
              borderTop: "1px dashed var(--border-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "var(--danger)",
                fontFamily: "var(--font-mono)",
              }}
              data-micr-label="true"
            >
              {renderMicrLabel}
            </span>
          </div>

          {/* Safety label */}
          <div
            style={{
              position: "absolute",
              bottom: "2px",
              left: "6px",
              fontSize: "0.62rem",
              fontWeight: 700,
              color: "var(--danger)",
            }}
            data-micr-label="true"
          >
            {locale === "ne" ? "MICR ब्यान्ड — कुनै पनि स्याही नगर्नुहोस्" : "MICR BAND — DO NOT PRINT"}
          </div>
        </div>

        <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("setScale100")}
        </p>

        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            background: "color-mix(in srgb, var(--text-secondary) 4%, transparent)",
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}> {t("securityNoteTitle")} </strong>
          {t("securityNoteDesc")}
        </div>
      </div>
    </section>
  );
}

