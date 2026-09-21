"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "@/lib/i18n";
import { formatBankLabel } from "@/lib/catalogue";
import { VerificationBadge, TemplateMeta } from "@/components/CatalogueBadges";
import type { Bank, BankTemplate } from "@/lib/types";

const CLASS_LABEL: Record<Bank["nrbClass"], string> = {
  A: "classA",
  B: "classB",
  C: "classC",
  D: "classD",
};

export default function BankDetailClient({
  bank,
  selectable,
}: {
  bank: Bank;
  selectable: BankTemplate[];
}) {
  const { t } = useTranslation();

  return (
    <div className="card" style={{ margin: 16, maxWidth: "720px" }}>
      <nav style={{ display: "flex", gap: 10, fontSize: "0.82rem", marginBottom: 8, alignItems: "center" }}>
        <Link href="/" className="text-button">
          {t("navHome")}
        </Link>
        <span style={{ color: "var(--text-muted)" }}> / </span>
        <Link href="/banks" className="text-button">
          {t("navBanks")}
        </Link>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </nav>

      <h1 style={{ fontSize: "1.3rem", margin: "4px 0 2px 0", color: "var(--text-primary)" }}>{bank.name}</h1>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
        {t(CLASS_LABEL[bank.nrbClass] ?? "classA")} · {t("statusLabel")} {bank.status}
        {bank.code ? ` · ${t("bankCodeLabel")} ${bank.code}` : ""} · {formatBankLabel(bank)}
      </p>
      {!bank.enabled && (
        <p className="error-state" style={{ marginTop: 8 }}>
          {t("bankDisabledNote")}
        </p>
      )}
      {bank.status === "merged" && (
        <p style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {t("mergedBankNote")}
        </p>
      )}

      <h2 style={{ fontSize: "0.95rem", margin: "16px 0 6px 0" }}>{t("chequeTemplatesHeading")}</h2>
      {selectable.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {t("noTemplatesForBank")}
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
          {selectable.map((template) => (
            <li key={template.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <Link href={`/banks/${bank.id}/cheque/${template.id}`} className="button small">
                  {t("printTemplateBtn", template.label)}
                </Link>
                <VerificationBadge status={template.verification?.status ?? "unverified"} />
              </div>
              <TemplateMeta template={template} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
