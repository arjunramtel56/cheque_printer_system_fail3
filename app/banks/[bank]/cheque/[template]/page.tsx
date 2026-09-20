import Link from "next/link";
import { notFound } from "next/navigation";
import Workspace from "@/components/Workspace";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { formatBankLabel, getBank, getBanks, getTemplatesForBank } from "@/lib/catalogue";
import { getTemplateForBank } from "@/lib/templates";
import { VerificationBadge, TemplateMeta } from "@/components/CatalogueBadges";

/**
 * Deep-linked cheque workspace: /banks/[bank]/cheque/[template]
 *
 * The bank and template come from the URL, so a layout is shareable and can
 * never silently fall back to a different bank's geometry: both ids are
 * resolved here on the server and re-checked inside the workspace.
 */
export function generateStaticParams(): { bank: string; template: string }[] {
  return getBanks()
    .filter((bank) => bank.enabled)
    .flatMap((bank) =>
      getTemplatesForBank(bank.id)
        .filter((template) => template.enabled)
        .map((template) => ({ bank: bank.id, template: template.id })),
    );
}

export default async function BankChequePage({
  params,
}: {
  params: Promise<{ bank: string; template: string }>;
}) {
  const { bank: bankId, template: templateId } = await params;
  const bank = getBank(bankId);
  if (!bank || !bank.enabled) notFound();

  const template = getTemplateForBank(bankId, templateId);
  if (!template || !template.enabled) notFound();

  return (
    <>
      <div className="no-print" style={{ padding: "12px 16px 0 16px" }}>
        <nav style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: "0.82rem" }}>
          <Link href="/" className="text-button">
            Home
          </Link>
          <span style={{ color: "var(--text-muted)" }}> / </span>
          <Link href="/banks" className="text-button">
            Banks
          </Link>
          <span style={{ color: "var(--text-muted)" }}> / </span>
          <Link href={`/banks/${bank.id}`} className="text-button">
            {bank.name}
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
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
