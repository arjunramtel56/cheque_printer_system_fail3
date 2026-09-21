"use client";

import Link from "next/link";
import { ChevronLeft, Save } from "lucide-react";
import { useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export default function SettingsPage() {
  const [defaultPrintMode, setDefaultPrintMode] = useState("custom_short");
  const [language, setLanguage] = useState("en");
  const [autoOpenPrint, setAutoOpenPrint] = useState(true);
  const [showMicrGuide, setShowMicrGuide] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 30px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--text-muted)",
                textDecoration: "none",
                fontSize: "0.88rem",
              }}
            >
              <ChevronLeft size={16} />
              Back
            </Link>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
              Settings
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </header>

        <main style={{ flex: 1, padding: "30px" }}>
          <div className="card" style={{ maxWidth: 700 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 24 }}>Print Settings</h2>

            <form className="grid gap-5">
              <div className="field">
                <label>Default Print Mode</label>
                <select
                  value={defaultPrintMode}
                  onChange={(e) => setDefaultPrintMode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-control)",
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: "0.92rem",
                  }}
                >
                  <option value="custom_short">Direct Feed · Short Edge First</option>
                  <option value="custom_long">Direct Feed · Long Edge First</option>
                  <option value="a4_vertical">A4 Carrier · Portrait</option>
                  <option value="a4_horizontal">A4 Carrier · Landscape</option>
                </select>
                <small style={{ display: "block", marginTop: 5, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  This mode is used by default when creating new cheques.
                </small>
              </div>

              <div className="field">
                <label>Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-control)",
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: "0.92rem",
                  }}
                >
                  <option value="en">English</option>
                  <option value="ne">नेपाली (Nepali)</option>
                </select>
              </div>

              <div className="field check">
                <input
                  id="auto-open-print"
                  type="checkbox"
                  checked={autoOpenPrint}
                  onChange={(e) => setAutoOpenPrint(e.target.checked)}
                />
                <label htmlFor="auto-open-print" style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                  Auto-open print dialog after preview
                </label>
              </div>

              <div className="field check">
                <input
                  id="show-micr-guide"
                  type="checkbox"
                  checked={showMicrGuide}
                  onChange={(e) => setShowMicrGuide(e.target.checked)}
                />
                <label htmlFor="show-micr-guide" style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                  Show MICR safety guide before printing
                </label>
              </div>

              {/* Advanced Settings */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
                <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Advanced Settings
                </h3>

                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="field">
                      <label>Default X Offset (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="-25"
                        max="25"
                        defaultValue="0"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-control)",
                          border: "1px solid var(--border-strong)",
                          background: "var(--surface)",
                          color: "var(--text-primary)",
                          fontSize: "0.92rem",
                        }}
                      />
                      <small style={{ display: "block", marginTop: 5, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Horizontal offset for all cheques (-25 to +25 mm)
                      </small>
                    </div>

                    <div className="field">
                      <label>Default Y Offset (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="-25"
                        max="25"
                        defaultValue="0"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-control)",
                          border: "1px solid var(--border-strong)",
                          background: "var(--surface)",
                          color: "var(--text-primary)",
                          fontSize: "0.92rem",
                        }}
                      />
                      <small style={{ display: "block", marginTop: 5, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Vertical offset for all cheques (-25 to +25 mm)
                      </small>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="field">
                      <label>Font Size Override (pt)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="6"
                        max="16"
                        defaultValue=""
                        placeholder="Auto"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-control)",
                          border: "1px solid var(--border-strong)",
                          background: "var(--surface)",
                          color: "var(--text-primary)",
                          fontSize: "0.92rem",
                        }}
                      />
                      <small style={{ display: "block", marginTop: 5, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Leave empty to use template default
                      </small>
                    </div>

                    <div className="field">
                      <label>Bank Template</label>
                      <select
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-control)",
                          border: "1px solid var(--border-strong)",
                          background: "var(--surface)",
                          color: "var(--text-primary)",
                          fontSize: "0.92rem",
                        }}
                      >
                        <option value="">Use per-bank setting</option>
                        <option value="nepal_bank">Nepal Bank Limited</option>
                        <option value="nabil">Nabil Bank</option>
                        <option value="nica">NICA (Rastriya Banijya)</option>
                        <option value="siddhartha">Siddhartha Bank</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label>Paper Size</label>
                    <select
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-control)",
                        border: "1px solid var(--border-strong)",
                        background: "var(--surface)",
                        color: "var(--text-primary)",
                        fontSize: "0.92rem",
                      }}
                    >
                      <option value="cheque">Standard Cheque (190.5 x 88.9 mm)</option>
                      <option value="a4_landscape">A4 Landscape (297 x 210 mm)</option>
                      <option value="a4_portrait">A4 Portrait (210 x 297 mm)</option>
                    </select>
                    <small style={{ display: "block", marginTop: 5, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      Standard cheque size is recommended for most printers.
                    </small>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" className="button">
                  <Save size={16} />
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
