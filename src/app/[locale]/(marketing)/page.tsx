"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, FileText, Shield, Clock, CreditCard, User, LayoutDashboard } from "lucide-react";
import { siteConfig } from "@/lib/config";

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

      {/* Quick Access Panel */}
      <section className="py-12 bg-card">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("quickAccess")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            {t("quickAccessDesc")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href={`/${locale}/register`}>
              <Button size="lg" className="text-base">
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-7h-7z"
                  />
                </svg>
                {t("startTrial")}
              </Button>
            </Link>
            <Link href={`/${locale}/login`}>
              <Button variant="outline" size="lg" className="text-base">
                <User className="mr-2 h-5 w-5" />
                {t("userLogin")}
              </Button>
            </Link>
            <Link href={`/${locale}/login`}>
              <Button variant="secondary" size="lg" className="text-base">
                <LayoutDashboard className="mr-2 h-5 w-5" />
                {t("adminPortal")}
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
                  <p className="mt-2 text-sm text-muted-foreground">{t(feature.descKey)}</p>
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
                <p className="mt-2 text-sm text-muted-foreground">{t(step.descKey)}</p>
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
            {/* Trial Plan */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold">{siteConfig.pricing.trial.label}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{siteConfig.pricing.trial.price}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    {siteConfig.pricing.trial.duration}
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {siteConfig.pricing.trial.features.map((feature, idx) => (
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
                <h3 className="text-xl font-bold">{siteConfig.pricing.standard.label}</h3>
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Introductory offer - first month only
                  </p>
                  <span className="text-3xl font-bold">
                    {siteConfig.pricing.standard.firstMonth}
                  </span>
                </div>
                <table className="w-full text-sm mt-4">
                  <tbody>
                    <tr>
                      <td className="py-1 text-muted-foreground">3 Months</td>
                      <td className="py-1 text-right font-medium">
                        {siteConfig.pricing.standard.threeMonths}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">6 Months</td>
                      <td className="py-1 text-right font-medium">
                        {siteConfig.pricing.standard.sixMonths}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">12 Months</td>
                      <td className="py-1 text-right font-medium">
                        {siteConfig.pricing.standard.annual}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-6 space-y-3">
                  {siteConfig.pricing.standard.features.map((feature, idx) => (
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
                <h3 className="text-xl font-bold">{siteConfig.pricing.business.label}</h3>
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Introductory offer - first month only
                  </p>
                  <span className="text-3xl font-bold">
                    {siteConfig.pricing.business.firstMonth}
                  </span>
                </div>
                <table className="w-full text-sm mt-4">
                  <tbody>
                    <tr>
                      <td className="py-1 text-muted-foreground">3 Months</td>
                      <td className="py-1 text-right font-medium">
                        {siteConfig.pricing.business.threeMonths}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">6 Months</td>
                      <td className="py-1 text-right font-medium">
                        {siteConfig.pricing.business.sixMonths}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">12 Months</td>
                      <td className="py-1 text-right font-medium">
                        {siteConfig.pricing.business.annual}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-6 space-y-3">
                  {siteConfig.pricing.business.features.map((feature, idx) => (
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

      {/* CTA */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">{t("ctaTitle")}</h2>
          <p className="mt-4 text-lg opacity-90">{t("ctaDescription")}</p>
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
