"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileText, Search, Trash2, Printer } from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";
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
      setError("कृपया login गर्नुहोस्।");
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
    if (!confirm("यो cheque record delete गर्न चाहनुहुन्छ?")) return;

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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-5 md:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/dashboard"
                className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <ChevronLeft size={16} />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Cheque History
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                तपाईंले save गरेका सबै cheque records यहाँ देखिन्छन्।
              </p>
            </div>
            <Link
              href="/dashboard/cheques/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <FileText size={16} />
              New Cheque
            </Link>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                type="search"
                placeholder="Cheque number, payee वा bank खोज्नुहोस्..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
              />
            </div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === tab
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {tab === "all" ? "All" : statusLabel(tab)}
                <span className="ml-1.5 text-xs opacity-70">({counts[tab]})</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-sm text-slate-500 dark:text-slate-400">
                Loading cheques...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12 text-slate-500 dark:text-slate-400">
                <FileText size={36} className="opacity-40" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  कुनै cheque भेटिएन।
                </p>
                <p className="text-sm">
                  {search || filter !== "all"
                    ? "Search वा filter change गरेर प्रयास गर्नुहोस्।"
                    : "पहिले नयाँ cheque create गर्नुहोस्।"}
                </p>
                {!search && filter === "all" && (
                  <Link
                    href="/dashboard/cheques/new"
                    className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Create your first cheque
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      Cheque No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      Payee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      Bank
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cheque) => (
                    <tr
                      key={cheque.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">
                        {cheque.cheque_number}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {cheque.payee_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {cheque.bank_name}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatAmount(cheque.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {cheque.cheque_date}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle(cheque.status)}`}
                        >
                          {statusLabel(cheque.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                            aria-label="Print"
                            title="Print"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-300 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
