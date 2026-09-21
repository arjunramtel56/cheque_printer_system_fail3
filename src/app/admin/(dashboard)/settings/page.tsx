"use client";

import { useState } from "react";

const initialSettings = {
  systemName: "Reactify Cheque Printer System",
  allowUserRegistration: true,
  requireEmailVerification: false,
  defaultUserRole: "user",
  trialDays: 14,
  currency: "NPR",
  language: "en",
  timezone: "Asia/Kathmandu",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [saved, setSaved] = useState(false);

  function handleChange(key: keyof typeof initialSettings, value: unknown) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: "800px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "1.12rem", color: "var(--text-primary)" }}>System Settings</h2>
        <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-muted)" }}>
          Application-wide configuration for the cheque printing system.
        </p>
      </div>

      {saved && (
        <p style={{ color: "var(--success)", fontSize: "0.85rem", margin: 0 }}>
          Settings saved successfully.
        </p>
      )}

      <div className="card">
        <h3 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>General</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>System Name</label>
            <input
              type="text"
              value={settings.systemName}
              onChange={(e) => handleChange("systemName", e.target.value)}
              className="field-input"
              style={{ fontSize: "0.82rem" }}
            />
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              className="field-select"
              style={{ fontSize: "0.82rem" }}
            >
              <option value="NPR">NPR (Nepalese Rupee)</option>
              <option value="INR">INR (Indian Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Language</label>
            <select
              value={settings.language}
              onChange={(e) => handleChange("language", e.target.value)}
              className="field-select"
              style={{ fontSize: "0.82rem" }}
            >
              <option value="en">English</option>
              <option value="ne">नेपाली (Nepali)</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => handleChange("timezone", e.target.value)}
              className="field-select"
              style={{ fontSize: "0.82rem" }}
            >
              <option value="Asia/Kathmandu">Asia/Kathmandu</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Authentication</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={settings.allowUserRegistration}
              onChange={(e) => handleChange("allowUserRegistration", e.target.checked)}
            />
            <label style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>Allow user registration</label>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={settings.requireEmailVerification}
              onChange={(e) => handleChange("requireEmailVerification", e.target.checked)}
            />
            <label style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>Require email verification</label>
          </div>

          <div style={{ display: "grid", gap: 4, maxWidth: 200 }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Default User Role</label>
            <select
              value={settings.defaultUserRole}
              onChange={(e) => handleChange("defaultUserRole", e.target.value)}
              className="field-select"
              style={{ fontSize: "0.82rem" }}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 4, maxWidth: 200 }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Trial Days</label>
            <input
              type="number"
              min={0}
              value={settings.trialDays}
              onChange={(e) => handleChange("trialDays", Number(e.target.value))}
              className="field-input"
              style={{ fontSize: "0.82rem" }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="button" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  );
}
