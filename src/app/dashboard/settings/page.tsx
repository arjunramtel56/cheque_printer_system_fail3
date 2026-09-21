"use client";

import Link from "next/link";
import { ChevronLeft, Printer, Save } from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-5 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-center gap-3">
              <Printer size={24} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Print Settings
              </h1>
            </div>

            <form className="grid gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Default Print Mode
                </label>
                <select
                  className="w-full md:w-64 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                  defaultValue="custom_short"
                >
                  <option value="custom_short">Custom Short</option>
                  <option value="custom_long">Custom Long</option>
                  <option value="a4_vertical">A4 Vertical</option>
                  <option value="a4_horizontal">A4 Horizontal</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Language
                </label>
                <select
                  className="w-full md:w-64 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                  defaultValue="en"
                >
                  <option value="en">English</option>
                  <option value="ne">नेपाली (Nepali)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900" />
                  Auto-open print dialog
                </label>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900" />
                  Print cheque notes on back
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Save size={16} />
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
