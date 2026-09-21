"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { LOCALES, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "chequePrintLang";

const localeCache: Partial<Record<Locale, Record<string, string>>> = {};

async function loadLocale(locale: Locale): Promise<Record<string, string>> {
  if (localeCache[locale]) return localeCache[locale];
  try {
    const module = await import(`@/lib/locales/${locale}.json`, {
      with: { type: "json" },
    });
    const translations = (module.default ?? module) as Record<string, unknown> as Record<string, string>;
    localeCache[locale] = translations;
    return translations;
  } catch {
    if (locale !== "en" && localeCache.en) return localeCache.en;
    const enModule = await import("@/lib/locales/en.json", {
      with: { type: "json" },
    });
    const translations = (enModule.default ?? enModule) as Record<string, unknown> as Record<string, string>;
    localeCache.en = translations;
    return translations;
  }
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined" || !window.localStorage) return "en";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;
  } catch {}
  return "en";
}

function detectPreferredLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  for (const lang of navigator.languages ?? []) {
    if (lang.slice(0, 2) === "ne") return "ne";
  }
  return "en";
}

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, ...interpolations: unknown[]) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [translations, setTranslations] = useState<Record<string, string>>(localeCache.en ?? {});

  useEffect(() => {
    const stored = readStoredLocale();
    const initial = stored ?? detectPreferredLocale();
    setLocaleState(initial);
    void loadLocale(initial).then(setTranslations);
  }, []);

  useEffect(() => {
    void loadLocale(locale).then(setTranslations);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {}
    }
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, ...interpolations: unknown[]): string => {
      const template = translations[key] ?? key;
      if (interpolations.length === 0) return template;
      return template.replace(/\{(\d+)\}/g, (_, index) => String(interpolations[Number(index)] ?? ""));
    },
    [translations],
  );

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ne" : "en");
  }, [locale, setLocale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

export { useLanguage as useTranslation };
