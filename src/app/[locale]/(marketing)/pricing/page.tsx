"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

export default function PricingPage() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("pricingTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("pricingSubtitle")}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* FAQ Teaser */}
      <section className="bg-card py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">{t("ctaTitle")}</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("ctaDescription")}
          </p>
          <Link href={`/${locale}/register`}>
            <Button size="lg" className="mt-8">
              {t("startTrial")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
