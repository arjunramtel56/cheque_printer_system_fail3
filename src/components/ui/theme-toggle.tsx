"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, themeMode, setTheme } = useTheme();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const menu = document.getElementById("themeMenu");
          if (menu) menu.classList.toggle("hidden");
        }}
        aria-label="Theme menu"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
          className
        )}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
          <span className="mr-2">☀️</span>Light
        </button>
        <button
          onClick={() => {
            setTheme("dark");
            document.getElementById("themeMenu")?.classList.add("hidden");
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-accent"
        >
          <span className="mr-2">🌙</span>Dark
        </button>
        <button
          onClick={() => {
            setTheme("system");
            document.getElementById("themeMenu")?.classList.add("hidden");
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-accent rounded-b-lg"
        >
          <span className="mr-2">💻</span>System
        </button>
      </div>
    </div>
  );
}
