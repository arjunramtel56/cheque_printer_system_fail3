"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/config";

export default function PricingPage() {
  const t = useTranslations("home");
  const locale = useLocale();
  const pricing = siteConfig.pricing;

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
                <h3 className="text-xl font-bold">{pricing.trial.label}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{pricing.trial.price}</span>
                  <span className="text-muted-foreground">{pricing.trial.duration}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {pricing.trial.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">&#10003;</span>
                      {feature}
                    </li>
                  ))}
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
                <h3 className="text-xl font-bold">{pricing.standard.label}</h3>
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Introductory offer - first month only
                  </p>
                  <span className="text-3xl font-bold">{pricing.standard.firstMonth}</span>
                </div>
                <table className="w-full text-sm mt-4">
                  <tbody>
                    <tr>
                      <td className="py-2 text-muted-foreground">3 Months</td>
                      <td className="py-2 text-right font-medium">
                        {pricing.standard.threeMonths}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">6 Months</td>
                      <td className="py-2 text-right font-medium">{pricing.standard.sixMonths}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">12 Months</td>
                      <td className="py-2 text-right font-medium">{pricing.standard.annual}</td>
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-6 space-y-3">
                  {pricing.standard.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">&#10003;</span>
                      {feature}
                    </li>
                  ))}
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
                <h3 className="text-xl font-bold">{pricing.business.label}</h3>
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Introductory offer - first month only
                  </p>
                  <span className="text-3xl font-bold">{pricing.business.firstMonth}</span>
                </div>
                <table className="w-full text-sm mt-4">
                  <tbody>
                    <tr>
                      <td className="py-2 text-muted-foreground">3 Months</td>
                      <td className="py-2 text-right font-medium">
                        {pricing.business.threeMonths}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">6 Months</td>
                      <td className="py-2 text-right font-medium">{pricing.business.sixMonths}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">12 Months</td>
                      <td className="py-2 text-right font-medium">{pricing.business.annual}</td>
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-6 space-y-3">
                  {pricing.business.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">&#10003;</span>
                      {feature}
                    </li>
                  ))}
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
