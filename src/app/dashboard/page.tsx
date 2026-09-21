"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const { role } = useUserRole();
  const [stats, setStats] = useState({ total: 0, printed: 0, draft: 0, cancelled: 0 });
  const [recentCheques, setRecentCheques] = useState<ChequeRecord[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const { data: cheques } = await supabase
        .from("cheques")
        .select("*")
        .order("created_at", { ascending: false }) as { data: ChequeRecord[] | null };

      if (cheques) {
        setRecentCheques(cheques.slice(0, 5));
        
        const today = new Date().toISOString().slice(0, 10);
        const todayCheques = cheques.filter((c) => c.created_at?.startsWith(today));
        
        setTodayCount(todayCheques.length);
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main className="flex-1 p-5 md:p-8">
          <div className="mb-6 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
                Today
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Total Cheques: {stats.total} | Printed: {stats.printed} | Drafts: {stats.draft}
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
              title="Today"
              value={String(todayCount)}
              description="Cheques created today"
              icon={Calendar}
              color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
            />

            <StatCard
              title="Total Cheques"
              value={String(stats.total)}
              description="All cheque records"
              icon={FileText}
              color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            />

            <StatCard
              title="Printed"
              value={String(stats.printed)}
              description="Successfully printed"
              icon={Printer}
              color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300"
            />

            <StatCard
              title="Drafts"
              value={String(stats.draft)}
              description="Waiting for printing"
              icon={Clock3}
              color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300"
            />
          </div>

          <div className="mt-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Recent Cheques
                  </h2>
                </div>

                <Link
                  href="/dashboard/cheques/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <FilePlus2 size={16} />
                  Create New Cheque
                </Link>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-700">
                      <th className="pb-3 font-semibold">Payee</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentCheques.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          No cheques yet. Create your first cheque.
                        </td>
                      </tr>
                    ) : (
                      recentCheques.map((cheque) => (
                        <tr
                          key={cheque.id}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                        >
                          <td className="py-4 text-sm font-semibold text-slate-900 dark:text-white">
                            {cheque.payee_name}
                          </td>

                          <td className="py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatAmount(cheque.amount)}
                          </td>

                          <td className="py-4 text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(cheque.cheque_date)}
                          </td>

                          <td className="py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                                cheque.status,
                              )}`}
                            >
                              {cheque.status === "draft" ? "Draft Create New Cheque" : cheque.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
