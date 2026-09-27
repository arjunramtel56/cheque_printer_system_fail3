"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTransition } from "react";

const LANGUAGE_LABELS: Record<string, { flag: string; label: string }> = {
  en: { flag: "🇬🇧", label: "EN" },
  ne: { flag: "🇳🇵", label: "नेपाली" },
};

const STORAGE_KEY = "NEXT_LOCALE";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLanguage = (newLocale: string) => {
    // Persist the choice for middleware (bare-path redirects) and future visits.
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.cookie = `${STORAGE_KEY}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      // Storage unavailable (private mode etc.) — URL routing still persists the choice.
    }

    // usePathname() returns a locale-less path; the i18n router applies the
    // target locale itself, so no manual prefix surgery is needed here.
    startTransition(() => {
      router.push(pathname, { locale: newLocale });
    });
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
      disabled={isPending}
      aria-label={otherLocale === "ne" ? "Switch to Nepali" : "नेपालीमा सार्नुहोस्"}
      title={otherLocale === "ne" ? "Switch to Nepali" : "नेपालीमा सार्नुहोस्"}
      className={cn(
        "flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50",
        className
      )}
    >
      <span>{targetLabel.flag}</span>
      <span>{targetLabel.label}</span>
    </button>
  );
}
