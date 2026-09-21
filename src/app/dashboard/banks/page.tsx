"use client";

import Link from "next/link";
import { ChevronLeft, CreditCard, Plus } from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";

const bankAccounts = [
  {
    id: 1,
    bankName: "Nepal Bank Limited",
    branchName: "Thamel Branch",
    accountName: "Ram Bahadur Karki",
    accountNumber: "012345678901",
    chequePrefix: "NBL",
  },
  {
    id: 2,
    bankName: "Nabil Bank Limited",
    branchName: "Durbar Square Branch",
    accountName: "Sita Kumari Shrestha",
    accountNumber: "415678901234",
    chequePrefix: "NBL",
  },
  {
    id: 3,
    bankName: "Siddhartha Bank Limited",
    branchName: "New Road Branch",
    accountName: "Krishna Prasad",
    accountNumber: "312345678901",
    chequePrefix: "SBI",
  },
];

export default function DashboardBanksPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-5 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <ChevronLeft size={16} />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                My Bank Accounts
              </h1>
            </div>
            <Link
              href="/dashboard/banks/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Bank Account
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Bank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Branch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Account Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Account Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Cheque Prefix
                  </th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {account.bankName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {account.branchName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {account.accountName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {account.accountNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {account.chequePrefix}
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
