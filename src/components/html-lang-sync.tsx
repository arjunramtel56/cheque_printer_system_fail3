"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/**
 * Keeps <html lang> in sync with the active locale.
 * (The root layout renders a static lang; this updates it on the client
 * without forcing the whole tree dynamic.)
 */
export function HtmlLangSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
