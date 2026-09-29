"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

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
        <Reveal>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("faqTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            {t("faqSubtitle")}
          </p>
        </Reveal>

        <Reveal className="mt-10">
          <div className="divide-y overflow-hidden rounded-xl border shadow-sm">
            {ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={item.qKey} className={isOpen ? "bg-accent/30" : ""}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium transition-colors hover:bg-accent/50"
                  >
                    <span>{t(item.qKey)}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {/* Smooth height animation via collapsible grid rows */}
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm text-muted-foreground">{t(item.aKey)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal className="mt-6 text-center">
          <Link href={`/${locale}/faq`}>
            <Button variant="outline">{t("faqAllLink")}</Button>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
