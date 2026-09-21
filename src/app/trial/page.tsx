"use client";

import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useTranslation } from "@/lib/i18n";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import Link from "next/link";

export default function TrialPage() {
  const { daysLeft, isLoading, isActive, startedAt } = useTrialStatus();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="panel" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-muted)" }}>Checking trial status...</span>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="panel" style={{ maxWidth: 420, margin: "48px auto" }}>
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>{t("trialExpiredTitle")}</h2>
        <p style={{ marginBottom: 16, fontSize: "0.88rem", color: "var(--text-muted)" }}>
          {t("trialExpiredDesc")}
        </p>
        <Link href="/upgrade" className="button">
          {t("upgradeNow")}
        </Link>
      </div>
    );
  }

  const isExpiringSoon = daysLeft <= 3;
  const alertClass = isExpiringSoon ? "error-state" : "warning-state";
  let alertMessage: string;
  if (daysLeft === 0) {
    alertMessage = t("trialEndsToday");
  } else if (daysLeft === 1) {
    alertMessage = t("trialEndsTomorrow");
  } else {
    alertMessage = t("trialDaysLeft", daysLeft);
  }

  return (
    <div className="panel" style={{ maxWidth: 600, margin: "24px auto" }}>
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>{t("trialActiveTitle")}</h2>

      <div className={alertClass} style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 6 }}>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 500 }}>{alertMessage}</p>
      </div>

      {startedAt && (
        <p style={{ marginBottom: 16, fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {t("trialStartedOn", new Date(startedAt).toLocaleDateString())}
        </p>
      )}

      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        <div className="card">
          <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            {t("trialFeaturesTitle")}
          </h3>
          <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "0.85rem" }}>
            <li>{t("trialFeaturePrint")}</li>
            <li>{t("trialFeatureSave")}</li>
            <li>{t("trialFeatureMultiBank")}</li>
            <li style={{ opacity: 0.5 }}>{t("trialFeatureUnlimited", daysLeft)}</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/banks" className="button flex-1">
            {t("startPrinting")}
          </Link>
          <Link href="/upgrade" className="button secondary flex-1">
            {t("upgradeNow")}
          </Link>
        </div>
      </div>
    </div>
  );
}

