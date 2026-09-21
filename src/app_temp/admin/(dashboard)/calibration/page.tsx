"use client";

import { useEffect, useMemo, useState } from "react";
import type { BankTemplate, ProfileKey } from "@/lib/types";
import { initRuntimeTemplates, loadAdminTemplates, upsertTemplate } from "@/lib/templates";
import { initChequeSizes } from "@/lib/sizes";
import { CALIBRATION_MAX_MM, CALIBRATION_MIN_MM, CALIBRATION_STEP_MM, clearCalibrations, loadCalibrations } from "@/lib/calibration";
import { calibrationLimits, resolvePrintGeometry } from "@/lib/printGeometry";
import { VerificationBadge } from "@/components/CatalogueBadges";

const MODES: ProfileKey[] = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];

/**
 * Calibration administration.
 *
 * Two distinct numbers exist for every (template, print mode):
 *   - the template DEFAULT, which ships with the layout and is edited here;
 *   - the user's own override, stored in the browser, which is applied on top.
 * Neither ever changes the cheque's physical size — they translate the output
 * along X and Y only.
 */
export default function AdminCalibrationPage() {
  const [templates, setTemplates] = useState<BankTemplate[]>([]);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    initChequeSizes();
    initRuntimeTemplates();
    setTemplates(loadAdminTemplates());
  }, []);

  const overrides = useMemo(() => loadCalibrations(), [version]);

  function setDefault(template: BankTemplate, mode: ProfileKey, axis: "x" | "y", value: number) {
    const next = structuredClone(template);
    const clamped = Math.max(CALIBRATION_MIN_MM, Math.min(CALIBRATION_MAX_MM, Number.isFinite(value) ? value : 0));
    if (axis === "x") next.print.calibration.defaultX = Math.round(clamped * 10) / 10;
    else next.print.calibration.defaultY = Math.round(clamped * 10) / 10;
    try {
      upsertTemplate(next);
      setTemplates(loadAdminTemplates());
      setMessage(`Updated default ${axis.toUpperCase()} for ${template.id} (${mode}).`);
    } catch (e) {
      setMessage(`Could not save: ${(e as Error).message}`);
    }
  }

  function resetUserOverrides() {
    if (!window.confirm("Reset every per-template calibration override stored in this browser?")) return;
    clearCalibrations();
    setVersion((v) => v + 1);
    setMessage("Cleared all user calibration overrides.");
  }

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: "1000px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "1.12rem", color: "var(--text-primary)" }}>Calibration</h2>
        <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-muted)" }}>
          Defaults ship with each template and are applied when a user has no override. Adjust in {CALIBRATION_STEP_MM} mm steps
          within ±{CALIBRATION_MAX_MM} mm. X moves the output horizontally only, Y vertically only, and neither changes the
          cheque's physical dimensions.
        </p>
      </div>

      {message && <p style={{ color: "var(--success)", fontSize: "0.85rem", margin: 0 }}>{message}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="button small secondary" onClick={resetUserOverrides}>
          Reset User Overrides ({Object.keys(overrides).length})
        </button>
      </div>

      {templates.map((template) => {
        const limits = MODES.reduce<Record<string, { minX: number; maxX: number; minY: number; maxY: number }>>((acc, mode) => {
          acc[mode] = calibrationLimits(template, mode);
          return acc;
        }, {});
        return (
          <div key={template.id} className="card" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <b style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{template.bankName}</b>
              <span style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "var(--text-muted)" }}>{template.id}</span>
              <VerificationBadge status={template.verification?.status ?? "unverified"} />
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                {template.widthMm} × {template.heightMm} mm · {template.orientation}
              </span>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {MODES.filter((m) => template.print?.supportedModes?.includes(m)).map((mode) => {
                const geom = resolvePrintGeometry(template, mode);
                const key = `${template.id}:${mode}`;
                const override = overrides[key];
                return (
                  <div
                    key={mode}
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "flex-end",
                      borderTop: "1px solid var(--border)",
                      paddingTop: 8,
                    }}
                  >
                    <b style={{ fontSize: "0.8rem", minWidth: 130, color: "var(--text-secondary)" }}>{mode}</b>
                    <label style={{ display: "grid", gap: 2, fontSize: "0.72rem", color: "var(--text-muted)", minWidth: 120 }}>
                      Default X (mm)
                      <input
                        type="number"
                        step={CALIBRATION_STEP_MM}
                        value={template.print.calibration.defaultX}
                        onChange={(e) => setDefault(template, mode, "x", Number(e.target.value))}
                        className="field-input"
                        style={{ width: 90, fontSize: "0.8rem" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: "0.72rem", color: "var(--text-muted)", minWidth: 120 }}>
                      Default Y (mm)
                      <input
                        type="number"
                        step={CALIBRATION_STEP_MM}
                        value={template.print.calibration.defaultY}
                        onChange={(e) => setDefault(template, mode, "y", Number(e.target.value))}
                        className="field-input"
                        style={{ width: 90, fontSize: "0.8rem" }}
                      />
                    </label>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      @page {geom.pageW} × {geom.pageH} mm · cheque at X {geom.chequeX} / Y {geom.chequeY} mm
                      <br />
                      safe range X {limits[mode].minX.toFixed(1)} ... {limits[mode].maxX.toFixed(1)} mm · Y {limits[mode].minY.toFixed(1)} ...{" "}
                      {limits[mode].maxY.toFixed(1)} mm
                      <br />
                      user override: {override ? `X ${override.x} mm · Y ${override.y} mm` : "none"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
