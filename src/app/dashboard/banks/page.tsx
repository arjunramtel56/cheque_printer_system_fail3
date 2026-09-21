"use client";

import Link from "next/link";
import { ChevronLeft, CreditCard, Plus, CheckCircle, FileText } from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";

const bankTemplates = [
  {
    id: 1,
    bankName: "Nepal Bank Limited",
    status: "Active",
  },
  {
    id: 2,
    bankName: "Nabil Bank",
    status: "Active",
  },
  {
    id: 3,
    bankName: "Global IME Bank",
    status: "Draft",
  },
  {
    id: 4,
    bankName: "NIC Asia",
    status: "Active",
  },
  {
    id: 5,
    bankName: "Rastriya Banijya Bank",
    status: "Active",
  },
];

function statusStyle(status: string) {
  if (status === "Active") {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
}

export default function DashboardBanksPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-5 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Link
                href="/dashboard"
                className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <ChevronLeft size={16} />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Bank Templates
              </h1>
            </div>
            <Link
              href="/dashboard/banks/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Add New Template
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[500px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Bank Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {bankTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {template.bankName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle(
                          template.status,
                        )}`}
                      >
                        {template.status === "Active" && <CheckCircle size={12} />}
                        {template.status}
                      </span>
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
