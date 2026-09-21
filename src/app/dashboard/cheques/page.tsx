"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Download, FileText, Search, Trash2, Users } from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";

const cheques = [
  {
    id: "CHQ-1001",
    payee: "ABC Suppliers Pvt. Ltd.",
    amount: "NPR 125,000",
    date: "2026-09-21",
    status: "Printed",
    bank: "Nepal Bank Limited",
  },
  {
    id: "CHQ-1002",
    payee: "Ram Bahadur",
    amount: "NPR 45,500",
    date: "2026-09-20",
    status: "Draft",
    bank: "Nepal Bank Limited",
  },
  {
    id: "CHQ-1003",
    payee: "Modern Traders",
    amount: "NPR 82,000",
    date: "2026-09-19",
    status: "Printed",
    bank: "Siddhartha Bank Limited",
  },
  {
    id: "CHQ-1004",
    payee: "Kathmandu Trading Co.",
    amount: "NPR 210,750",
    date: "2026-09-18",
    status: "Cancelled",
    bank: "Nepal Bank Limited",
  },
  {
    id: "CHQ-1005",
    payee: "Shyam Electronics",
    amount: "NPR 15,000",
    date: "2026-09-17",
    status: "Printed",
    bank: "Nabil Bank Limited",
  },
];

function statusStyle(status: string) {
  if (status === "Printed") {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }
  if (status === "Draft") {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
  }
  if (status === "Cancelled") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default function ChequesPage() {
  const [search, setSearch] = useState("");

  const filtered = cheques.filter(
    (c) =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.payee.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-5 md:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <ChevronLeft size={16} />
                Back to Dashboard
              </Link>
            </div>
            <Link
              href="/dashboard/cheques/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <FileText size={16} />
              New Cheque
            </Link>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                type="search"
                placeholder="Search cheques..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Cheque ID
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
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                      {cheque.id}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {cheque.payee}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {cheque.bank}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {cheque.amount}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {cheque.date}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle(cheque.status)}`}
                      >
                        {cheque.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                          aria-label={`Export ${cheque.id}`}
                          title="Export"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-300 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                          aria-label={`Delete ${cheque.id}`}
                          title="Delete"
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
        </main>
      </div>
    </div>
  );
}
