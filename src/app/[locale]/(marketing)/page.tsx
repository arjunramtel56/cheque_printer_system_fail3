"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/lib/config";
import { HeroCheque3D } from "@/components/marketing/hero-cheque-3d";
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
  { step: "01", titleKey: "createAccount", descKey: "createAccountDesc" },
  { step: "02", titleKey: "stepLogin", descKey: "stepLoginDesc" },
  { step: "03", titleKey: "selectBank", descKey: "selectBankDesc" },
  { step: "04", titleKey: "fillDetails", descKey: "fillDetailsDesc" },
  { step: "05", titleKey: "stepPreview", descKey: "stepPreviewDesc" },
  { step: "06", titleKey: "stepCalibrate", descKey: "stepCalibrateDesc" },
  { step: "07", titleKey: "print", descKey: "printDesc" },
];

const STAGGER = ["0", "75", "150", "0", "75", "150"] as const;

function IconTile({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) {
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/10 text-primary ring-1 ring-primary/20 ${className}`}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  align = "center",
}: {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h2 className="text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl dark:text-navy-100">
        {title}
      </h2>
      {subtitle ? <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("home");
  const tp = useTranslations("subscription");
  const locale = useLocale();

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-25" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_20%_0%,rgba(59,130,246,0.28),transparent_65%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-10 h-[34rem] w-[34rem] rounded-full bg-cyan-400/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div className="text-center lg:text-left">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {siteConfig.company}
            </span>

            <h1 className="animate-fade-up anim-delay-75 mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
              <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                {t("heroTitleHighlight")}
              </span>
            </h1>

            <p className="animate-fade-up anim-delay-150 mx-auto mt-6 max-w-xl text-base leading-relaxed text-navy-200/90 sm:text-lg lg:mx-0">
              {t("heroDescription")}
            </p>

            <div className="animate-fade-up anim-delay-200 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href={`/${locale}/register`} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-12 w-full bg-blue-500 px-7 text-base text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-400 sm:w-auto"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  {t("startTrial")}
                </Button>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 w-full items-center justify-center rounded-md border border-white/20 bg-white/5 px-7 text-base font-medium text-white backdrop-blur transition-colors hover:bg-white/10 sm:w-auto"
              >
                <Eye className="mr-2 h-5 w-5" />
                {t("viewDemo")}
              </a>
            </div>

            <p className="animate-fade-up anim-delay-300 mt-6 flex items-center justify-center gap-2 text-sm text-navy-300 lg:justify-start">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              {t("heroBadge")}
            </p>

            <dl className="animate-fade-up anim-delay-300 mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6 text-center lg:text-left">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-navy-400">Format</dt>
                <dd className="mt-1 text-sm font-semibold text-white">190.5 × 88.9 mm</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-navy-400">Printing</dt>
                <dd className="mt-1 text-sm font-semibold text-white">Direct Feed · A4</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-navy-400">Banks</dt>
                <dd className="mt-1 text-sm font-semibold text-white">{t("multipleBanks")}</dd>
              </div>
            </dl>
          </div>

          <div className="animate-fade-up anim-delay-200">
            <HeroCheque3D />
            <p className="mt-6 text-center text-sm text-navy-300">{t("demoDescription")}</p>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="relative py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl dark:text-navy-100">
                {t("introTitle")}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{t("introBody")}</p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal className="h-full" delay="75">
              <div className="card-lift group h-full rounded-2xl border border-border/70 bg-gradient-to-br from-card to-primary/[0.03] p-7 shadow-sm">
                <div className="flex items-start gap-4">
                  <IconTile icon={UserPlus} />
                  <div>
                    <h3 className="text-lg font-semibold">{t("introWhoTitle")}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t("introWhoBody")}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal className="h-full" delay="150">
              <div className="card-lift group h-full rounded-2xl border border-border/70 bg-gradient-to-br from-card to-cyan-400/[0.04] p-7 shadow-sm">
                <div className="flex items-start gap-4">
                  <IconTile icon={CheckCircle2} />
                  <div>
                    <h3 className="text-lg font-semibold">{t("introSolveTitle")}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t("introSolveBody")}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="relative bg-card py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionHeading title={t("benefitsTitle")} subtitle={t("benefitsSubtitle")} />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <Reveal
                key={benefit.titleKey}
                className="h-full"
                delay={STAGGER[index % STAGGER.length]}
              >
                <div className="card-lift group relative h-full overflow-hidden rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
                  <span className="absolute right-5 top-4 text-4xl font-bold tabular-nums text-primary/10">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <IconTile icon={benefit.icon} />
                  <h3 className="mt-5 text-lg font-semibold">{t(benefit.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(benefit.descKey)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionHeading title={t("howItWorksTitle")} />
          </Reveal>
          <ol className="relative mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            <div
              aria-hidden="true"
              className="absolute left-[10%] right-[10%] top-6 hidden border-t border-dashed border-primary/25 lg:block"
            />
            {steps.map((step, index) => (
              <Reveal key={step.step} delay={STAGGER[index % STAGGER.length]} className="h-full">
                <li className="relative h-full text-center">
                  <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-500 text-sm font-bold text-white shadow-lg shadow-primary/25 ring-4 ring-background">
                    {step.step}
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{t(step.titleKey)}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {t(step.descKey)}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="relative bg-card py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionHeading title={t("featuresTitle")} subtitle={t("featuresSubtitle")} />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {features.map((feature, index) => {
              const wide = index < 2;
              return (
                <Reveal
                  key={feature.titleKey}
                  className={`h-full ${wide ? "lg:col-span-3" : "lg:col-span-2"}`}
                  delay={STAGGER[index % STAGGER.length]}
                >
                  <div
                    className={`card-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-background p-6 shadow-sm ${
                      wide ? "sm:p-8" : ""
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100"
                    />
                    <div className="flex items-start gap-4">
                      <IconTile icon={feature.icon} />
                      <div className="pt-1">
                        <h3 className="text-lg font-semibold">{t(feature.titleKey)}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {t(feature.descKey)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <MarketingBanksSection />

      {/* Pricing */}
      <section id="pricing" className="relative py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionHeading title={t("pricingTitle")} subtitle={t("pricingSubtitle")} />
          </Reveal>

          <div className="mt-14 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Trial */}
            <Reveal className="h-full" delay="0">
              <div className="card-lift flex h-full flex-col rounded-2xl border border-border/70 bg-card p-7 shadow-sm">
                <h3 className="text-xl font-semibold">{t("trial")}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-semibold tracking-tight">{t("trialPrice")}</span>
                  <span className="text-muted-foreground"> {t("trialDuration")}</span>
                </div>
                <ul className="mt-7 flex-1 space-y-3">
                  {["trialF1", "trialF2", "trialF3"].map((key) => (
                    <li key={key} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {t(key)}
                    </li>
                  ))}
                </ul>
                <Link href={`/${locale}/register`} className="mt-8 block">
                  <Button variant="outline" className="h-11 w-full">
                    {t("getStarted")}
                  </Button>
                </Link>
              </div>
            </Reveal>

            {/* Standard (featured) */}
            <Reveal className="h-full" delay="75">
              <div className="relative flex h-full flex-col rounded-2xl bg-gradient-to-b from-primary to-blue-600 p-[1.5px] shadow-xl shadow-primary/20 lg:-mt-3">
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-navy-950 shadow-md">
                  {t("popular")}
                </div>
                <div className="flex h-full flex-col rounded-[15px] bg-card p-7">
                  <h3 className="text-xl font-semibold">{t("standard")}</h3>
                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      {tp("introductoryOffer")}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-4xl font-semibold tracking-tight">
                        {t("standardPriceFirstMonth")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t("standardDurationFirstMonth")}
                      </span>
                    </div>
                  </div>
                  <table className="mt-5 w-full text-sm">
                    <tbody>
                      <tr className="border-b border-border/60">
                        <td className="py-2 text-muted-foreground">{tp("duration3Months")}</td>
                        <td className="py-2 text-right font-medium">{t("standardPrice3Months")}</td>
                      </tr>
                      <tr className="border-b border-border/60">
                        <td className="py-2 text-muted-foreground">{tp("duration6Months")}</td>
                        <td className="py-2 text-right font-medium">{t("standardPrice6Months")}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">{tp("duration12Months")}</td>
                        <td className="py-2 text-right font-medium">
                          {t("standardPrice12Months")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <ul className="mt-6 flex-1 space-y-3">
                    {["standardF1", "standardF2", "standardF3", "standardF4"].map((key) => (
                      <li key={key} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {t(key)}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/${locale}/register`} className="mt-8 block">
                    <Button className="h-11 w-full shadow-lg shadow-primary/25">
                      {t("getStarted")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Business */}
            <Reveal className="h-full" delay="150">
              <div className="card-lift relative flex h-full flex-col rounded-2xl border border-border/70 bg-card p-7 shadow-sm">
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950 shadow-md">
                  {tp("bestValue")}
                </div>
                <h3 className="text-xl font-semibold">{t("business")}</h3>
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    {tp("introductoryOffer")}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-semibold tracking-tight">
                      {t("businessPriceFirstMonth")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("businessDurationFirstMonth")}
                    </span>
                  </div>
                </div>
                <table className="mt-5 w-full text-sm">
                  <tbody>
                    <tr className="border-b border-border/60">
                      <td className="py-2 text-muted-foreground">{tp("duration3Months")}</td>
                      <td className="py-2 text-right font-medium">{t("businessPrice3Months")}</td>
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-2 text-muted-foreground">{tp("duration6Months")}</td>
                      <td className="py-2 text-right font-medium">{t("businessPrice6Months")}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">{tp("duration12Months")}</td>
                      <td className="py-2 text-right font-medium">{t("businessPrice12Months")}</td>
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-6 flex-1 space-y-3">
                  {["businessF1", "businessF2", "businessF3", "businessF4", "businessF5"].map(
                    (key) => (
                      <li key={key} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        {t(key)}
                      </li>
                    )
                  )}
                </ul>
                <Link href={`/${locale}/register`} className="mt-8 block">
                  <Button
                    variant="outline"
                    className="h-11 w-full border-amber-500/60 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                  >
                    {t("getStarted")}
                  </Button>
                </Link>
              </div>
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

      {/* CTA */}
      <section className="relative overflow-hidden bg-navy-950 py-20 text-white sm:py-24">
        <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-20" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(37,99,235,0.35),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <h2 className="animate-fade-up text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="animate-fade-up anim-delay-75 mx-auto mt-4 max-w-2xl text-lg text-navy-200">
            {t("ctaDescription")}
          </p>
          <div className="animate-fade-up anim-delay-150 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={`/${locale}/register`} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-12 w-full bg-blue-500 px-7 text-base text-white shadow-lg shadow-blue-900/40 hover:bg-blue-400 sm:w-auto"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                {t("startTrial")}
              </Button>
            </Link>
            <Link href={`/${locale}/login`} className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-white/25 bg-transparent px-7 text-base text-white hover:bg-white/10 sm:w-auto"
              >
                {t("ctaLogin")}
              </Button>
            </Link>
          </div>
          <p className="animate-fade-up anim-delay-200 mt-6 text-sm text-navy-300">
            {t("ctaTrialNote")}
          </p>
        </div>
      </section>

      <HomeFaq />

      {/* Contact */}
      <section id="contact" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionHeading title={t("contactTitle")} subtitle={t("contactSubtitle")} />
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-3">
            <Reveal className="h-full" delay="0">
              <div className="card-lift flex h-full flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-7 text-center shadow-sm">
                <IconTile icon={Phone} />
                <p className="text-sm font-medium">{siteConfig.contact.phone}</p>
                <p className="text-xs text-muted-foreground">{siteConfig.contact.phoneHours}</p>
              </div>
            </Reveal>
            <Reveal className="h-full" delay="75">
              <div className="card-lift flex h-full flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-7 text-center shadow-sm">
                <IconTile icon={Mail} />
                <p className="break-all text-sm font-medium">{siteConfig.contact.email}</p>
              </div>
            </Reveal>
            <Reveal className="h-full" delay="150">
              <div className="card-lift flex h-full flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-7 text-center shadow-sm">
                <IconTile icon={MapPin} />
                <p className="text-sm font-medium">{siteConfig.contact.address}</p>
              </div>
            </Reveal>
          </div>
          <div className="mt-10 text-center">
            <Link href={`/${locale}/contact`}>
              <Button variant="outline">
                {t("contactPageLink")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
