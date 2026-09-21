"use client";

import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export default function TemplatesPage() {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 30px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", textDecoration: "none", fontSize: "0.88rem" }}>
              <ChevronLeft size={16} />
              Back
            </Link>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>Templates</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </header>

        <main style={{ flex: 1, padding: "30px" }}>
          <div className="card" style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
            <FileText size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Templates</p>
            <p style={{ fontSize: "0.85rem" }}>View and manage your cheque templates.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
