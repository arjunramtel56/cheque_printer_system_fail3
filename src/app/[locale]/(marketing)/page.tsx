"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Printer,
  FileText,
  Shield,
  Clock,
  CreditCard,
} from "lucide-react";

const features = [
  {
    icon: Printer,
    titleKey: "preciseAlignment",
    descKey: "preciseAlignmentDesc",
  },
  {
    icon: FileText,
    titleKey: "multipleBanks",
    descKey: "multipleBanksDesc",
  },
  {
    icon: Shield,
    titleKey: "secure",
    descKey: "secureDesc",
  },
  {
    icon: Clock,
    titleKey: "history",
    descKey: "historyDesc",
  },
  {
    icon: CreditCard,
    titleKey: "amountInWords",
    descKey: "amountInWordsDesc",
  },
];

const steps = [
  {
    step: "1",
    titleKey: "createAccount",
    descKey: "createAccountDesc",
  },
  {
    step: "2",
    titleKey: "selectBank",
    descKey: "selectBankDesc",
  },
  {
    step: "3",
    titleKey: "fillDetails",
    descKey: "fillDetailsDesc",
  },
  {
    step: "4",
    titleKey: "print",
    descKey: "printDesc",
  },
];

const plans = [
  {
    nameKey: "trial",
    priceKey: "trialPrice",
    durationKey: "trialDuration",
    featuresKeys: ["trialF1", "trialF2", "trialF3"],
  },
  {
    nameKey: "standard",
    priceKey: "standardPrice",
    durationKey: "standardDuration",
    featuresKeys: ["standardF1", "standardF2", "standardF3", "standardF4"],
    popular: true,
  },
  {
    nameKey: "business",
    priceKey: "businessPrice",
    durationKey: "businessDuration",
    featuresKeys: ["businessF1", "businessF2", "businessF3", "businessF4", "businessF5"],
  },
];

export default function HomePage() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("heroTitle")}
            <span className="text-primary"> {t("heroTitleHighlight")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("heroDescription")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href={`/${locale}/register`}>
              <Button size="lg" className="text-base">
                {t("startTrial")}
              </Button>
            </Link>
            <Link href={`/${locale}/features`}>
              <Button variant="outline" size="lg" className="text-base">
                {t("learnMore")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("featuresTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            {t("featuresSubtitle")}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.titleKey} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <feature.icon className="h-10 w-10 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">{t(feature.titleKey)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(feature.descKey)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-card py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("howItWorksTitle")}</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  {step.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{t(step.titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(step.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("pricingTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            {t("pricingSubtitle")}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.nameKey}
                className={`relative ${plan.popular ? "border-primary shadow-md" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    {t("popular")}
                  </div>
                )}
                <CardContent className="pt-6">
                  <h3 className="text-xl font-bold">{t(plan.nameKey)}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{t(plan.priceKey)}</span>
                    <span className="text-muted-foreground">{t(plan.durationKey)}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.featuresKeys.map((featureKey) => (
                      <li key={featureKey} className="flex items-center gap-2 text-sm">
                        <span className="text-primary">&#10003;</span>
                        {t(featureKey)}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/${locale}/register`} className="mt-6 block">
                    <Button
                      variant={plan.popular ? "default" : "outline"}
                      className="w-full"
                    >
                      {t("getStarted")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">{t("ctaTitle")}</h2>
          <p className="mt-4 text-lg opacity-90">
            {t("ctaDescription")}
          </p>
          <Link href={`/${locale}/register`}>
            <Button size="lg" variant="secondary" className="mt-8 text-base">
              {t("startTrial")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
