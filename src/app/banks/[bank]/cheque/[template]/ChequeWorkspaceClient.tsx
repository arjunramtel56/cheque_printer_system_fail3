"use client";

import Link from "next/link";
import Workspace from "@/components/dashboard/Workspace";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useTranslation } from "@/lib/i18n";
import { formatBankLabel } from "@/lib/catalogue";
import { VerificationBadge, TemplateMeta } from "@/components/dashboard/CatalogueBadges";
import type { Bank, BankTemplate } from "@/lib/types";

export default function ChequeWorkspaceClient({
  bank,
  template,
}: {
  bank: Bank;
  template: BankTemplate;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="no-print" style={{ padding: "12px 16px 0 16px" }}>
        <nav style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: "0.82rem" }}>
          <Link href="/" className="text-button">
            {t("navHome")}
          </Link>
          <span style={{ color: "var(--text-muted)" }}> / </span>
          <Link href="/banks" className="text-button">
            {t("navBanks")}
          </Link>
          <span style={{ color: "var(--text-muted)" }}> / </span>
          <Link href={`/banks/${bank.id}`} className="text-button">
            {bank.name}
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <Link href="/overlay" className="text-button" style={{ fontSize: "0.78rem" }}>
              Overlay Tool
            </Link>
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <h1 style={{ fontSize: "1.15rem", margin: 0, color: "var(--text-primary)" }}>{bank.name}</h1>
          <VerificationBadge status={template.verification?.status ?? "unverified"} />
        </div>
        <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {formatBankLabel(bank)} · {template.label}
        </p>
        <TemplateMeta template={template} />
      </div>
      <Workspace bankId={bank.id} templateId={template.id} />
    </>
  );
}
