"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

/** Nepalese 'Class A' commercial banks — matches prisma/seed.ts. */
const BANKS = [
  "Nabil Bank",
  "Nepal Investment",
  "Global IME",
  "Prabhu Bank",
  "NIC Asia",
  "Rastriya Banijya",
  "Nepal Bank",
  "Himalayan Bank",
  "Sanima Bank",
  "Siddhartha Bank",
];

const PRINTERS = ["Epson", "Canon", "HP", "Brother"];

export function MarketingBanksSection() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <section id="banks" className="bg-card py-20">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("banksTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            {t("banksSubtitle")}
          </p>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {BANKS.map((bank, index) => (
            <Reveal key={bank} delay={index % 5 === 0 ? "0" : index % 5 === 1 ? "75" : "150"}>
              <div className="card-lift flex h-16 items-center justify-center rounded-lg border bg-background px-3 text-center text-sm font-medium text-muted-foreground">
                {bank}
              </div>
            </Reveal>
          ))}
        </div>

        {/* Printer compatibility */}
        <Reveal className="mx-auto mt-14 max-w-4xl">
          <Card className="card-lift border-transparent shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 pt-6 text-center sm:flex-row sm:text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Printer className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t("printersTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("printersDesc")}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {PRINTERS.map((printer) => (
                    <span
                      key={printer}
                      className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {printer}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        {/* Privacy-safe badge */}
        <Reveal>
          <div className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-2 text-center">
            <ShieldCheck className="h-5 w-5 shrink-0 text-green-600" />
            <p className="text-sm text-muted-foreground">{t("heroBadge")}</p>
          </div>
        </Reveal>

        <Reveal className="mt-10 text-center">
          <Link href={`/${locale}/register`}>
            <Button size="lg" className="shadow-lg shadow-primary/25">
              {t("getStarted")}
            </Button>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
