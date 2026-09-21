"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileText, Search, Trash2, Printer } from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { supabase } from "@/lib/supabase";
import type { ChequeRecord, ChequeStatus } from "@/lib/types";

function statusStyle(status: ChequeStatus) {
  if (status === "printed") {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }
  if (status === "draft") {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
  }
  if (status === "cancelled") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function statusLabel(status: ChequeStatus) {
  if (status === "draft") return "Draft";
  if (status === "printed") return "Printed";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function formatAmount(amount: number) {
  return `NPR ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type FilterTab = "all" | ChequeStatus;

export default function ChequesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [cheques, setCheques] = useState<ChequeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchCheques() {
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Please login first.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("cheques")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCheques(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCheques();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this cheque record?")) return;

    const { error: deleteError } = await supabase
      .from("cheques")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setCheques((prev) => prev.filter((c) => c.id !== id));
  }

  const filtered = cheques.filter((c) => {
    const matchesSearch =
      c.payee_name.toLowerCase().includes(search.toLowerCase()) ||
      c.bank_name.toLowerCase().includes(search.toLowerCase()) ||
      c.cheque_number.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "all" || c.status === filter;

    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: cheques.length,
    draft: cheques.filter((c) => c.status === "draft").length,
    printed: cheques.filter((c) => c.status === "printed").length,
    cancelled: cheques.filter((c) => c.status === "cancelled").length,
  };

  const tabs: FilterTab[] = ["all", "draft", "printed", "cancelled"];

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
              Cheque History
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <LanguageToggle />
            <Link
              href="/dashboard/cheques/new"
              className="button"
              style={{ textDecoration: "none" }}
            >
              <FileText size={16} />
              New Cheque
            </Link>
          </div>
        </header>

        <main style={{ flex: 1, padding: "30px" }}>
          {/* Search */}
          <div style={{ marginBottom: 20, position: "relative", maxWidth: 400 }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
            />
            <input
              type="search"
              placeholder="Search cheque number, payee or bank..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 38px",
                borderRadius: "var(--radius-control)",
                border: "1px solid var(--border-strong)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "0.88rem",
              }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: filter === tab ? "1px solid var(--brand-blue)" : "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  background: filter === tab ? "var(--brand-blue)" : "var(--surface)",
                  color: filter === tab ? "#fff" : "var(--text-secondary)",
                }}
              >
                {tab === "all" ? "All" : statusLabel(tab)}
                <span style={{ marginLeft: 6, opacity: 0.7 }}>({counts[tab]})</span>
              </button>
            ))}
          </div>

          {error && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)", fontSize: "0.88rem", marginBottom: 20 }}>
              {error}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                Loading cheques...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
                <FileText size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  No cheques found.
                </p>
                <p style={{ fontSize: "0.85rem" }}>
                  {search || filter !== "all"
                    ? "Try changing your search or filter."
                    : "Create your first cheque."}
                </p>
                {!search && filter === "all" && (
                  <Link href="/dashboard/cheques/new" className="text-button" style={{ marginTop: 12, display: "inline-block" }}>
                    Create your first cheque
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-secondary)" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Cheque No.</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Payee</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Bank</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Amount</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Date</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((cheque) => (
                      <tr key={cheque.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "var(--brand-blue)", fontWeight: 600 }}>{cheque.cheque_number}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{cheque.payee_name}</td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{cheque.bank_name}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>{formatAmount(cheque.amount)}</td>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{cheque.cheque_date}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle(cheque.status)}`}>
                            {statusLabel(cheque.status)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                            <button
                              type="button"
                              style={{
                                padding: "6px 8px",
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                              }}
                              aria-label="Print"
                              title="Print"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              style={{
                                padding: "6px 8px",
                                borderRadius: 6,
                                border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
                                background: "var(--surface)",
                                color: "var(--danger)",
                                cursor: "pointer",
                              }}
                              aria-label="Delete"
                              title="Delete"
                              onClick={() => handleDelete(cheque.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
