"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Bank, NrbClass } from "@/lib/types";
import {
  formatBankLabel,
  getBankGroups,
  getBanks,
  getCatalogueSummary,
  initBankCatalogue,
  loadAdminBanks,
  markBankVerified,
  removeBank,
  resetBanks,
  saveAdminBanks,
  setBankEnabled,
  upsertBank,
} from "@/lib/catalogue";
import { initChequeSizes } from "@/lib/sizes";
import { CATALOGUE_DISCLAIMER, CATALOGUE_REVISION } from "@/data/banks";

const CLASSES: NrbClass[] = ["A", "B", "C", "D"];

export default function AdminBanksPage() {
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importText, setImportText] = useState("");
  const [draft, setDraft] = useState<{ id: string; name: string; nrbClass: NrbClass; code: string }>({
    id: "",
    name: "",
    nrbClass: "A",
    code: "",
  });

  useEffect(() => {
    initChequeSizes();
    initBankCatalogue();
  }, []);

  const groups = useMemo(() => getBankGroups(), [version]);
  const summary = useMemo(() => getCatalogueSummary(), [version]);
  const banks = useMemo(() => getBanks(), [version]);

  function refresh(msg: string) {
    setVersion((v) => v + 1);
    setMessage(msg);
    setError("");
  }

  function handleAdd() {
    if (!draft.id || !draft.name) {
      setError("Both an id and a name are required.");
      return;
    }
    const bank: Bank = {
      id: draft.id.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
      name: draft.name,
      nrbClass: draft.nrbClass,
      code: draft.code || undefined,
      status: "active",
      enabled: true,
      templateIds: [],
    };
    try {
      upsertBank(bank);
      setDraft({ id: "", name: "", nrbClass: draft.nrbClass, code: "" });
      refresh(`Added ${bank.name}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleToggle(bank: Bank) {
    try {
      setBankEnabled(bank.id, !bank.enabled);
      refresh(`${bank.name} is now ${!bank.enabled ? "enabled" : "disabled"}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleVerify(bank: Bank) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      markBankVerified(bank.id, today);
      refresh(`Stamped ${bank.name} as checked on ${today}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleRemove(bank: Bank) {
    if (!window.confirm(`Remove ${bank.name} from this browser's catalogue?`)) return;
    try {
      removeBank(bank.id);
      refresh(`Removed ${bank.name}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleExport() {
    setImportText(JSON.stringify({ version: 1, banks }, null, 2));
    try {
      void navigator.clipboard?.writeText(JSON.stringify({ version: 1, banks }, null, 2));
      refresh("Exported the bank catalogue as JSON (copied to clipboard).");
    } catch {
      refresh("Exported the bank catalogue as JSON.");
    }
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(importText) as { banks?: Bank[] } | Bank[];
      const list = Array.isArray(parsed) ? parsed : parsed.banks;
      if (!Array.isArray(list)) throw new Error("JSON must contain a banks array.");
      saveAdminBanks(list);
      refresh(`Imported ${list.length} banks.`);
    } catch (e) {
      setError(`Import failed: ${(e as Error).message}`);
    }
  }

  function handleReset() {
    if (!window.confirm("Restore the built-in bank catalogue and discard local changes?")) return;
    resetBanks();
    loadAdminBanks();
    refresh("Restored the built-in bank catalogue.");
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "1.12rem" }}>Bank catalogue</h2>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {summary.bankCount} banks · {summary.banksWithTemplates} with a measured cheque template · {summary.banksPending}{" "}
          awaiting a template. Catalogue revision {CATALOGUE_REVISION}.
        </p>
        <p style={{ margin: "6px 0 0 0", fontSize: "0.78rem", color: "var(--danger)" }}>{CATALOGUE_DISCLAIMER}</p>
      </div>

      {message && <p style={{ color: "var(--success)", fontSize: "0.85rem", margin: 0 }}>{message}</p>}
      {error && <p className="error-state" role="alert" style={{ margin: 0 }}>{error}</p>}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem" }}>Add a bank</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="id (slug)" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} style={{ fontSize: "0.82rem" }} />
          <input placeholder="Bank name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ fontSize: "0.82rem", minWidth: 240 }} />
          <select value={draft.nrbClass} onChange={(e) => setDraft({ ...draft, nrbClass: e.target.value as NrbClass })} style={{ fontSize: "0.82rem" }}>
            {CLASSES.map((c) => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
          <input placeholder="code (optional)" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} style={{ fontSize: "0.82rem" }} />
          <button type="button" className="button small" onClick={handleAdd}>Add bank</button>
          <button type="button" className="button small secondary" onClick={handleExport}>Export JSON</button>
          <button type="button" className="button small secondary" onClick={handleReset}>Reset to built-in</button>
        </div>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          A bank with no template is listed for users as “template pending”. Templates can only be added once a physical
          cheque has been measured.
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.nrbClass} className="card">
          <h3 style={{ margin: "0 0 2px 0", fontSize: "0.9rem" }}>{group.label}</h3>
          <p style={{ margin: "0 0 8px 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>{group.note}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: 6, color: "var(--text-secondary)" }}>Name</th>
                  <th style={{ textAlign: "left", padding: 6, color: "var(--text-secondary)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: 6, color: "var(--text-secondary)" }}>Templates</th>
                  <th style={{ textAlign: "left", padding: 6, color: "var(--text-secondary)" }}>Verified</th>
                  <th style={{ textAlign: "right", padding: 6, color: "var(--text-secondary)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.banks.map((bank) => (
                  <tr key={bank.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: 6 }}>
                      <Link href={`/banks/${bank.id}`} className="text-button">{bank.name}</Link>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}>
                        {bank.id}
                        {bank.code ? ` · ${bank.code}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: 6 }}>
                      {bank.status}
                      {!bank.enabled && <span style={{ color: "var(--danger)" }}> · disabled</span>}
                      {bank.status === "merged" && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}>{formatBankLabel(bank)}</div>
                      )}
                    </td>
                    <td style={{ padding: 6 }}>{bank.templateIds.length === 0 ? "—" : bank.templateIds.join(", ")}</td>
                    <td style={{ padding: 6 }}>{bank.verifiedAt ?? "not checked"}</td>
                    <td style={{ padding: 6, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button type="button" className="text-button" style={{ fontSize: "0.78rem" }} onClick={() => handleToggle(bank)}>
                        {bank.enabled ? "Disable" : "Enable"}
                      </button>
                      <button type="button" className="text-button" style={{ fontSize: "0.78rem" }} onClick={() => handleVerify(bank)}>
                        Mark checked
                      </button>
                      <button type="button" className="text-button" style={{ fontSize: "0.78rem", color: "var(--danger)" }} onClick={() => handleRemove(bank)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="card" style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem" }}>Import banks</h3>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Paste an exported bank list (or the official NRB list in the same shape) to extend the catalogue without code
          changes. Every entry is validated before anything is stored.
        </p>
        <textarea
          rows={5}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{"version":1,"banks":[{"id":"...","name":"...","nrbClass":"A","status":"active","enabled":true,"templateIds":[]}]}'
          style={{ fontFamily: "monospace", fontSize: "0.78rem" }}
        />
        <div>
          <button type="button" className="button small secondary" onClick={handleImport}>Import</button>
        </div>
      </div>
    </div>
  );
}
