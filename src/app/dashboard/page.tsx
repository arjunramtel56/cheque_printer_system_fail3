"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileText,
  Printer,
  XCircle,
} from "lucide-react";

import Sidebar from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";
import type { ChequeRecord } from "@/lib/types";

function statusStyle(status: string) {
  if (status === "printed") {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }
  if (status === "draft") {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
  }
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

function formatAmount(amount: number) {
  return `NPR ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const { role } = useUserRole();
  const [stats, setStats] = useState({ total: 0, printed: 0, draft: 0, cancelled: 0 });
  const [recentCheques, setRecentCheques] = useState<ChequeRecord[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data: cheques } = await supabase
        .from("cheques")
        .select("*")
        .order("created_at", { ascending: false }) as { data: ChequeRecord[] | null };

      if (cheques) {
        setRecentCheques(cheques.slice(0, 5));
        setStats({
          total: cheques.length,
          printed: cheques.filter((c) => c.status === "printed").length,
          draft: cheques.filter((c) => c.status === "draft").length,
          cancelled: cheques.filter((c) => c.status === "cancelled").length,
        });
      }
    }
    fetchData();
  }, []);

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
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
            Dashboard
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <LanguageToggle />
            <Link
              href="/dashboard/cheques/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--brand-blue)",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "var(--radius-control)",
                fontWeight: 600,
                fontSize: "0.88rem",
                textDecoration: "none",
              }}
            >
              <FilePlus2 size={16} />
              New Cheque
            </Link>
          </div>
        </header>

        <main style={{ flex: 1, padding: "30px" }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 32 }}>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "color-mix(in srgb, var(--brand-blue) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={20} style={{ color: "var(--brand-blue)" }} />
              </div>
              <div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>Total Cheques</p>
                <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>{stats.total}</p>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "color-mix(in srgb, var(--success) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Printer size={20} style={{ color: "var(--success)" }} />
              </div>
              <div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>Printed</p>
                <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>{stats.printed}</p>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "color-mix(in srgb, var(--warning) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock3 size={20} style={{ color: "var(--warning)" }} />
              </div>
              <div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>Draft</p>
                <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>{stats.draft}</p>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "color-mix(in srgb, var(--danger) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <XCircle size={20} style={{ color: "var(--danger)" }} />
              </div>
              <div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>Cancelled</p>
                <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>{stats.cancelled}</p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 24, gridTemplateColumns: "2fr 1fr" }}>
            {/* Recent Cheques */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Recent Cheques</h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                    Your latest cheque records
                  </p>
                </div>
                <Link href="/dashboard/cheques" className="text-button" style={{ fontSize: "0.82rem" }}>
                  View all <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
                </Link>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Cheque No.</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Payee</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Amount</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Date</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCheques.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "32px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                          No cheques yet. Create your first cheque.
                        </td>
                      </tr>
                    ) : (
                      recentCheques.map((cheque) => (
                        <tr key={cheque.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "12px", fontFamily: "var(--font-mono)", color: "var(--brand-blue)", fontWeight: 600 }}>{cheque.cheque_number}</td>
                          <td style={{ padding: "12px" }}>{cheque.payee_name}</td>
                          <td style={{ padding: "12px", fontWeight: 600 }}>{formatAmount(cheque.amount)}</td>
                          <td style={{ padding: "12px", color: "var(--text-muted)" }}>{cheque.cheque_date}</td>
                          <td style={{ padding: "12px" }}>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(cheque.status)}`}>
                              {cheque.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>Quick Actions</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 20 }}>
                Frequently used options
              </p>

              <div style={{ display: "grid", gap: 10 }}>
                <Link
                  href="/dashboard/cheques/new"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px",
                    borderRadius: 12,
                    border: "1px solid color-mix(in srgb, var(--brand-blue) 20%, transparent)",
                    background: "color-mix(in srgb, var(--brand-blue) 5%, transparent)",
                    color: "var(--brand-blue)",
                    textDecoration: "none",
                    transition: "background 0.15s ease",
                  }}
                >
                  <FilePlus2 size={20} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.88rem", margin: 0 }}>New Cheque</p>
                    <p style={{ fontSize: "0.78rem", opacity: 0.7, margin: 0 }}>Create a new cheque</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/cheques"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    textDecoration: "none",
                    color: "var(--text-secondary)",
                    transition: "background 0.15s ease",
                  }}
                >
                  <FileText size={20} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.88rem", margin: 0 }}>Cheque History</p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>View all records</p>
                  </div>
                </Link>

                <Link
                  href="/overlay"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px",
                    borderRadius: 12,
                    border: "1px solid color-mix(in srgb, var(--brand-cyan) 20%, transparent)",
                    background: "color-mix(in srgb, var(--brand-cyan) 5%, transparent)",
                    color: "var(--brand-cyan)",
                    textDecoration: "none",
                    transition: "background 0.15s ease",
                  }}
                >
                  <FileText size={20} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.88rem", margin: 0 }}>Overlay Tool</p>
                    <p style={{ fontSize: "0.78rem", opacity: 0.7, margin: 0 }}>Upload cheque &amp; print overlay</p>
                  </div>
                </Link>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px",
                    borderRadius: 12,
                    border: "1px solid color-mix(in srgb, var(--success) 20%, transparent)",
                    background: "color-mix(in srgb, var(--success) 5%, transparent)",
                    color: "var(--success)",
                  }}
                >
                  <CheckCircle2 size={20} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.88rem", margin: 0 }}>System Status</p>
                    <p style={{ fontSize: "0.78rem", opacity: 0.7, margin: 0 }}>All systems active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
