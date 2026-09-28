"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const ITEMS = [
  { qKey: "faqQ1", aKey: "faqA1" },
  { qKey: "faqQ2", aKey: "faqA2" },
  { qKey: "faqQ3", aKey: "faqA3" },
  { qKey: "faqQ4", aKey: "faqA4" },
] as const;

export function HomeFaq() {
  const t = useTranslations("home");
  const locale = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-center text-3xl font-bold">{t("faqTitle")}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          {t("faqSubtitle")}
        </p>

        <div className="mt-10 divide-y rounded-lg border">
          {ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.qKey}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium hover:bg-accent/50"
                >
                  <span>{t(item.qKey)}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-4 text-sm text-muted-foreground">{t(item.aKey)}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link href={`/${locale}/faq`}>
            <Button variant="outline">{t("faqAllLink")}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
