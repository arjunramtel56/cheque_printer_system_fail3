"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

const LANGUAGE_LABELS: Record<string, { flag: string; label: string }> = {
  en: { flag: "🇬🇧", label: "EN" },
  ne: { flag: "🇳🇵", label: "नेपाली" },
};

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    const segments = pathname.split("/");
    if (segments[1] === locale) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    const newPath = segments.join("/");
    router.push(newPath);
  };

  const nextLocale = locale === "en" ? "ne" : "en";

  return (
    <button
      type="button"
      onClick={() => switchLanguage(nextLocale)}
      aria-label="Switch language"
      className={cn(
        "flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        className
      )}
    >
      <span>{LANGUAGE_LABELS[nextLocale]?.flag || "🌐"}</span>
      <span>{LANGUAGE_LABELS[nextLocale]?.label || nextLocale.toUpperCase()}</span>
    </button>
  );
}
