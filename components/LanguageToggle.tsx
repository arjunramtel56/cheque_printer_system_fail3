// ---------------------------------------------------------------------------
// LanguageToggle — a bilingual (English / नेपाली) toggle button.
//
// Uses the useTranslation hook. Persists the choice in localStorage so the
// user's language preference survives page reloads. No API calls, no server
// round-trips, no external dependencies — the locale is read entirely client-
// side and the translations are static JSON bundles.
// ---------------------------------------------------------------------------

"use client";

import { useTranslation } from "@/lib/i18n";

export function LanguageToggle() {
  const { toggleLocale, locale } = useTranslation();
  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="button small secondary"
      style={{ fontSize: "0.78rem" }}
      aria-label={locale === "en" ? "Switch to Nepali" : "Switch to English"}
    >
      {locale === "en" ? "नेपालीमा स्विच गर्नुहोस्" : "Switch to English"}
    </button>
  );
}
