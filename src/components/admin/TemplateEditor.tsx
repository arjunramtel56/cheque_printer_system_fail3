"use client";

import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Bank, BankTemplate, FieldKind, ProfileKey, SafeZone, TemplateField, VerificationStatus } from "@/lib/types";
import { getChequeSizes } from "@/lib/sizes";
import { resolvePaper, resolvePrintGeometry } from "@/lib/printGeometry";
import { validateBankTemplate } from "@/lib/validation";
import { micrSafeZone } from "../../data/templates";
import ChequeSheet from "@/components/cheque/ChequeSheet";
import { TemplateMeta } from "@/components/dashboard/CatalogueBadges";

const FIELD_KINDS: FieldKind[] = ["label", "ac-payee", "date-grid", "payee", "words", "amount", "signature"];
const MODES: ProfileKey[] = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];
const VERIFICATION: VerificationStatus[] = ["unverified", "browser-verified", "physically-calibrated"];

const SAMPLE_DATA = {
  date: "2026-09-17",
  payee: "Ram Bahadur Thapa",
  amount: "125000.50",
  amountWords: "",
  accountPayee: true,
};

function NumberField({
  label,
  value,
  onChange,
  step = 0.1,
  width = 90,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  width?: number;
}) {
  return (
    <label style={{ display: "grid", gap: 2, fontSize: "0.75rem", color: "var(--text-muted)", minWidth: 120 }}>
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="field-input"
        style={{ width, fontSize: "0.8rem" }}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  width = 190,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  width?: number;
}) {
  return (
    <label style={{ display: "grid", gap: 2, fontSize: "0.75rem", color: "var(--text-muted)" }}>
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
        style={{ width, fontSize: "0.8rem" }}
      />
    </label>
  );
}

export interface TemplateEditorProps {
  template: BankTemplate;
  banks: Bank[];
  onSave: (template: BankTemplate) => void;
  onCancel: () => void;
  error?: string;
}

/**
 * Full template workbench: physical size, orientation, fields (position, font,
 * alignment, kind and label), reserved zones, supported print modes,
 * calibration defaults and verification state — with a live preview of the
 * exact sheet the user will print.
 */
