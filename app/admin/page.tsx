"use client";

import Link from "next/link";
import { getAllActiveTemplates, getAllTemplates } from "@/lib/templates";
import { isTemplatePrintable } from "@/lib/admin";

export default function AdminDashboard() {
  const all = getAllTemplates();
  const active = getAllActiveTemplates();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Bank Templates</h3>
        <p style={{ margin: "0 0 8px 0", fontSize: "0.88rem" }}>
          <b>{all.length}</b> total templates ({all.filter((t) => t.enabled).length} enabled, {all.filter((t) => !t.enabled).length} disabled).
        </p>
        <Link href="/admin/templates" className="text-button">Manage bank templates →</Link>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>User-Facing Summary</h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {active.length} of {all.length} templates are visible to users in the print workflow.
          Templates marked <b>disabled</b> or with no supported print modes are hidden.
        </p>
        {active.length === 0 && (
          <p className="error-state" style={{ marginTop: 8 }}>Warning: no templates are currently active.</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Siddhartha Bank Compliance (STEP 6)</h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          The Siddhartha Bank template retains its original 190.5×88.9 mm geometry,
          landscape layout, all four print profiles (Custom Cheque Size + A4 Carrier),
          and calibrated field positions. No coordinates were altered.
        </p>
        <ul style={{ margin: "6px 0 0 0", padding: 0, listStyle: "none", fontSize: "0.82rem" }}>
          {all.filter((t) => t.id === "siddhartha").map((t) => (
            <li key={t.id}>
              Siddhartha: {t.widthMm}×{t.heightMm} mm, printable={isTemplatePrintable(t) ? "yes" : "no"}, enabled={t.enabled ? "yes" : "no"}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Quick Links</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/templates" className="button small secondary">Bank Templates</Link>
          <Link href="/" className="button small secondary">User Workspace</Link>
        </div>
      </div>
    </div>
  );
}
