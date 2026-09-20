import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { formatBankLabel, getBank, getBanks, getTemplatesForBank } from "@/lib/catalogue";
import { TemplateMeta, VerificationBadge } from "@/components/CatalogueBadges";

export function generateStaticParams(): { bank: string }[] {
  return getBanks().map((bank) => ({ bank: bank.id }));
}

const CLASS_LABEL: Record<string, string> = {
  A: "Class A · Commercial bank",
  B: "Class B · Development bank",
  C: "Class C · Finance company",
  D: "Class D · Microfinance institution",
};

export default async function BankPage({ params }: { params: Promise<{ bank: string }> }) {
  const { bank: bankId } = await params;
  const bank = getBank(bankId);
  if (!bank) notFound();

  const templates = getTemplatesForBank(bank.id);
  const selectable = templates.filter((t) => t.enabled && bank.enabled);

  return (
    <div className="card" style={{ margin: 16, maxWidth: "720px" }}>
      <nav style={{ display: "flex", gap: 10, fontSize: "0.82rem", marginBottom: 8, alignItems: "center" }}>
        <Link href="/" className="text-button">
          Home
        </Link>
        <span style={{ color: "var(--text-muted)" }}> / </span>
        <Link href="/banks" className="text-button">
          Banks
        </Link>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </nav>

      <h1 style={{ fontSize: "1.3rem", margin: "4px 0 2px 0", color: "var(--text-primary)" }}>{bank.name}</h1>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
        {CLASS_LABEL[bank.nrbClass] ?? bank.nrbClass} · status {bank.status}
        {bank.code ? ` · code ${bank.code}` : ""} · {formatBankLabel(bank)}
      </p>
      {!bank.enabled && (
        <p className="error-state" style={{ marginTop: 8 }}>
          This bank is disabled by an administrator, so its templates are not offered for printing.
        </p>
      )}
      {bank.status === "merged" && (
        <p style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Old cheques issued by this bank are still printable if a template exists; new cheques should come from the
          successor bank.
        </p>
      )}

      <h2 style={{ fontSize: "0.95rem", margin: "16px 0 6px 0" }}>Cheque templates</h2>
      {selectable.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          No measured cheque template exists for this bank yet. Templates are added only after a physical cheque sample has
          been measured and configured, so nothing here is guessed.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
          {selectable.map((template) => (
            <li key={template.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <Link href={`/banks/${bank.id}/cheque/${template.id}`} className="button small">
                  Print with {template.label}
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
