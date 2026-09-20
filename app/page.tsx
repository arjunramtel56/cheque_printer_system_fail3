"use client";

import Link from "next/link";
import Workspace from "@/components/Workspace";
import MicrSafetyGuide from "@/components/MicrSafetyGuide";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import TrustBadge from "@/components/TrustBadge";
import { useTranslation } from "@/lib/i18n";
import { getCatalogueSummary, getSelectableBanks } from "@/lib/catalogue";

/**
 * Landing page — the guided workflow:
 *
 *   Select bank -> select template -> enter data -> choose print mode
 *   -> preview -> calibrate if needed -> print
 *
 * The same workspace is also reachable as a deep link at
 * /banks/[bank]/cheque/[template].
 */
export default function HomePage() {
  const { t } = useTranslation();
  const banks = getSelectableBanks();
  const summary = getCatalogueSummary();

  return (
    <>
      <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 100, display: "flex", gap: 10 }}>
        <ThemeToggle />
        <LanguageToggle />
        <Link href="/banks" className="text-button" style={{ fontSize: "0.78rem", opacity: 0.6 }} aria-label={t("navBanks")}>
          {t("navBanks")}
        </Link>
        <Link href="/admin" className="text-button" style={{ fontSize: "0.78rem", opacity: 0.6 }} aria-label={t("navAdmin")}>
          {t("navAdmin")}
        </Link>
      </div>

      <TrustBadge />

      <MicrSafetyGuide />

      <Workspace />

      <section className="no-print panel" style={{ margin: "16px", padding: 16 }}>
        <h2 style={{ fontSize: "0.95rem", margin: "0 0 6px 0" }}>{t("measuredTemplatesTitle")}</h2>
        <p style={{ margin: "0 0 10px 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {t("catalogueSummary", summary.banksWithTemplates, summary.banksPending, summary.bankCount)}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {banks.map((bank) => (
            <Link key={bank.id} href={`/banks/${bank.id}`} className="button small secondary">
              {bank.name}
            </Link>
          ))}
          <Link href="/banks" className="text-button" style={{ alignSelf: "center", fontSize: "0.82rem" }}>
            {t("fullCatalogue")}
          </Link>
        </div>
      </section>
    </>
  );
}
