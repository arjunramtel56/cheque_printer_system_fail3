"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BankTemplate } from "@/lib/types";
import { getBanks, initBankCatalogue } from "@/lib/catalogue";
import {
  BANK_TEMPLATES_BASE,
  clearAdminTemplates,
  getTemplate,
  initRuntimeTemplates,
  loadAdminTemplates,
  resetToBuiltinTemplates,
  saveAdminTemplates,
  upsertTemplate,
} from "@/lib/templates";
import { initChequeSizes } from "@/lib/sizes";
import { VerificationBadge } from "@/components/dashboard/CatalogueBadges";

/**
 * Template workbench.
 *
 * Committed template data (data/templates.ts) is the source of truth; this
 * screen edits the runtime copy and can export the result as JSON so a verified
 * layout can be committed to the repository. Nothing here is required for the
 * printing engine to work.
 */
export default function TemplateWorkbench() {
  const [templates, setTemplates] = useState<BankTemplate[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importText, setImportText] = useState("");

  useEffect(() => {
    initChequeSizes();
    initBankCatalogue();
    initRuntimeTemplates();
    setTemplates(loadAdminTemplates());
  }, []);

  function refresh() {
    setTemplates(loadAdminTemplates());
  }

  function handleCreate() {
    const banks = getBanks();
    const bank = banks.find((b) => b.templateIds.length > 0) ?? banks[0];
    if (!bank) {
      setError("No banks in the catalogue — add a bank first.");
      return;
    }
    const base = structuredClone(BANK_TEMPLATES_BASE[0]);
    let id = `${bank.id}-template`;
    let counter = 1;
    while (getTemplate(id)) {
      id = `${bank.id}-template-${counter++}`;
    }
    const draft: BankTemplate = {
      ...base,
      id,
      bankId: bank.id,
      bankName: bank.name,
      label: `${base.widthMm} × ${base.heightMm} landscape (new)`,
      verification: { status: "unverified", note: "Created in the admin workbench." },
    };
    try {
      upsertTemplate(draft);
      refresh();
      setMessage(`Created draft template "${id}". Open it to configure geometry.`);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleDuplicate(id: string) {
    const source = getTemplate(id);
    if (!source) return;
    let newId = `${id}-copy`;
    let counter = 1;
    while (getTemplate(newId)) newId = `${id}-copy-${counter++}`;
    try {
      upsertTemplate({ ...structuredClone(source), id: newId, label: `${source.label} (copy)`, verification: { status: "unverified" } });
      refresh();
      setMessage(`Duplicated as "${newId}".`);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm(`Remove template "${id}" from this browser?`)) return;
    const next = templates.filter((t) => t.id !== id);
    try {
      saveAdminTemplates(next);
      refresh();
      setMessage(`Removed "${id}".`);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleExport() {
    const payload = JSON.stringify({ version: 1, templates }, null, 2);
    setImportText(payload);
    try {
      void navigator.clipboard?.writeText(payload);
      setMessage("Exported the current template set as JSON (copied to clipboard).");
    } catch {
      setMessage("Exported the current template set as JSON.");
    }
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(importText) as { templates?: BankTemplate[] } | BankTemplate[];
      const list = Array.isArray(parsed) ? parsed : parsed.templates;
      if (!Array.isArray(list)) throw new Error("JSON must contain a templates array.");
      saveAdminTemplates(list);
      refresh();
      setMessage(`Imported ${list.length} templates.`);
      setError("");
    } catch (e) {
      setError(`Import failed: ${(e as Error).message}`);
    }
  }

  function handleReset() {
    if (!window.confirm("Restore the built-in templates and discard local edits?")) return;
    clearAdminTemplates();
    resetToBuiltinTemplates();
    refresh();
    setMessage("Restored built-in templates.");
    setError("");
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="button small" onClick={handleCreate}>
          + New Template
        </button>
        <button type="button" className="button small secondary" onClick={handleExport}>
          Export JSON
        </button>
        <button type="button" className="button small secondary" onClick={handleReset}>
          Reset to Built-in
        </button>
        <Link href="/admin/banks" className="text-button" style={{ fontSize: "0.82rem" }}>
          Manage Banks →
        </Link>
        <Link href="/admin/calibration" className="text-button" style={{ fontSize: "0.82rem" }}>
          Calibration →
        </Link>
      </div>

      {message && <p style={{ color: "var(--success)", fontSize: "0.85rem", margin: 0 }}>{message}</p>}
      {error && <p className="error-state" role="alert" style={{ margin: 0 }}>{error}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                ID
              </th>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Bank
              </th>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Size
              </th>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Orientation
              </th>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Modes
              </th>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Verification
              </th>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Enabled
              </th>
              <th style={{ textAlign: "right", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr
                key={t.id}
                style={{
                  borderBottom: "1px solid var(--border)",
                  transition: "background-color 0.15s ease",
                }}
              >
                <td style={{ padding: 8, fontFamily: "monospace", fontSize: "0.82rem" }}>{t.id}</td>
                <td style={{ padding: 8, fontSize: "0.85rem" }}>{t.bankName}</td>
                <td style={{ padding: 8, fontSize: "0.82rem" }}>{t.widthMm} × {t.heightMm} mm</td>
                <td style={{ padding: 8, fontSize: "0.82rem" }}>{t.orientation}</td>
                <td style={{ padding: 8, fontSize: "0.78rem" }}>{t.print?.supportedModes?.length ?? 0} modes</td>
                <td style={{ padding: 8 }}><VerificationBadge status={t.verification?.status ?? "unverified"} /></td>
                <td style={{ padding: 8, fontSize: "0.82rem" }}>{t.enabled ? "yes" : "no"}</td>
                <td style={{ padding: 8, textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link href={`/admin/templates/${t.id}`} className="text-button" style={{ fontSize: "0.8rem" }}>
                    Edit
                  </Link>
                  <button type="button" className="text-button" style={{ fontSize: "0.8rem" }} onClick={() => handleDuplicate(t.id)}>
                    Duplicate
                  </button>
                  <button type="button" className="text-button" style={{ fontSize: "0.8rem", color: "var(--danger)" }} onClick={() => handleDelete(t.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 16, textAlign: "center", color: "var(--text-muted)" }}>
                  No templates.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem" }}>Import Templates</h3>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Paste an exported template set. Every template is validated before it is stored — an invalid set is rejected whole.
        </p>
        <textarea
          rows={6}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{"version":1,"templates":[...]}'
          style={{ fontFamily: "monospace", fontSize: "0.78rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "8px", background: "var(--surface)", color: "var(--text-primary)" }}
        />
        <div>
          <button type="button" className="button small secondary" onClick={handleImport}>Import</button>
        </div>
      </div>
    </div>
  );
}

