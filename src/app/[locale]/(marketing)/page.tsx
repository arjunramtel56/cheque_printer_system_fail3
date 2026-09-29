"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Printer,
  FileText,
  Shield,
  ShieldCheck,
  Clock,
  CreditCard,
  Zap,
  Eye,
  LayoutTemplate,
  Building2,
  Ruler,
  Lock,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { siteConfig } from "@/lib/config";
import { DemoChequePreview } from "@/components/marketing/demo-cheque-preview";
import { MarketingBanksSection } from "@/components/marketing/banks-section";
import { HomeFaq } from "@/components/marketing/home-faq";
import { PaymentBadges } from "@/components/marketing/payment-badges";
import { Reveal } from "@/components/marketing/reveal";

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

/** Soft square chip that frames a section icon. */
function IconTile({ icon: Icon, size = "md" }: { icon: LucideIcon; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12" : "h-11 w-11";
  const glyph = size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 ${box}`}
    >
      <Icon className={glyph} />
    </div>
  );
}

/** Stagger delay for the nth card in a 3-column grid. */
const STAGGER = ["0", "75", "150", "0", "75", "150"] as const;

export default function HomePage() {
  const t = useTranslations("home");
  const tp = useTranslations("subscription");
  const locale = useLocale();

  return (
    <div className="flex flex-col">
      {/* 1. Hero Section with live demo */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
        {/* Decorative backdrop: engineering grid + glow blobs */}
        <div aria-hidden="true" className="absolute inset-0 bg-grid" />
        <div
          aria-hidden="true"
          className="animate-glow pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="animate-glow pointer-events-none absolute -right-32 top-24 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <p className="animate-fade-up text-sm font-semibold uppercase tracking-widest text-primary">
              {siteConfig.company}
            </p>
            <h1 className="animate-fade-up anim-delay-75 mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              {t("heroTitle")}
              <span className="text-gradient"> {t("heroTitleHighlight")}</span>
            </h1>
            <p className="animate-fade-up anim-delay-150 mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0">
              {t("heroDescription")}
            </p>
            <div className="animate-fade-up anim-delay-200 mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link href={`/${locale}/register`}>
                <Button
                  size="lg"
                  className="w-full text-base shadow-lg shadow-primary/25 sm:w-auto"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  {t("startTrial")}
                </Button>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-input bg-background px-8 text-base font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground sm:w-auto"
              >
                <Eye className="mr-2 h-5 w-5" />
                {t("viewDemo")}
              </a>
            </div>
            <p className="animate-fade-up anim-delay-300 mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
              <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" />
              {t("heroBadge")}
            </p>
          </div>

          {/* Live demo mockup — interactive, gently floating, doubles as hero visual */}
          <div className="animate-fade-up anim-delay-200 mx-auto w-full max-w-md lg:max-w-lg">
            <div className="animate-float">
              <div className="card-lift rounded-2xl border bg-card/80 p-4 shadow-xl shadow-primary/10 backdrop-blur">
                <DemoChequePreview compact />
              </div>
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">{t("demoDescription")}</p>
          </div>
        </div>
      </section>

      {/* 2. Product Introduction */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">{t("introTitle")}</h2>
              <p className="mt-6 text-lg text-muted-foreground">{t("introBody")}</p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal className="h-full" delay="75">
              <Card className="card-lift h-full border-transparent shadow-sm">
                <CardContent className="flex gap-4 pt-6">
                  <IconTile icon={UserPlus} />
                  <div>
                    <h3 className="text-lg font-semibold">{t("introWhoTitle")}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t("introWhoBody")}</p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
            <Reveal className="h-full" delay="150">
              <Card className="card-lift h-full border-transparent shadow-sm">
                <CardContent className="flex gap-4 pt-6">
                  <IconTile icon={CheckCircle2} />
                  <div>
                    <h3 className="text-lg font-semibold">{t("introSolveTitle")}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t("introSolveBody")}</p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3. Key Benefits */}
      <section id="benefits" className="bg-card py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("benefitsTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              {t("benefitsSubtitle")}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <Reveal
                key={benefit.titleKey}
                className="h-full"
                delay={STAGGER[index % STAGGER.length]}
              >
                <Card className="card-lift h-full border-transparent shadow-sm">
                  <CardContent className="pt-6">
                    <IconTile icon={benefit.icon} size="lg" />
                    <h3 className="mt-4 text-lg font-semibold">{t(benefit.titleKey)}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t(benefit.descKey)}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("howItWorksTitle")}</h2>
          </Reveal>
          <div className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Connector line behind the step badges (desktop only) */}
            <div
              aria-hidden="true"
              className="absolute left-[12%] right-[12%] top-6 hidden border-t-2 border-dashed border-primary/20 lg:block"
            />
            {steps.map((step, index) => (
              <Reveal key={step.step} delay={STAGGER[index % STAGGER.length]}>
                <div className="relative text-center">
                  <div className="relative mx-auto z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-background">
                    {step.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{t(step.titleKey)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t(step.descKey)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Features */}
      <section id="features" className="bg-card py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("featuresTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              {t("featuresSubtitle")}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal
                key={feature.titleKey}
                className="h-full"
                delay={STAGGER[index % STAGGER.length]}
              >
                <Card className="card-lift h-full border-transparent shadow-sm">
                  <CardContent className="flex gap-4 pt-6">
                    <IconTile icon={feature.icon} size="lg" />
                    <div>
                      <h3 className="text-lg font-semibold">{t(feature.titleKey)}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{t(feature.descKey)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5b. Supported Banks + printer compatibility */}
      <MarketingBanksSection />

      {/* 6. Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("pricingTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              {t("pricingSubtitle")}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Trial Plan */}
            <Reveal className="h-full" delay="0">
              <Card className="card-lift h-full border-transparent shadow-sm">
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
            </Reveal>

            {/* Standard Plan */}
            <Reveal className="h-full" delay="75">
              <Card className="card-lift relative h-full border-primary shadow-md">
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-md">
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
                        <td className="py-1 text-right font-medium">
                          {t("standardPrice12Months")}
                        </td>
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
                    <Button className="w-full shadow-lg shadow-primary/25">
                      {t("getStarted")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </Reveal>

            {/* Business Plan */}
            <Reveal className="h-full" delay="150">
              <Card className="card-lift relative h-full border-2 border-yellow-400 shadow-md">
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-950 shadow-md">
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
                        <td className="py-1 text-right font-medium">
                          {t("businessPrice12Months")}
                        </td>
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
            </Reveal>
          </div>
          <Reveal>
            <div className="mt-14 flex flex-col items-center gap-5">
              <div className="text-center">
                <h3 className="text-lg font-semibold">{t("paymentsTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("paymentsNote")}</p>
              </div>
              <PaymentBadges />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. Trial / Register CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 py-20 text-primary-foreground">
        <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-30" />
        <div
          aria-hidden="true"
          className="animate-glow pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <h2 className="animate-fade-up text-3xl font-bold sm:text-4xl">{t("ctaTitle")}</h2>
          <p className="animate-fade-up anim-delay-75 mt-4 text-lg opacity-90">
            {t("ctaDescription")}
          </p>
          <div className="animate-fade-up anim-delay-150 mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
          <p className="animate-fade-up anim-delay-200 mt-6 text-sm opacity-80">
            {t("ctaTrialNote")}
          </p>
        </div>
      </section>

      {/* 7b. FAQ */}
      <HomeFaq />

      {/* 8. Contact */}
      <section id="contact" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("contactTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              {t("contactSubtitle")}
            </p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            <Reveal className="h-full" delay="0">
              <div className="card-lift flex h-full flex-col items-center gap-3 rounded-lg border border-transparent bg-card p-6 text-center shadow-sm">
                <IconTile icon={Phone} size="lg" />
                <p className="text-sm font-medium">{siteConfig.contact.phone}</p>
                <p className="text-xs text-muted-foreground">{siteConfig.contact.phoneHours}</p>
              </div>
            </Reveal>
            <Reveal className="h-full" delay="75">
              <div className="card-lift flex h-full flex-col items-center justify-start gap-3 rounded-lg border border-transparent bg-card p-6 text-center shadow-sm">
                <IconTile icon={Mail} size="lg" />
                <p className="break-all text-sm font-medium">{siteConfig.contact.email}</p>
              </div>
            </Reveal>
            <Reveal className="h-full" delay="150">
              <div className="card-lift flex h-full flex-col items-center justify-start gap-3 rounded-lg border border-transparent bg-card p-6 text-center shadow-sm">
                <IconTile icon={MapPin} size="lg" />
                <p className="text-sm font-medium">{siteConfig.contact.address}</p>
              </div>
            </Reveal>
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
