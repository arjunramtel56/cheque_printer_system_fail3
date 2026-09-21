// ---------------------------------------------------------------------------
// Lightweight, dependency-free i18n for the cheque printer.
//
// Design goals (and why they matter in the Nepal context):
//   - No external translation APIs. Financial terms never leave the browser.
//   - Static JSON bundles are imported at build time; only the selected locale
//     is ever bundled into the client, so the unused language adds ~0 bytes.
//   - User's choice is persisted in localStorage and survives reloads.
//   - SSR-safe: the hook detects a server environment and defaults to "en"
//     so server-rendered pages never throw on window/localStorage access.
//   - A `t()` helper returns the key itself when a translation is missing,
//     so a forgotten key fails open and loudly in the UI rather than crashing.
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from "react";

const LOCALES = ["en", "ne"] as const;
type Locale = (typeof LOCALES)[number];

export type { Locale };
export { LOCALES };

const STORAGE_KEY = "chequePrintLang";

/** In-memory cache so we don't re-fetch the same locale module on every toggle. */
const localeCache: Partial<Record<Locale, Record<string, string>>> = {};

/** Load a locale's translations (cached after first load). */
async function loadLocale(locale: Locale): Promise<Record<string, string>> {
  if (localeCache[locale]) return localeCache[locale];
  try {
    const module = await import(`./locales/${locale}.json`, {
      with: { type: "json" },
    });
    const translations = (module.default ?? module) as Record<string, unknown> as Record<string, string>;
    localeCache[locale] = translations;
    return translations;
  } catch {
    if (locale !== "en" && localeCache.en) return localeCache.en;
    const enModule = await import("./locales/en.json", {
      with: { type: "json" },
    });
    const translations = (enModule.default ?? enModule) as Record<string, unknown> as Record<string, string>;
    localeCache.en = translations;
    return translations;
  }
}

/** Read the persisted locale from localStorage (SSR-safe, returns "en" fallback). */
function readStoredLocale(): Locale {
  if (typeof window === "undefined" || !window.localStorage) return "en";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;
  } catch {
    // ignore
  }
  return "en";
}

/** Detect the browser's preferred locale from Accept-Language when no user
 *  choice has been persisted yet. Falls back to "en" if nothing matches. */
function detectPreferredLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  for (const lang of navigator.languages ?? []) {
    const short = lang.slice(0, 2);
    if (short === "ne") return "ne";
  }
  return "en";
}

export interface UseTranslationResult {
  t: (key: string, ...interpolations: unknown[]) => string;
  locale: Locale;
  toggleLocale: () => void;
  setLocale: (locale: Locale) => void;
}

/**
 * useTranslation — a tiny, SSR-safe hook for bilingual (en/ne) UI text.
 *
 * ```tsx
 * const { t, locale, toggleLocale } = useTranslation();
 * <h1>{t("appTitle")}</h1>
 * <button onClick={toggleLocale}>{t("langToggle")}</button>
 * ```
 *
 * The current locale is read from localStorage on first client render.
 * Subsequent toggles persist the choice. The initial server render always
 * uses "en" so hydration never mismatches.
 */
export function useTranslation(): UseTranslationResult {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [translations, setTranslations] = useState<Record<string, string>>(localeCache.en ?? {});

  // On mount, restore the persisted locale (or the browser's preference).
  useEffect(() => {
    const stored = readStoredLocale();
    const initial = stored ?? detectPreferredLocale();
    setLocaleState(initial);
    void loadLocale(initial).then(setTranslations);
  }, []);

  // Load translations whenever the locale changes.
  useEffect(() => {
    void loadLocale(locale).then(setTranslations);
  }, [locale]);

  const t = useCallback(
    (key: string, ...interpolations: unknown[]): string => {
      const template = translations[key] ?? key;
      if (interpolations.length === 0) return template;
      // Simple interpolation: replace {0}, {1}, etc. with the provided values.
      return template.replace(/\{(\d+)\}/g, (_, index) => String(interpolations[Number(index)] ?? ""));
    },
    [translations],
  );

  const setLocale = useCallback((next: Locale) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
    }
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ne" : "en");
  }, [locale, setLocale]);

  return { t, locale, toggleLocale, setLocale };
}
