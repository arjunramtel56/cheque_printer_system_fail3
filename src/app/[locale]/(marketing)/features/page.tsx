"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import {
  Printer,
  FileText,
  Shield,
  Clock,
  CreditCard,
  Settings,
  Download,
  Users,
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
  {
    icon: Settings,
    titleKey: "customization",
    descKey: "customizationDesc",
  },
  {
    icon: Download,
    titleKey: "export",
    descKey: "exportDesc",
  },
  {
    icon: Users,
    titleKey: "multiUser",
    descKey: "multiUserDesc",
  },
];

export default function FeaturesPage() {
  const t = useTranslations("features");

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* CTA Section */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">{t("ctaTitle")}</h2>
          <p className="mt-4 text-lg opacity-90">
            {t("ctaDescription")}
          </p>
        </div>
      </section>
    </div>
  );
}
