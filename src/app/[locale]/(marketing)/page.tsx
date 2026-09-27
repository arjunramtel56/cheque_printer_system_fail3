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
  Zap,
  Eye,
  LayoutTemplate,
  Building2,
  Ruler,
  Lock,
  UserPlus,
  LogIn,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { siteConfig } from "@/lib/config";

const benefits = [
  { icon: Zap, titleKey: "benefit1Title", descKey: "benefit1Desc" },
  { icon: LayoutTemplate, titleKey: "benefit2Title", descKey: "benefit2Desc" },
  { icon: Eye, titleKey: "benefit3Title", descKey: "benefit3Desc" },
  { icon: Ruler, titleKey: "benefit4Title", descKey: "benefit4Desc" },
  { icon: Building2, titleKey: "benefit5Title", descKey: "benefit5Desc" },
  { icon: Lock, titleKey: "benefit6Title", descKey: "benefit6Desc" },
];

const features = [
  { icon: Printer, titleKey: "preciseAlignment", descKey: "preciseAlignmentDesc" },
  { icon: FileText, titleKey: "multipleBanks", descKey: "multipleBanksDesc" },
  { icon: Shield, titleKey: "secure", descKey: "secureDesc" },
  { icon: Clock, titleKey: "history", descKey: "historyDesc" },
  { icon: CreditCard, titleKey: "amountInWords", descKey: "amountInWordsDesc" },
];

const steps = [
  { step: "1", titleKey: "createAccount", descKey: "createAccountDesc" },
  { step: "2", titleKey: "stepLogin", descKey: "stepLoginDesc" },
  { step: "3", titleKey: "selectBank", descKey: "selectBankDesc" },
  { step: "4", titleKey: "fillDetails", descKey: "fillDetailsDesc" },
  { step: "5", titleKey: "stepPreview", descKey: "stepPreviewDesc" },
  { step: "6", titleKey: "stepCalibrate", descKey: "stepCalibrateDesc" },
  { step: "7", titleKey: "print", descKey: "printDesc" },
];

export default function HomePage() {
  const t = useTranslations("home");
  const tp = useTranslations("subscription");
  const locale = useLocale();

  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {siteConfig.company}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("heroTitle")}
            <span className="text-primary"> {t("heroTitleHighlight")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("heroDescription")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={`/${locale}/register`}>
              <Button size="lg" className="w-full text-base sm:w-auto">
                <Zap className="mr-2 h-5 w-5" />
                {t("startTrial")}
              </Button>
            </Link>
            <Link href={`/${locale}/login`}>
              <Button variant="outline" size="lg" className="w-full text-base sm:w-auto">
                <LogIn className="mr-2 h-5 w-5" />
                {t("userLogin")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Product Introduction */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold">{t("introTitle")}</h2>
            <p className="mt-6 text-lg text-muted-foreground">{t("introBody")}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <UserPlus className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{t("introWhoTitle")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("introWhoBody")}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{t("introSolveTitle")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("introSolveBody")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Key Benefits */}
      <section id="benefits" className="bg-card py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("benefitsTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            {t("benefitsSubtitle")}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <Card key={benefit.titleKey} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <benefit.icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">{t(benefit.titleKey)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t(benefit.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("howItWorksTitle")}</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {step.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{t(step.titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Features */}
      <section id="features" className="bg-card py-20">
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

      {/* 6. Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("pricingTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            {t("pricingSubtitle")}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Trial Plan */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold">{t("trial")}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{t("trialPrice")}</span>
                  <span className="text-muted-foreground"> {t("trialDuration")}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {["trialF1", "trialF2", "trialF3"].map((key) => (
                    <li key={key} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">&#10003;</span>
                      {t(key)}
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
                <h3 className="text-xl font-bold">{t("standard")}</h3>
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {tp("introductoryOffer")}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{t("standardPriceFirstMonth")}</span>
                    <span className="text-sm text-muted-foreground">
                      {t("standardDurationFirstMonth")}
                    </span>
                  </div>
                </div>
                <table className="mt-4 w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 text-muted-foreground">{tp("duration3Months")}</td>
                      <td className="py-1 text-right font-medium">{t("standardPrice3Months")}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">{tp("duration6Months")}</td>
                      <td className="py-1 text-right font-medium">{t("standardPrice6Months")}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">{tp("duration12Months")}</td>
                      <td className="py-1 text-right font-medium">{t("standardPrice12Months")}</td>
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-6 space-y-3">
                  {["standardF1", "standardF2", "standardF3", "standardF4"].map((key) => (
                    <li key={key} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">&#10003;</span>
                      {t(key)}
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
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-950">
                {tp("bestValue")}
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold">{t("business")}</h3>
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {tp("introductoryOffer")}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{t("businessPriceFirstMonth")}</span>
                    <span className="text-sm text-muted-foreground">
                      {t("businessDurationFirstMonth")}
                    </span>
                  </div>
                </div>
                <table className="mt-4 w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 text-muted-foreground">{tp("duration3Months")}</td>
                      <td className="py-1 text-right font-medium">{t("businessPrice3Months")}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">{tp("duration6Months")}</td>
                      <td className="py-1 text-right font-medium">{t("businessPrice6Months")}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">{tp("duration12Months")}</td>
                      <td className="py-1 text-right font-medium">{t("businessPrice12Months")}</td>
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-6 space-y-3">
                  {["businessF1", "businessF2", "businessF3", "businessF4", "businessF5"].map(
                    (key) => (
                      <li key={key} className="flex items-center gap-2 text-sm">
                        <span className="text-primary">&#10003;</span>
                        {t(key)}
                      </li>
                    )
                  )}
                </ul>
                <Link href={`/${locale}/register`} className="mt-6 block">
                  <Button
                    variant="outline"
                    className="w-full border-yellow-600 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950/40"
                  >
                    {t("getStarted")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. Trial / Register CTA */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">{t("ctaTitle")}</h2>
          <p className="mt-4 text-lg opacity-90">{t("ctaDescription")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={`/${locale}/register`}>
              <Button size="lg" variant="secondary" className="w-full text-base sm:w-auto">
                <UserPlus className="mr-2 h-5 w-5" />
                {t("startTrial")}
              </Button>
            </Link>
            <Link href={`/${locale}/login`}>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-primary-foreground/40 bg-transparent text-base text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
              >
                {t("ctaLogin")}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm opacity-80">{t("ctaTrialNote")}</p>
        </div>
      </section>

      {/* 8. Contact */}
      <section id="contact" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("contactTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            {t("contactSubtitle")}
          </p>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <Phone className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium">{siteConfig.contact.phone}</p>
              <p className="text-xs text-muted-foreground">{siteConfig.contact.phoneHours}</p>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <Mail className="h-6 w-6 text-primary" />
              <p className="break-all text-sm font-medium">{siteConfig.contact.email}</p>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <MapPin className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium">{siteConfig.contact.address}</p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link href={`/${locale}/contact`}>
              <Button variant="outline">{t("contactPageLink")}</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
