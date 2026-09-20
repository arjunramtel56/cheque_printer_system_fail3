import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getBankGroups, getCatalogueSummary, formatBankLabel, getTemplatesForBank } from "@/lib/catalogue";
import { VerificationBadge } from "@/components/CatalogueBadges";

/**
 * Bank directory: every institution in the catalogue, grouped by NRB class,
 * with an honest template-availability column. A bank with no measured layout
 * is listed as "template pending" rather than hidden.
 */
export default function BanksPage() {
  const groups = getBankGroups();
  const summary = getCatalogueSummary();

  return (
    <div className="panel" style={{ margin: 16 }}>
      <nav style={{ marginBottom: 8, fontSize: "0.82rem", display: "flex", gap: 10, alignItems: "center" }}>
        <Link href="/" className="text-button">Home</Link>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <Link href="/banks" className="text-button">Banks</Link>
        <div style={{ marginLeft: "auto" }}>
          <LanguageToggle />
        </div>
      </nav>
      <h1 style={{ fontSize: "1.2rem", margin: "0 0 4px 0" }}>Nepal bank catalogue</h1>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
        {summary.bankCount} institutions · {summary.banksWithTemplates} with a measured cheque template ·{" "}
        {summary.banksPending} awaiting a template. {summary.physicallyCalibratedCount} physically calibrated,{" "}
        {summary.browserVerifiedCount} browser verified.
      </p>
      <p style={{ margin: "8px 0 16px 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        A template is only added after a physical cheque from that bank has been measured. Nothing here is guessed.
      </p>

      {groups.map((group) => (
        <section key={group.nrbClass} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "0.95rem", margin: "0 0 2px 0" }}>{group.label}</h2>
          <p style={{ margin: "0 0 8px 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>{group.note}</p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {group.banks.map((bank) => {
              const templates = getTemplatesForBank(bank.id);
              return (
                <li key={bank.id} style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", fontSize: "0.85rem" }}>
                  <Link href={`/banks/${bank.id}`} className="text-button">
                    {bank.name}
                  </Link>
                  {!bank.enabled && <span style={{ color: "var(--danger)", fontSize: "0.75rem" }}>disabled</span>}
                  {bank.status !== "active" && (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{formatBankLabel(bank)}</span>
                  )}
                  {templates.length === 0 ? (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>template pending</span>
                  ) : (
                    templates.map((template) => (
                      <span key={template.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <Link href={`/banks/${bank.id}/cheque/${template.id}`} className="text-button">
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
