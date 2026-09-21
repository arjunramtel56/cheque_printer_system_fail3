"use client";

import { Bell, Menu, Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { currentUserEmail } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function Topbar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    setUserEmail(currentUserEmail());
  }, []);

  const displayName = userEmail?.split("@")[0] ?? "User";

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">Good morning, {displayName}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            आजको cheque activity हेर्नुहोस्
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 md:flex">
          <Search size={17} className="text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-36 bg-transparent text-sm text-slate-600 outline-none dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        <button
          type="button"
          className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Notifications"
        >
          <Bell size={19} />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-700">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">User</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