export default function TemplateEditor({ template, banks, onSave, onCancel, error }: TemplateEditorProps) {
  const [draft, setDraft] = useState<BankTemplate>(() => structuredClone(template));
  const [mode, setMode] = useState<ProfileKey>("custom_short");
  const [showGuides, setShowGuides] = useState(true);

  const errors = useMemo(() => validateBankTemplate(draft) ?? [], [draft]);
  const sizes = getChequeSizes();
  const paper = resolvePaper(draft, mode);
  const geom = resolvePrintGeometry(draft, mode);

  function patch(updater: (next: BankTemplate) => void) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      updater(next);
      return next;
    });
  }

  function updateField(key: string, patchField: Partial<TemplateField>) {
    patch((next) => {
      const field = next.fields[key];
      if (!field) return;
      next.fields[key] = { ...field, ...patchField };
    });
  }

  function addField() {
    patch((next) => {
      const key = `field${Object.keys(next.fields).length + 1}`;
      next.fields[key] = {
        key,
        label: "New field",
        kind: "label",
        x: 10,
        y: 10,
        width: 60,
        fontSize: 9,
        align: "left",
        text: "",
        render: "text",
      };
    });
  }

  function removeField(key: string) {
    patch((next) => {
      delete next.fields[key];
    });
  }

  function applySize(sizeId: string) {
    patch((next) => {
      const size = sizes.find((s) => s.id === sizeId);
      if (!size) return;
      next.sizeId = size.id;
      next.widthMm = size.widthMm;
      next.heightMm = size.heightMm;
      next.orientation = size.widthMm >= size.heightMm ? "landscape" : "portrait";
      // Direct-feed profiles must always equal the cheque's physical box.
      next.profiles.custom_short = { x: 0, y: 0, pageWidth: size.widthMm, pageHeight: size.heightMm };
      next.profiles.custom_long = { x: 0, y: 0, pageWidth: size.widthMm, pageHeight: size.heightMm };
      next.safeZones = [micrSafeZone(size.widthMm, size.heightMm)];
    });
  }

  function toggleMode(m: ProfileKey) {
    patch((next) => {
      const set = new Set(next.print.supportedModes);
      if (set.has(m)) set.delete(m);
      else set.add(m);
      next.print.supportedModes = MODES.filter((x) => set.has(x));
    });
  }

  function updateSafeZone(id: string, patchZone: Partial<SafeZone>) {
    patch((next) => {
      next.safeZones = (next.safeZones ?? []).map((z) => (z.id === id ? { ...z, ...patchZone } : z));
    });
  }

  /**
   * Test print: the admin shell is marked .no-print, so the sheet is mounted
   * into a body-level host (outside that wrapper) at 1:1 physical scale and
   * removed again once the dialog closes. Same renderer, same geometry.
   */
  function testPrint() {
    const host = document.createElement("div");
    host.className = "print-output-screen";
    document.body.appendChild(host);
    const root = createRoot(host);

    const style = document.createElement("style");
    style.textContent = `@page { size: ${geom.pageW.toFixed(1)}mm ${geom.pageH.toFixed(1)}mm; margin: 0; }
@media print { .print-direct-feed, .print-a4-carrier { display: block !important; width: ${geom.containerW}mm !important; height: ${geom.containerH}mm !important; } }`;
    document.head.appendChild(style);

    const cleanup = () => {
      style.remove();
      window.removeEventListener("afterprint", cleanup);
      try {
        root.unmount();
      } catch {
        // already unmounted
      }
      host.remove();
    };
    window.addEventListener("afterprint", cleanup);

    root.render(
      <ChequeSheet
        template={draft}
        data={SAMPLE_DATA}
        mode={mode}
        calibration={{ x: draft.print.calibration.defaultX, y: draft.print.calibration.defaultY }}
        variant="print"
      />,
    );

    // Give React a frame to commit before opening the dialog.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          window.print();
        } catch {
          cleanup();
        }
        // Safety net for browsers that never fire afterprint.
        window.setTimeout(cleanup, 120_000);
      });
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error && <p className="error-state" role="alert">{error}</p>}
      {errors.length > 0 && (
        <div className="card" role="alert" style={{ borderColor: "var(--danger)" }}>
          <strong style={{ fontSize: "0.82rem" }}>{errors.length} validation problem{errors.length > 1 ? "s" : ""} — saving is blocked</strong>
          <ul style={{ margin: "6px 0 0 0", paddingLeft: 18, fontSize: "0.78rem" }}>
            {errors.slice(0, 8).map((e) => (
              <li key={`${e.code}-${e.path}`}>
                <code>{e.code}</code> {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Identity</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <TextField label="Template id" value={draft.id} onChange={(v) => patch((n) => { n.id = v.toLowerCase().replace(/[^a-z0-9_-]/g, "_"); })} />
          <label style={{ display: "grid", gap: 2, fontSize: "0.75rem", color: "var(--text-muted)", minWidth: 220 }}>
            Bank
            <select
              value={draft.bankId}
              onChange={(e) => {
                const bank = banks.find((b) => b.id === e.target.value);
                patch((n) => {
                  n.bankId = e.target.value;
                  if (bank) n.bankName = bank.name;
                });
              }}
              className="field-select"
              style={{ fontSize: "0.8rem", minWidth: 220 }}
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Label" value={draft.label} onChange={(v) => patch((n) => { n.label = v; })} />
          <TextField label="Bank name (printed)" value={draft.bankName} onChange={(v) => patch((n) => { n.bankName = v; })} />
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Physical Size &amp; Orientation</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "grid", gap: 2, fontSize: "0.75rem", color: "var(--text-muted)", minWidth: 260 }}>
            Cheque Size (Registry)
            <select
              value={draft.sizeId}
              onChange={(e) => applySize(e.target.value)}
              className="field-select"
              style={{ fontSize: "0.8rem", minWidth: 260 }}
            >
              {sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.widthMm} × {s.heightMm} mm
                </option>
              ))}
            </select>
          </label>
          <NumberField
            label="Width (mm)"
            value={draft.widthMm}
            step={0.1}
            onChange={(v) => patch((n) => {
              n.widthMm = v;
              n.profiles.custom_short.pageWidth = v;
              n.profiles.custom_long.pageWidth = v;
            })}
          />
          <NumberField
            label="Height (mm)"
            value={draft.heightMm}
            step={0.1}
            onChange={(v) => patch((n) => {
              n.heightMm = v;
              n.profiles.custom_short.pageHeight = v;
              n.profiles.custom_long.pageHeight = v;
            })}
          />
          <label style={{ display: "grid", gap: 2, fontSize: "0.75rem", color: "var(--text-muted)", minWidth: 140 }}>
            Orientation
            <select
              value={draft.orientation}
              onChange={(e) => patch((n) => { n.orientation = e.target.value as BankTemplate["orientation"]; })}
              className="field-select"
              style={{ fontSize: "0.8rem" }}
            >
              <option value="landscape">landscape</option>
              <option value="portrait">portrait</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 2, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Enabled
            <input type="checkbox" checked={draft.enabled} onChange={(e) => patch((n) => { n.enabled = e.target.checked; })} />
          </label>
        </div>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Cheque size is independent from the carrier paper: the cheque keeps {draft.widthMm} × {draft.heightMm} mm on every
          paper. Direct-feed profiles are kept in step automatically.
        </p>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Carrier Placement &amp; Print Modes</h3>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          {MODES.map((m) => (
            <label key={m} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.78rem" }}>
              <input type="checkbox" checked={draft.print.supportedModes.includes(m)} onChange={() => toggleMode(m)} />
              {m}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(["a4_vertical", "a4_horizontal"] as ProfileKey[]).map((m) => (
            <div key={m} style={{ display: "grid", gap: 6, border: "1px solid var(--border)", padding: 8, borderRadius: 6 }}>
              <b style={{ fontSize: "0.78rem" }}>{m}</b>
              <div style={{ display: "flex", gap: 8 }}>
                <NumberField label="X (mm)" value={draft.profiles[m].x} width={74} onChange={(v) => patch((n) => { n.profiles[m].x = v; })} />
                <NumberField label="Y (mm)" value={draft.profiles[m].y} width={74} onChange={(v) => patch((n) => { n.profiles[m].y = v; })} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <NumberField label="Default calibration X (mm)" value={draft.print.calibration.defaultX} onChange={(v) => patch((n) => { n.print.calibration.defaultX = v; })} width={110} />
          <NumberField label="Default calibration Y (mm)" value={draft.print.calibration.defaultY} onChange={(v) => patch((n) => { n.print.calibration.defaultY = v; })} width={110} />
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Fields ({Object.keys(draft.fields).length}) — every field carries its own label and kind
          </h3>
          <button type="button" className="button small secondary" onClick={addField}>
            + Add Field
          </button>
        </div>
        {Object.values(draft.fields)
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .map((field) => (
            <div
              key={field.key}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: 12,
                display: "grid",
                gap: 8,
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <TextField label="Key" value={field.key} width={110} onChange={(v) => {
                  const key = v;
                  patch((n) => {
                    const f = n.fields[field.key];
                    delete n.fields[field.key];
                    n.fields[key] = { ...f, key };
                  });
                }} />
                <TextField label="Label" value={field.label} width={200} onChange={(v) => updateField(field.key, { label: v })} />
                <label style={{ display: "grid", gap: 2, fontSize: "0.75rem", color: "var(--text-muted)", minWidth: 120 }}>
                  Kind
                  <select
                    value={field.kind}
                    onChange={(e) => updateField(field.key, { kind: e.target.value as FieldKind })}
                    className="field-select"
                    style={{ fontSize: "0.8rem" }}
                  >
                    {FIELD_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 2, fontSize: "0.75rem", color: "var(--text-muted)", minWidth: 120 }}>
                  Align
                  <select
                    value={field.align ?? "left"}
                    onChange={(e) => updateField(field.key, { align: e.target.value as "left" | "center" | "right" })}
                    className="field-select"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <option value="left">left</option>
                    <option value="center">center</option>
                    <option value="right">right</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="text-button"
                  style={{ fontSize: "0.75rem", color: "var(--danger)" }}
                  onClick={() => removeField(field.key)}
                >
                  Remove
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <NumberField label="X (mm)" value={field.x} width={74} onChange={(v) => updateField(field.key, { x: v })} />
                <NumberField label="Y (mm)" value={field.y} width={74} onChange={(v) => updateField(field.key, { y: v })} />
                <NumberField label="Width (mm)" value={field.width} width={78} onChange={(v) => updateField(field.key, { width: v })} />
                <NumberField label="Font (pt)" value={field.fontSize ?? 10} step={0.5} width={70} onChange={(v) => updateField(field.key, { fontSize: v })} />
                <NumberField label="Min font (pt)" value={field.minFontSize ?? 7} step={0.5} width={78} onChange={(v) => updateField(field.key, { minFontSize: v })} />
                <NumberField label="Letter spacing (mm)" value={field.letterSpacing ?? 0} step={0.05} width={100} onChange={(v) => updateField(field.key, { letterSpacing: v })} />
                <TextField label="Static text" value={field.text ?? ""} width={180} onChange={(v) => updateField(field.key, { text: v })} />
              </div>
            </div>
          ))}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Reserved Zones (Never Printed)</h3>
        {(draft.safeZones ?? []).map((zone) => (
          <div key={zone.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <TextField label="Zone id" value={zone.id} width={100} onChange={(v) => updateSafeZone(zone.id, { id: v })} />
            <NumberField label="X" value={zone.x} width={70} onChange={(v) => updateSafeZone(zone.id, { x: v })} />
            <NumberField label="Y" value={zone.y} width={70} onChange={(v) => updateSafeZone(zone.id, { y: v })} />
            <NumberField label="Width" value={zone.width} width={70} onChange={(v) => updateSafeZone(zone.id, { width: v })} />
            <NumberField label="Height" value={zone.height} width={70} onChange={(v) => updateSafeZone(zone.id, { height: v })} />
          </div>
        ))}
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          The MICR/security band is pre-printed by the bank. Any printable field overlapping a reserved zone blocks saving
          and printing.
        </p>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Verification</h3>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Browser-verified means the preview renders correctly. Physically-calibrated means real cheque stock was measured —
          only set it after an actual sheet test.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "grid", gap: 2, fontSize: "0.75rem", color: "var(--text-muted)", minWidth: 140 }}>
            Status
            <select
              value={draft.verification?.status ?? "unverified"}
              onChange={(e) => patch((n) => { n.verification = { ...n.verification, status: e.target.value as VerificationStatus }; })}
              className="field-select"
              style={{ fontSize: "0.8rem" }}
            >
              {VERIFICATION.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <TextField
            label="Verified on (YYYY-MM-DD)"
            value={draft.verification?.verifiedAt ?? ""}
            width={140}
            onChange={(v) => patch((n) => { n.verification = { ...n.verification, verifiedAt: v || undefined }; })}
          />
          <TextField
            label="Note"
            value={draft.verification?.note ?? ""}
            width={320}
            onChange={(v) => patch((n) => { n.verification = { ...n.verification, note: v }; })}
          />
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Preview &amp; Test Print</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} />
              guides
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ProfileKey)}
              className="field-select"
              style={{ fontSize: "0.8rem" }}
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button type="button" className="button small secondary" onClick={testPrint}>
              Test Print
            </button>
          </div>
        </div>
        <div style={{ overflow: "auto", background: "var(--surface-secondary)", padding: 12, borderRadius: "var(--radius-sm)" }}>
          <ChequeSheet
            template={draft}
            data={SAMPLE_DATA}
            mode={mode}
            calibration={{ x: draft.print.calibration.defaultX, y: draft.print.calibration.defaultY }}
            variant="preview"
            debugMode={showGuides}
          />
        </div>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
          Paper {paper.label} · @page {geom.pageW} × {geom.pageH} mm · cheque at X {geom.chequeX} / Y {geom.chequeY} mm
        </p>
        <TemplateMeta template={draft} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="button" disabled={errors.length > 0} onClick={() => onSave(draft)}>
          Save Template
        </button>
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

