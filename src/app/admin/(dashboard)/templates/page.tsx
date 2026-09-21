"use client";

import TemplateWorkbench from "@/components/admin/TemplateWorkbench";

export default function AdminTemplatesPage() {
  return (
    <div style={{ display: "grid", gap: 20, maxWidth: "1000px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "1.12rem", color: "var(--text-primary)" }}>Cheque Templates</h2>
        <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-muted)" }}>
          Each template defines its own physical size, orientation, field positions, reserved zones and print profiles.
          Committed data in <code style={{ fontSize: "0.8rem" }}>data/templates.ts</code> stays authoritative — export verified work and commit it.
        </p>
      </div>
      <TemplateWorkbench />
    </div>
  );
}
