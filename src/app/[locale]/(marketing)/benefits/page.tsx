"use client";

import { useTranslations } from "next-intl";
import {
  Zap,
  LayoutTemplate,
  Eye,
  Ruler,
  Building2,
  Lock,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";

const benefits = [
  { icon: Zap, titleKey: "benefit1Title", descKey: "benefit1Desc" },
  { icon: LayoutTemplate, titleKey: "benefit2Title", descKey: "benefit2Desc" },
  { icon: Eye, titleKey: "benefit3Title", descKey: "benefit3Desc" },
  { icon: Ruler, titleKey: "benefit4Title", descKey: "benefit4Desc" },
  { icon: Building2, titleKey: "benefit5Title", descKey: "benefit5Desc" },
  { icon: Lock, titleKey: "benefit6Title", descKey: "benefit6Desc" },
];

export default function BenefitsPage() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("benefitsTitle")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("benefitsSubtitle")}</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit) => (
          <Card key={benefit.titleKey} className="border-transparent shadow-sm">
            <CardContent className="pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <benefit.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t(benefit.titleKey)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(benefit.descKey)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
        <h2 className="text-2xl font-bold">{t("introSolveTitle")}</h2>
        <p className="max-w-2xl text-muted-foreground">{t("introSolveBody")}</p>
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
