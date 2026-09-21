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
    <div style={{ display: "grid", gap: 20, maxWidth: "960px" }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: "var(--radius-sm)",
              background: "color-mix(in srgb, var(--info) 12%, transparent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--info)", fontSize: "1.2rem", fontWeight: 700,
            }}
          >
            i
          </div>
          <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Catalogue Overview</h3>
        </div>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Cheque templates</h3>
          <Link href="/admin/templates" className="text-button" style={{ fontSize: "0.78rem" }}>
            View all templates →
          </Link>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: "0.85rem" }}>
          {templates.slice(0, 8).map((template) => (
            <li key={template.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "4px 0" }}>
              <Link href={`/admin/templates/${template.id}`} className="text-button" style={{ fontSize: "0.82rem" }}>
                {template.bankName}
              </Link>
              <span style={{ color: "var(--text-muted)", fontSize: "0.76rem", fontFamily: "monospace" }}>
                {template.widthMm} × {template.heightMm} mm · {template.orientation} · {template.id}
              </span>
              <VerificationBadge status={template.verification?.status ?? "unverified"} />
              {!template.enabled && <span style={{ color: "var(--danger)", fontSize: "0.74rem" }}>disabled</span>}
            </li>
          ))}
          {templates.length > 8 && (
            <li style={{ color: "var(--text-muted)", fontSize: "0.78rem", padding: "4px 0" }}>
              +{templates.length - 8} more templates
            </li>
          )}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Quick Links</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/banks" className="button small secondary">Bank Catalogue</Link>
          <Link href="/admin/templates" className="button small secondary">Cheque Templates</Link>
          <Link href="/admin/calibration" className="button small secondary">Calibration</Link>
          <Link href="/banks" className="button small secondary">Public Bank List</Link>
          <Link href="/" className="button small secondary">User Workspace</Link>
        </div>
      </div>

      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.44 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--danger)" }}>Administrator access is a local demo gate</h3>
        </div>
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
