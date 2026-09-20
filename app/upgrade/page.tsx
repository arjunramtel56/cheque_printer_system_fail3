"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function UpgradePage() {
  const { t } = useTranslation();

  return (
    <div className="panel" style={{ maxWidth: 640, margin: "32px auto" }}>
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.6rem", margin: "0 0 8px 0", color: "var(--text-primary)" }}>
          {t("upgradeTitle")}
        </h1>
        <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          {t("upgradeSubtitle")}
        </p>
      </div>

      <div style={{ display: "grid", gap: 20, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
            {t("fullFeaturesTitle")}
          </h3>
          <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: "0.85rem", lineHeight: 1.7 }}>
            <li>{t("featureUnlimited")}</li>
            <li>{t("featureAllBanks")}</li>
            <li>{t("featureExportCalibrations")}</li>
            <li>{t("featurePrioritySupport")}</li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
            {t("pricingTitle")}
          </h3>
          <div style={{ display: "grid", gap: 12, fontSize: "0.85rem" }}>
            <div style={{ padding: "12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginBottom: 4 }}>
                <span>{t("pricingPlanName")}</span>
                <span style={{ color: "var(--brand-blue)" }}>{t("pricingPlanPrice")}</span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {t("pricingPlanDesc")}
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: "color-mix(in srgb, var(--info) 4%, transparent)" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <strong>{t("supportEmail")}</strong>{" "}
            {t("upgradeContactNote")}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/trial" className="button secondary">
          {t("backToTrial")}
        </Link>
        <Link href="/" className="button">
          {t("backToWorkspace")}
        </Link>
      </div>
    </div>
  );
}
