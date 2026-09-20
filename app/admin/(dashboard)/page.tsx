"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getBanks, getCatalogueSummary, initBankCatalogue } from "@/lib/catalogue";
import { loadAdminTemplates, initRuntimeTemplates } from "@/lib/templates";
import { initChequeSizes } from "@/lib/sizes";
import { VerificationBadge } from "@/components/CatalogueBadges";
import type { BankTemplate } from "@/lib/types";

export default function AdminDashboard() {
  const [templates, setTemplates] = useState<BankTemplate[]>([]);
  const [banks, setBanks] = useState(() => getBanks());
  const { t } = useTranslation();

  useEffect(() => {
    initChequeSizes();
    initBankCatalogue();
    initRuntimeTemplates();
    setTemplates(loadAdminTemplates());
    setBanks(getBanks());
  }, []);

  const summary = getCatalogueSummary();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Catalogue</h3>
        <p style={{ margin: "0 0 8px 0", fontSize: "0.88rem" }}>
          <b>{summary.bankCount}</b> banks · <b>{summary.banksWithTemplates}</b> with a measured cheque template ·{" "}
          <b>{summary.banksPending}</b> awaiting a template.
        </p>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {summary.physicallyCalibratedCount} physically calibrated · {summary.browserVerifiedCount} browser verified. A
          template is only offered to users once a layout has been measured from a real cheque.
        </p>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Cheque templates</h3>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: "0.85rem" }}>
          {templates.map((template) => (
            <li key={template.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Link href={`/admin/templates/${template.id}`} className="text-button">{template.bankName}</Link>
              <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                {template.widthMm} × {template.heightMm} mm · {template.orientation} · {template.id}
              </span>
              <VerificationBadge status={template.verification?.status ?? "unverified"} />
              {!template.enabled && <span style={{ color: "var(--danger)", fontSize: "0.78rem" }}>disabled</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Quick links</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/banks" className="button small secondary">Bank catalogue</Link>
          <Link href="/admin/templates" className="button small secondary">Cheque templates</Link>
          <Link href="/admin/calibration" className="button small secondary">Calibration</Link>
          <Link href="/banks" className="button small secondary">Public bank list</Link>
          <Link href="/" className="button small secondary">User workspace</Link>
        </div>
      </div>

      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--danger)" }}>Administrator access is a local demo gate</h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Admin authentication in this build is a client-side password gate with per-browser storage — it is not the
          server-side authentication and authorization system the product plan requires. Template and bank data can still be
          changed by anyone with access to the browser profile, so configuration changes must be exported and committed to
          the repository, where they are reviewable. Do not expose this build to untrusted users as an
          administration interface. Current bank count in this session: {banks.length}.
        </p>
      </div>
    </div>
  );
}
