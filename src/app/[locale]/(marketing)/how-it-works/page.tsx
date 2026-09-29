"use client";

import { useTranslations, useLocale } from "next-intl";
import { Printer, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const steps = [
  { step: "1", titleKey: "createAccount", descKey: "createAccountDesc" },
  { step: "2", titleKey: "stepLogin", descKey: "stepLoginDesc" },
  { step: "3", titleKey: "selectBank", descKey: "selectBankDesc" },
  { step: "4", titleKey: "fillDetails", descKey: "fillDetailsDesc" },
  { step: "5", titleKey: "stepPreview", descKey: "stepPreviewDesc" },
  { step: "6", titleKey: "stepCalibrate", descKey: "stepCalibrateDesc" },
  { step: "7", titleKey: "print", descKey: "printDesc" },
];

export default function HowItWorksPage() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("howItWorksTitle")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("introBody")}</p>
      </div>

      <div className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div
          aria-hidden="true"
          className="absolute left-[12%] right-[12%] top-6 hidden border-t-2 border-dashed border-primary/20 lg:block"
        />
        {steps.map((step) => (
          <div key={step.step} className="relative text-center">
            <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-background">
              {step.step}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t(step.titleKey)}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t(step.descKey)}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
        <Printer className="h-10 w-10 text-primary" />
        <h2 className="text-2xl font-bold">{t("ctaTitle")}</h2>
        <p className="max-w-2xl text-muted-foreground">{t("ctaDescription")}</p>
        <Link href={`/${locale}/register`}>
          <Button size="lg" className="mt-2">
            <UserPlus className="mr-2 h-5 w-5" />
            {t("startTrial")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
