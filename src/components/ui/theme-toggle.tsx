"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, themeMode, setTheme } = useTheme();
  const t = useTranslations("theme");

  const currentIcon =
    themeMode === "system" ? (
      <Monitor className="h-4 w-4" />
    ) : theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const menu = document.getElementById("themeMenu");
          if (menu) menu.classList.toggle("hidden");
        }}
        aria-label={t("menuLabel")}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
          className
        )}
      >
        {currentIcon}
      </button>

      <div
        id="themeMenu"
        className="hidden absolute right-0 mt-2 w-36 rounded-lg bg-popover border shadow-lg border-border"
      >
        <button
          onClick={() => {
            setTheme("light");
            document.getElementById("themeMenu")?.classList.add("hidden");
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-accent rounded-t-lg"
        >
          <span className="mr-2">☀️</span>
          {t("light")}
        </button>
        <button
          onClick={() => {
            setTheme("dark");
            document.getElementById("themeMenu")?.classList.add("hidden");
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-accent"
        >
          <span className="mr-2">🌙</span>
          {t("dark")}
        </button>
        <button
          onClick={() => {
            setTheme("system");
            document.getElementById("themeMenu")?.classList.add("hidden");
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-accent rounded-b-lg"
        >
          <span className="mr-2">💻</span>
          {t("system")}
        </button>
      </div>
    </div>
  );
}
