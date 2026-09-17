import Link from "next/link";
import Workspace from "@/components/Workspace";
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
  const banks = getSelectableBanks();
  const summary = getCatalogueSummary();

  return (
    <>
      <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 100, display: "flex", gap: 10 }}>
        <Link href="/banks" className="text-button" style={{ fontSize: "0.78rem", opacity: 0.6 }} aria-label="Bank directory">
          Banks
        </Link>
        <Link href="/admin" className="text-button" style={{ fontSize: "0.78rem", opacity: 0.6 }} aria-label="Admin panel">
          Admin
        </Link>
      </div>

      <Workspace />

      <section className="no-print panel" style={{ margin: "16px", padding: 16 }}>
        <h2 style={{ fontSize: "0.95rem", margin: "0 0 6px 0" }}>Measured cheque templates</h2>
        <p style={{ margin: "0 0 10px 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {summary.banksWithTemplates} of {summary.bankCount} catalogue banks have a cheque layout,{" "}
          {summary.banksPending} are awaiting one. Only layouts measured from a real cheque sample are printable.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {banks.map((bank) => (
            <Link key={bank.id} href={`/banks/${bank.id}`} className="button small secondary">
              {bank.name}
            </Link>
          ))}
          <Link href="/banks" className="text-button" style={{ alignSelf: "center", fontSize: "0.82rem" }}>
            Full catalogue →
          </Link>
        </div>
      </section>
    </>
  );
}
