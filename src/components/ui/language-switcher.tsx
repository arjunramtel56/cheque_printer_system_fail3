"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LANGUAGE_LABELS: Record<string, { flag: string; label: string }> = {
  en: { flag: "🇬🇧", label: "EN" },
  ne: { flag: "🇳🇵", label: "नेपाली" },
};

const STORAGE_KEY = "NEXT_LOCALE";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("theme");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    localStorage.setItem(STORAGE_KEY, newLocale);

    const segments = pathname.split("/");
    if (segments[1] === locale) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    const newPath = segments.join("/");
    router.push(newPath);
  };

  const otherLocale = locale === "en" ? "ne" : "en";
  const targetLabel = LANGUAGE_LABELS[otherLocale] || {
    flag: "🌐",
    label: otherLocale.toUpperCase(),
  };

  return (
    <button
      type="button"
      onClick={() => switchLanguage(otherLocale)}
      aria-label={t("menuLabel")}
      className={cn(
        "flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        className
      )}
    >
      <span>{targetLabel.flag}</span>
      <span>{targetLabel.label}</span>
    </button>
  );
}
