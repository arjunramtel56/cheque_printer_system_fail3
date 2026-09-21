"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqs = [
  {
    qKey: "q1",
    aKey: "a1",
  },
  {
    qKey: "q2",
    aKey: "a2",
  },
  {
    qKey: "q3",
    aKey: "a3",
  },
  {
    qKey: "q4",
    aKey: "a4",
  },
  {
    qKey: "q5",
    aKey: "a5",
  },
  {
    qKey: "q6",
    aKey: "a6",
  },
];

export default function FAQPage() {
  const t = useTranslations("faq");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={faq.qKey} className="border">
                <CardContent className="pt-0">
                  <button
                    className="flex w-full items-center justify-between py-4 text-left"
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  >
                    <span className="font-medium">{t(faq.qKey)}</span>
                    {openIndex === index ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  {openIndex === index && (
                    <div className="pb-4 text-sm text-muted-foreground">
                      {t(faq.aKey)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
