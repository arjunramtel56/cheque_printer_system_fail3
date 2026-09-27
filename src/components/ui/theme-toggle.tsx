"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type ThemeOption = { value: "light" | "dark" | "system"; icon: React.ReactNode; labelKey: string };

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", icon: <Sun className="h-4 w-4" />, labelKey: "light" },
  { value: "dark", icon: <Moon className="h-4 w-4" />, labelKey: "dark" },
  { value: "system", icon: <Monitor className="h-4 w-4" />, labelKey: "system" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, themeMode, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const currentIcon =
    themeMode === "system" ? (
      <Monitor className="h-4 w-4" />
    ) : theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("menuLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {currentIcon}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("menuLabel")}
          className="absolute right-0 z-50 mt-2 w-36 rounded-lg bg-popover border border-border shadow-lg"
        >
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={themeMode === option.value}
              onClick={() => {
                setTheme(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-accent hover:text-accent-foreground",
                themeMode === option.value
                  ? "text-accent-foreground font-medium bg-accent/60"
                  : "text-popover-foreground"
              )}
            >
              {option.icon}
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
