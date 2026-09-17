"use client";

import { useState, useEffect } from "react";
import { STANDARD_CHEQUE_W_MM, STANDARD_CHEQUE_H_MM } from "@/lib/printGeometry";
import type { BankTemplate, ProfileKey } from "@/lib/types";
import { validateBankTemplate, validateNoDuplicateIds } from "@/lib/validation";
import {
  getTemplate,
  upsertTemplate,
  removeTemplate,
  loadAdminTemplates,
  saveAdminTemplates,
  clearAdminTemplates,
  resetToBuiltinTemplates,
  BANK_TEMPLATES_BASE,
  initRuntimeTemplates,
} from "@/lib/templates";

type ValidationErrors = Record<string, string>;

function mergeAdminTemplates(): BankTemplate[] {
  try {
    return loadAdminTemplates();
  } catch {
    return [...BANK_TEMPLATES_BASE];
  }
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<BankTemplate[]>(() => mergeAdminTemplates());
  const [editing, setEditing] = useState<BankTemplate | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    initRuntimeTemplates();
  }, []);

  function refreshTemplates() {
    setTemplates(mergeAdminTemplates());
  }

  function handleEdit(id: string) {
    const tmpl = getTemplate(id);
    if (tmpl) {
      setEditing(JSON.parse(JSON.stringify(tmpl)));
      setErrors({});
      setSaveError("");
      setSaveSuccess("");
    }
  }

  function handleCancelEdit() {
    setEditing(null);
    setErrors({});
    setSaveError("");
    setSaveSuccess("");
  }

  function handleDelete(id: string) {
    if (!confirm(`Remove template "${id}"? This cannot be undone.`)) return;
    const updated = templates.filter((t) => t.id !== id);
    try {
      saveAdminTemplates(updated);
      setTemplates(updated);
      setEditing(null);
      setSaveSuccess(`Template "${id}" removed.`);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  function handleDuplicate(sourceId: string) {
    const source = getTemplate(sourceId);
    if (!source) return;
    let newId = `${source.id}_copy`;
    let counter = 1;
    while (templates.some((t) => t.id === newId)) {
      newId = `${source.id}_copy_${counter}`;
      counter++;
    }
    const copy: BankTemplate = JSON.parse(JSON.stringify(source));
    copy.id = newId;
    copy.bankName = `${source.bankName} (Copy)`;
    try {
      upsertTemplate(copy);
      setTemplates(mergeAdminTemplates());
      setSaveSuccess(`Template duplicated as "${newId}".`);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  function handleCreateNew() {
    const base: BankTemplate = {
      id: "",
      bankName: "",
      widthMm: STANDARD_CHEQUE_W_MM,
      heightMm: STANDARD_CHEQUE_H_MM,
      fields: {
        date: { x: 128, y: 6, width: 52, fontSize: 11, minFontSize: 7, letterSpacing: 0.3, render: "date-grid" },
        payee: { x: 12, y: 28, width: 90, fontSize: 10, minFontSize: 7 },
        words1: { x: 12, y: 44, width: 150, fontSize: 9, minFontSize: 6.5 },
        words2: { x: 12, y: 54, width: 150, fontSize: 9, minFontSize: 6.5 },
        amount: { x: 110, y: 66, width: 65, fontSize: 11, minFontSize: 8 },
        accountPayee: { x: 0, y: 16, width: STANDARD_CHEQUE_W_MM, fontSize: 9, minFontSize: 7, align: "center" },
        memo: { x: 12, y: 76, width: 60, fontSize: 8, minFontSize: 6 },
      },
      structural: {
        payLabel: { x: 12, y: 24, width: 90, height: 5 },
        orBearer: { x: 100, y: 24, width: 40, height: 5 },
        sig1: { x: 12, y: 78, width: 55, height: 8 },
        sig2: { x: 72, y: 78, width: 55, height: 8 },
      },
      profiles: {
        custom_short: { x: 0, y: 0, pageWidth: STANDARD_CHEQUE_W_MM, pageHeight: STANDARD_CHEQUE_H_MM },
        custom_long: { x: 0, y: 0, pageWidth: STANDARD_CHEQUE_W_MM, pageHeight: STANDARD_CHEQUE_H_MM },
        a4_vertical: { x: 9.75, y: 20, pageWidth: 210, pageHeight: 297 },
        a4_horizontal: { x: 20, y: 50.75, pageWidth: 297, pageHeight: 210 },
      },
      print: {
        calibration: { defaultX: 0, defaultY: 0 },
        supportedModes: ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"],
      },
      enabled: true,
    };
    setEditing(base);
    setErrors({});
    setSaveError("");
    setSaveSuccess("");
  }

  function handleInputChange(path: string[], value: string | number | boolean) {
    if (!editing) return;
    const updated = { ...editing };
    let obj: Record<string, unknown> = updated as unknown as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]] as Record<string, unknown>;
    }
    const last = path[path.length - 1];
    obj[last] = value;
    setEditing(updated as unknown as BankTemplate);
  }

  function handleSave() {
    if (!editing) return;
    setErrors({});
    setSaveError("");
    setSaveSuccess("");

    const otherTemplates = templates.filter((t) => t.id !== editing.id);

    if (!editing.id || editing.id.trim() === "") {
      setErrors({ id: "Template ID is required." });
      return;
    }
    if (otherTemplates.some((t) => t.id === editing.id)) {
      setErrors({ id: `A template with ID "${editing.id}" already exists.` });
      return;
    }
    if (!editing.bankName || editing.bankName.trim() === "") {
      setErrors({ bankName: "Bank name is required." });
      return;
    }

    const errs = validateBankTemplate(editing);
    if (errs) {
      const e: ValidationErrors = {};
      for (const err of errs) {
        e[err.path ?? "general"] = err.message;
      }
      setErrors(e);
      return;
    }

    const collErrs = validateNoDuplicateIds([...otherTemplates, editing]);
    if (collErrs) {
      const e: ValidationErrors = {};
      for (const err of collErrs) {
        e[err.path ?? "general"] = err.message;
      }
      setErrors(e);
      return;
    }

    try {
      upsertTemplate(editing);
      refreshTemplates();
      setEditing(null);
      setSaveSuccess(`Template "${editing.id}" saved.`);
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  function handleResetBuiltin() {
    if (!confirm("Restore all built-in templates? This will discard all admin-created templates.")) return;
    clearAdminTemplates();
    resetToBuiltinTemplates();
    refreshTemplates();
    setEditing(null);
    setSaveSuccess("Restored built-in templates.");
  }

  const activeTemplates = templates.filter((t) => t.enabled);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: "1.12rem" }}>Bank Templates</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="button small secondary" onClick={handleResetBuiltin}>
            Reset to Built-in
          </button>
          <button type="button" className="button small" onClick={handleCreateNew}>
            + New Template
          </button>
        </div>
      </div>

      {saveError && <p className="error-state" role="alert">{saveError}</p>}
      {saveSuccess && <p style={{ color: "var(--success)", fontSize: "0.85rem" }}>{saveSuccess}</p>}

      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "8px", color: "var(--text-secondary)" }}>ID</th>
              <th style={{ textAlign: "left", padding: "8px", color: "var(--text-secondary)" }}>Bank Name</th>
              <th style={{ textAlign: "left", padding: "8px", color: "var(--text-secondary)" }}>Size (mm)</th>
              <th style={{ textAlign: "left", padding: "8px", color: "var(--text-secondary)" }}>Enabled</th>
              <th style={{ textAlign: "left", padding: "8px", color: "var(--text-secondary)" }}>User-visible</th>
              <th style={{ textAlign: "right", padding: "8px", color: "var(--text-secondary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px", fontFamily: "monospace" }}>{t.id}</td>
                <td style={{ padding: "8px" }}>{t.bankName}</td>
                <td style={{ padding: "8px" }}>{t.widthMm} × {t.heightMm}</td>
                <td style={{ padding: "8px" }}>{t.enabled ? "✓" : "—"}</td>
                <td style={{ padding: "8px" }}>{t.enabled && (t.print?.supportedModes?.length ?? 0) > 0 ? "✓" : "—"}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  <button type="button" className="text-button" onClick={() => handleEdit(t.id)} style={{ fontSize: "0.8rem" }}>Edit</button>
                  <button type="button" className="text-button" onClick={() => handleDuplicate(t.id)} style={{ fontSize: "0.8rem" }}>Duplicate</button>
                  {t.id !== "siddhartha" && (
                    <button type="button" className="text-button" onClick={() => handleDelete(t.id)} style={{ fontSize: "0.8rem", color: "var(--danger)" }}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "var(--text-muted)" }}>No bank templates.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <TemplateEditor
          key={editing.id || "__new__"}
          template={editing}
          errors={errors}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          onUpdateField={handleInputChange}
        />
      )}
    </div>
  );
}

