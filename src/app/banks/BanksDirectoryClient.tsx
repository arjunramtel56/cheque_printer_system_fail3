"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useTranslation } from "@/lib/i18n";
import { VerificationBadge, TemplateMeta } from "@/components/dashboard/CatalogueBadges";
import { getTemplatesForBank, formatBankLabel } from "@/lib/catalogue";
import type { BankGroup, CatalogueSummary } from "@/lib/catalogue";
import type { Bank } from "@/lib/types";

export default function BanksDirectoryClient({
  groups,
  summary,
}: {
  groups: BankGroup[];
  summary: CatalogueSummary;
}) {
  const { t } = useTranslation();

  function classLabel(nrbClass: Bank["nrbClass"]): string {
    const labelKey = `class${nrbClass}` as const;
    return t(labelKey as string);
  }

  function classNote(nrbClass: Bank["nrbClass"]): string {
    const noteKey = `classNote${nrbClass}` as const;
    return t(noteKey as string);
  }

  return (
    <div className="card" style={{ margin: 16, maxWidth: "960px" }}>
      <nav style={{ marginBottom: 12, fontSize: "0.82rem", display: "flex", gap: 10, alignItems: "center" }}>
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
      <h1 style={{ fontSize: "1.2rem", margin: "0 0 4px 0" }}>{t("banksPageTitle")}</h1>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
        {summary.bankCount} {t("banksPageDesc1")} {summary.banksWithTemplates} {t("banksPageDesc2")} {summary.banksPending} {t("banksPageDesc3")} {summary.physicallyCalibratedCount} {t("banksPageDesc4")}, {summary.browserVerifiedCount} {t("banksPageDesc5")}
      </p>
      <p style={{ margin: "8px 0 16px 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
        {t("measuringNote")}
      </p>

      {groups.map((group) => (
        <section key={group.nrbClass} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <h2 style={{ fontSize: "0.95rem", margin: 0 }}>{classLabel(group.nrbClass)}</h2>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>{classNote(group.nrbClass)}</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: "0.85rem" }}>
            {group.banks.map((bank) => {
              const templates = getTemplatesForBank(bank.id);
              return (
                <li
                  key={bank.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "baseline",
                    flexWrap: "wrap",
                    fontSize: "0.85rem",
                    padding: "6px 8px",
                    borderRadius: "var(--radius-sm)",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <Link href={`/banks/${bank.id}`} className="text-button" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    {bank.name}
                  </Link>
                  {!bank.enabled && <span style={{ color: "var(--danger)", fontSize: "0.72rem" }}>{t("disabledTag")}</span>}
                  {bank.status !== "active" && (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}>{formatBankLabel(bank)}</span>
                  )}
                  {templates.length === 0 ? (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}>{t("templatePendingTag")}</span>
                  ) : (
                    templates.map((template) => (
                      <span key={template.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <Link href={`/banks/${bank.id}/cheque/${template.id}`} className="text-button" style={{ fontSize: "0.82rem" }}>
                          {template.label}
                        </Link>
                        <VerificationBadge status={template.verification?.status ?? "unverified"} />
                      </span>
                    ))
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

