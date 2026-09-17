"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TemplateEditor from "@/components/admin/TemplateEditor";
import { getBanks, initBankCatalogue } from "@/lib/catalogue";
import { getTemplate, initRuntimeTemplates, loadAdminTemplates, saveAdminTemplates } from "@/lib/templates";
import { initChequeSizes } from "@/lib/sizes";
import type { BankTemplate } from "@/lib/types";

export default function AdminTemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [template, setTemplate] = useState<BankTemplate | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    initChequeSizes();
    initBankCatalogue();
    initRuntimeTemplates();
    const found = getTemplate(id);
    setTemplate(found ? structuredClone(found) : null);
    setReady(true);
  }, [id]);

  function handleSave(updated: BankTemplate) {
    try {
      const others = loadAdminTemplates().filter((t) => t.id !== id && t.id !== updated.id);
      saveAdminTemplates([...others, updated]);
      router.push("/admin/templates");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!ready) return <p style={{ color: "var(--text-muted)" }}>Loading template…</p>;
  if (!template) {
    return (
      <div className="card">
        <p className="error-state" style={{ margin: 0 }}>Template “{id}” was not found.</p>
        <Link href="/admin/templates" className="text-button">← Back to templates</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <Link href="/admin/templates" className="text-button" style={{ fontSize: "0.82rem" }}>← Templates</Link>
        <h2 style={{ margin: "6px 0 2px 0", fontSize: "1.12rem" }}>Edit {template.id}</h2>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
          Physical size, orientation, fields and reserved zones are all data — the print engine reads them directly.
        </p>
      </div>
      <TemplateEditor
        template={template}
        banks={getBanks()}
        onSave={handleSave}
        onCancel={() => router.push("/admin/templates")}
        error={error}
      />
    </div>
  );
}
