"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PricingPage() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("pricingTitle")}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("pricingSubtitle")}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Trial Plan */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold">{t("trial")}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{t("trialPrice")}</span>
                  <span className="text-muted-foreground">{t("trialDuration")}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("trialF1")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("trialF2")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("trialF3")}
                  </li>
                </ul>
                <Link href={`/${locale}/register`} className="mt-6 block">
                  <Button variant="outline" className="w-full">
                    {t("getStarted")}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Standard Plan */}
            <Card className="relative border-primary shadow-md">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                {t("popular")}
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold">{t("standard")}</h3>
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">{t("standardDurationFirstMonth")}</p>
                  <span className="text-3xl font-bold">{t("standardPriceFirstMonth")}</span>
                </div>
                <table className="w-full text-sm mt-4">
                  <tbody>
                    <tr>
                      <td className="py-2 text-muted-foreground">{t("standardDuration3Months")}</td>
                      <td className="py-2 text-right font-medium">{t("standardPrice3Months")}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">{t("standardDuration6Months")}</td>
                      <td className="py-2 text-right font-medium">{t("standardPrice6Months")}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">
                        {t("standardDuration12Months")}
                      </td>
                      <td className="py-2 text-right font-medium">{t("standardPrice12Months")}</td>
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("standardF1")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("standardF2")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("standardF3")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("standardF4")}
                  </li>
                </ul>
                <Link href={`/${locale}/register`} className="mt-6 block">
                  <Button className="w-full">{t("getStarted")}</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Business Plan */}
            <Card className="relative border-2 border-yellow-400">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold">
                BEST VALUE
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold">{t("business")}</h3>
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">{t("businessDurationFirstMonth")}</p>
                  <span className="text-3xl font-bold">{t("businessPriceFirstMonth")}</span>
                </div>
                <table className="w-full text-sm mt-4">
                  <tbody>
                    <tr>
                      <td className="py-2 text-muted-foreground">{t("businessDuration3Months")}</td>
                      <td className="py-2 text-right font-medium">{t("businessPrice3Months")}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">{t("businessDuration6Months")}</td>
                      <td className="py-2 text-right font-medium">{t("businessPrice6Months")}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">
                        {t("businessDuration12Months")}
                      </td>
                      <td className="py-2 text-right font-medium">{t("businessPrice12Months")}</td>
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("businessF1")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("businessF2")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("businessF3")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("businessF4")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {t("businessF5")}
                  </li>
                </ul>
                <Link href={`/${locale}/register`} className="mt-6 block">
                  <Button
                    variant="outline"
                    className="w-full border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                  >
                    {t("getStarted")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="bg-card py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">{t("ctaTitle")}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("ctaDescription")}</p>
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