interface TemplateEditorProps {
  template: BankTemplate;
  errors: ValidationErrors;
  onSave: () => void;
  onCancel: () => void;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
}

function TemplateEditor({ template, onSave, onCancel, onUpdateField, errors }: TemplateEditorProps) {
  const FIELD_LABEL_MAP: Record<string, string> = {
    date: "Date",
    payee: "Payee",
    words1: "Amount in Words (Line 1)",
    words2: "Amount in Words (Line 2)",
    amount: "Numeric Amount",
    accountPayee: "A/C PAYEE ONLY",
    memo: "Memo",
  };

  return (
    <div className="card">
      <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem" }}>
        Edit Template: {template.id || "(new)"}
      </h3>

      <div className="two-columns">
        <div className="field">
          <label htmlFor="tmpl-id">Template ID</label>
          <input
            id="tmpl-id"
            type="text"
            value={template.id}
            onChange={(e) => onUpdateField(["id"], e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"))}
            style={errors.id ? { borderColor: "var(--danger)" } : undefined}
          />
          {errors.id && <span className="error-state">{errors.id}</span>}
          <small style={{ color: "var(--text-muted)" }}>Lowercase, alphanumeric, hyphens and underscores only.</small>
        </div>
        <div className="field">
          <label htmlFor="tmpl-name">Bank Name</label>
          <input
            id="tmpl-name"
            type="text"
            value={template.bankName}
            onChange={(e) => onUpdateField(["bankName"], e.target.value)}
            style={errors.bankName ? { borderColor: "var(--danger)" } : undefined}
          />
          {errors.bankName && <span className="error-state">{errors.bankName}</span>}
        </div>
      </div>

      <div className="two-columns">
        <div className="field">
          <label htmlFor="tmpl-width">Cheque Width (mm)</label>
          <input
            id="tmpl-width"
            type="number"
            step="0.1"
            min="1"
            value={template.widthMm}
            onChange={(e) => onUpdateField(["widthMm"], Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="tmpl-height">Cheque Height (mm)</label>
          <input
            id="tmpl-height"
            type="number"
            step="0.1"
            min="1"
            value={template.heightMm}
            onChange={(e) => onUpdateField(["heightMm"], Number(e.target.value))}
          />
        </div>
      </div>

      <div className="field check">
        <input
          id="tmpl-enabled"
          type="checkbox"
          checked={template.enabled}
          onChange={(e) => onUpdateField(["enabled"], e.target.checked)}
        />
        <label htmlFor="tmpl-enabled" style={{ margin: 0 }}>
          Enable this template for users
        </label>
      </div>

      <div className="field">
        <label>Supported Print Modes</label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {(["custom_short", "custom_long", "a4_vertical", "a4_horizontal"] as ProfileKey[]).map((m) => (
            <label key={m} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
              <input
                type="checkbox"
                checked={template.print?.supportedModes?.includes(m) ?? false}
                onChange={(e) => {
                  const modes = template.print?.supportedModes
                    ? [...template.print.supportedModes]
                    : ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];
                  if (e.target.checked) {
                    if (!modes.includes(m)) modes.push(m);
                  } else {
                    const idx = modes.indexOf(m);
                    if (idx > -1) modes.splice(idx, 1);
                  }
                  onUpdateField(["print", "supportedModes"], modes as unknown as string);
                }}
              />
              {m}
            </label>
          ))}
        </div>
        <small style={{ color: "var(--text-muted)" }}>Uncheck a mode to prevent users from selecting it for this bank.</small>
      </div>

      <div className="field">
        <label>Default Calibration (mm)</label>
        <div className="two-columns">
          <div className="field">
            <label htmlFor="cal-x">Default X</label>
            <input
              id="cal-x"
              type="number"
              step="0.1"
              min="-25"
              max="25"
              value={template.print?.calibration?.defaultX ?? 0}
              onChange={(e) => onUpdateField(["print", "calibration", "defaultX"], Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="cal-y">Default Y</label>
            <input
              id="cal-y"
              type="number"
              step="0.1"
              min="-25"
              max="25"
              value={template.print?.calibration?.defaultY ?? 0}
              onChange={(e) => onUpdateField(["print", "calibration", "defaultY"], Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="panel-heading" style={{ marginTop: 16, marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Field Positions</h4>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "6px", color: "var(--text-muted)" }}>Field</th>
            <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>X (mm)</th>
            <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>Y (mm)</th>
            <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>Width (mm)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(template.fields).map(([key, field]) => (
            <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "6px", fontWeight: 600 }}>{FIELD_LABEL_MAP[key] ?? key}</td>
              <td style={{ padding: "6px" }}>
                <input type="number" step="0.1" value={field.x} onChange={(e) => onUpdateField(["fields", key, "x"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
              </td>
              <td style={{ padding: "6px" }}>
                <input type="number" step="0.1" value={field.y} onChange={(e) => onUpdateField(["fields", key, "y"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
              </td>
              <td style={{ padding: "6px" }}>
                <input type="number" step="0.1" value={field.width} onChange={(e) => onUpdateField(["fields", key, "width"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {template.structural && (
        <>
          <div className="panel-heading" style={{ marginTop: 16, marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Structural Positions</h4>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "6px", color: "var(--text-muted)" }}>Element</th>
                <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>X (mm)</th>
                <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>Y (mm)</th>
                <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>Width (mm)</th>
                <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>Height (mm)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(template.structural).map(([key, sp]) => (
                <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px", fontWeight: 600 }}>{key}</td>
                  <td style={{ padding: "6px" }}>
                    <input type="number" step="0.1" value={sp.x} onChange={(e) => onUpdateField(["structural", key, "x"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
                  </td>
                  <td style={{ padding: "6px" }}>
                    <input type="number" step="0.1" value={sp.y} onChange={(e) => onUpdateField(["structural", key, "y"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
                  </td>
                  <td style={{ padding: "6px" }}>
                    <input type="number" step="0.1" value={sp.width} onChange={(e) => onUpdateField(["structural", key, "width"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
                  </td>
                  <td style={{ padding: "6px" }}>
                    <input type="number" step="0.1" value={sp.height ?? 0} onChange={(e) => onUpdateField(["structural", key, "height"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="panel-heading" style={{ marginTop: 16, marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Print Profiles (Carrier positions)</h4>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "6px", color: "var(--text-muted)" }}>Profile</th>
            <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>X (mm)</th>
            <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>Y (mm)</th>
            <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>Page W</th>
            <th style={{ textAlign: "right", padding: "6px", color: "var(--text-muted)" }}>Page H</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(template.profiles) as ProfileKey[]).map((key) => {
            const p = template.profiles[key];
            return (
              <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "6px", fontWeight: 600, fontFamily: "monospace" }}>{key}</td>
                <td style={{ padding: "6px" }}>
                  <input type="number" step="0.1" value={p.x} onChange={(e) => onUpdateField(["profiles", key, "x"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
                </td>
                <td style={{ padding: "6px" }}>
                  <input type="number" step="0.1" value={p.y} onChange={(e) => onUpdateField(["profiles", key, "y"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
                </td>
                <td style={{ padding: "6px" }}>
                  <input type="number" step="0.1" value={p.pageWidth} onChange={(e) => onUpdateField(["profiles", key, "pageWidth"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
                </td>
                <td style={{ padding: "6px" }}>
                  <input type="number" step="0.1" value={p.pageHeight} onChange={(e) => onUpdateField(["profiles", key, "pageHeight"], Number(e.target.value))} style={{ width: "70px", textAlign: "right", fontSize: "0.8rem" }} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {Object.keys(errors).length > 0 && (
        <div style={{ marginTop: 12 }}>
          {Object.entries(errors).map(([path, msg]) => (
            <p key={path} className="error-state" style={{ fontSize: "0.82rem" }}><b>{path}</b>: {msg}</p>
          ))}
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 16 }}>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="button" onClick={onSave} style={{ marginLeft: 8 }}>Save Template</button>
      </div>
    </div>
  );
}
