"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Award, Target } from "lucide-react";

const values = [
  {
    icon: Shield,
    titleKey: "mission",
    descKey: "missionDesc",
  },
  {
    icon: Users,
    titleKey: "customers",
    descKey: "customersDesc",
  },
  {
    icon: Award,
    titleKey: "quality",
    descKey: "qualityDesc",
  },
  {
    icon: Target,
    titleKey: "vision",
    descKey: "visionDesc",
  },
];

export default function AboutPage() {
  const t = useTranslations("about");

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

      {/* Story Section */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-bold">{t("storyTitle")}</h2>
          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>{t("storyP1")}</p>
            <p>{t("storyP2")}</p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-card py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("valuesTitle")}</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <Card key={value.titleKey} className="border-0 shadow-sm">
                <CardContent className="pt-6 text-center">
                  <value.icon className="mx-auto h-10 w-10 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">{t(value.titleKey)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(value.descKey)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">{t("teamTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {t("teamDescription")}
          </p>
        </div>
      </section>
    </div>
  );
}
