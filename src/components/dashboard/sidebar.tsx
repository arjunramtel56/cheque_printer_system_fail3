"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCircle,
  WalletCards,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const menuItems = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    key: "createCheque",
    href: "/dashboard/cheques/new",
    icon: FilePlus2,
    adminOnly: false,
  },
  {
    key: "chequeHistory",
    href: "/dashboard/cheques",
    icon: FileText,
    adminOnly: false,
  },
  {
    key: "bankAccounts",
    href: "/dashboard/banks",
    icon: WalletCards,
    adminOnly: false,
  },
  {
    key: "profile",
    href: "/dashboard/profile",
    icon: UserCircle,
    adminOnly: false,
  },
  {
    key: "settings",
    href: "/dashboard/settings",
    icon: Settings,
    adminOnly: false,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role, logout } = useUserRole();

  return (
    <aside className="hidden min-h-screen w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
          R
        </div>

        <div>
          <h1 className="font-bold text-slate-900 dark:text-white">Reactify</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cheque System
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Main Menu
        </p>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const labelEn = menuLabels[item.key].en;
            const labelNe = menuLabels[item.key].ne;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  isActive
                    ? "bg-blue-600 font-semibold text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/30"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                }`}
              >
                <Icon size={19} />
                <span>
                  <span className="block">{labelEn}</span>
                  <span
                    className={`text-[11px] ${
                      isActive ? "text-blue-100" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {labelNe}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <LogOut size={19} />
          Logout
        </button>
      </div>
    </aside>
  );
}

const menuLabels: Record<string, { en: string; ne: string }> = {
  dashboard: { en: "Dashboard", ne: "ड्यासबोर्ड" },
  createCheque: { en: "Create Cheque", ne: "चेक बनाउनुहोस्" },
  chequeHistory: { en: "Cheque History", ne: "चेक इतिहास" },
  bankAccounts: { en: "Bank Accounts", ne: "बैंक खाता" },
  profile: { en: "Profile", ne: "प्रोफाइल" },
  settings: { en: "Settings", ne: "सेटिङ" },
};
