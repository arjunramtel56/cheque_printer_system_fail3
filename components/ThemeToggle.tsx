"use client";

// ---------------------------------------------------------------------------
// ThemeToggle — cycles between light, dark, and system themes.
//
// Uses the zero-dependency theme system in src/lib/theme.ts. Icons are SVG
// (no emoji) for broad device support. Labels are localized.
//
// Security: theme is purely a CSS class change — it never touches
// PDF generation, amount validation, or MICR safety logic.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { getInitialTheme, getStoredTheme, setTheme, type Theme, resolveTheme, watchSystemTheme } from "@/lib/theme";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "☀️ Light" },
  { value: "dark", label: "🌙 Dark" },
  { value: "system", label: "💻 System" },
];

export function ThemeToggle() {
  const { t } = useTranslation();
  const [resolved, setResolved] = useState<"light" | "dark">(() => getInitialTheme());
  const [stored, setStored] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    const unsubscribe = watchSystemTheme((next) => {
      // Only react to system changes if we're in "system" mode
      if (stored === "system") setResolved(next);
    });
    return unsubscribe;
  }, [stored]);

  function cycleTheme() {
    const currentIndex = THEMES.findIndex((th) => th.value === stored);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    const next = THEMES[nextIndex];
    setStored(next.value);
    setTheme(next.value);
    setResolved(resolveTheme(next.value));
  }

  const currentIcon = resolved === "dark" ? (
    <svg className="theme-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ) : (
    <svg className="theme-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="button small secondary"
      style={{ fontSize: "0.78rem", padding: "6px 10px" }}
      aria-label={stored === "system" ? t("themeToggleSystem") : stored === "dark" ? t("themeToggleLight") : t("themeToggleDark")}
      title={stored === "system" ? t("themeToggleSystem") : stored === "dark" ? t("themeToggleLight") : t("themeToggleDark")}
    >
      {currentIcon}
      <span style={{ marginLeft: 4 }}>{THEMES.find((th) => th.value === stored)?.label ?? THEMES[0].label}</span>
    </button>
  );
}
