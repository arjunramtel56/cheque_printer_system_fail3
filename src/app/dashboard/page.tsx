"use client";

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
import Topbar from "@/components/dashboard/topbar";
import StatCard from "@/components/dashboard/stat-card";
import { useUserRole } from "@/hooks/useUserRole";

const recentCheques = [
  {
    id: "CHQ-1001",
    payee: "ABC Suppliers Pvt. Ltd.",
    amount: "NPR 125,000",
    date: "2026-09-21",
    status: "Printed",
  },
  {
    id: "CHQ-1002",
    payee: "Ram Bahadur",
    amount: "NPR 45,500",
    date: "2026-09-20",
    status: "Draft",
  },
  {
    id: "CHQ-1003",
    payee: "Modern Traders",
    amount: "NPR 82,000",
    date: "2026-09-19",
    status: "Printed",
  },
];

function statusStyle(status: string) {
  if (status === "Printed") {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }

  if (status === "Draft") {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
  }

  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

export default function DashboardPage() {
  const { role } = useUserRole();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main className="flex-1 p-5 md:p-8">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium text-blue-600">
                User Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
                Cheque Overview
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                तपाईंको cheque records र printing activity manage गर्नुहोस्।
              </p>
            </div>

            <Link
              href="/dashboard/cheques/new"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <FilePlus2 size={18} />
              Create New Cheque
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Cheques"
              value="248"
              description="+12% from last month"
              icon={FileText}
              color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
            />

            <StatCard
              title="Printed Cheques"
              value="186"
              description="Successfully printed"
              icon={Printer}
              color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300"
            />

            <StatCard
              title="Draft Cheques"
              value="62"
              description="Waiting for printing"
              icon={Clock3}
              color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300"
            />

            <StatCard
              title="Cancelled"
              value="8"
              description="Cancelled cheque records"
              icon={XCircle}
              color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300"
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Recent Cheques
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    तपाईंका पछिल्ला cheque records
                  </p>
                </div>

                <Link
                  href="/dashboard/cheques"
                  className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View all
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-700">
                      <th className="pb-3 font-semibold">Cheque ID</th>
                      <th className="pb-3 font-semibold">Payee</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentCheques.map((cheque) => (
                      <tr
                        key={cheque.id}
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                      >
                        <td className="py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {cheque.id}
                        </td>

                        <td className="py-4 text-sm text-slate-700 dark:text-slate-300">
                          {cheque.payee}
                        </td>

                        <td className="py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {cheque.amount}
                        </td>

                        <td className="py-4 text-sm text-slate-500 dark:text-slate-400">
                          {cheque.date}
                        </td>

                        <td className="py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                              cheque.status,
                            )}`}
                          >
                            {cheque.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-900 dark:text-white">Quick Actions</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Frequently used options
              </p>

              <div className="mt-6 space-y-3">
                <Link
                  href="/dashboard/cheques/new"
                  className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300"
                >
                  <FilePlus2 size={20} />
                  <div>
                    <p className="text-sm font-semibold">New Cheque</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      Create a new cheque
                    </p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/cheques"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FileText size={20} />
                  <div>
                    <p className="text-sm font-semibold">Cheque History</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      View all records
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
                  <CheckCircle2 size={20} />
                  <div>
                    <p className="text-sm font-semibold">System Status</p>
                    <p className="text-xs text-green-600 dark:text-green-300">
                      All systems active
                    </p>
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
