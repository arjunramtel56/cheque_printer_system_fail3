"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, ShieldCheck } from "lucide-react";

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
        <h2 className="text-center text-3xl font-bold">{t("banksTitle")}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          {t("banksSubtitle")}
        </p>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {BANKS.map((bank) => (
            <div
              key={bank}
              className="flex h-16 items-center justify-center rounded-lg border bg-background px-3 text-center text-sm font-medium text-muted-foreground"
            >
              {bank}
            </div>
          ))}
        </div>

        {/* Printer compatibility */}
        <Card className="mx-auto mt-14 max-w-4xl border-0 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center sm:flex-row sm:text-left">
            <Printer className="h-10 w-10 shrink-0 text-primary" />
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

        {/* Privacy-safe badge */}
        <div className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-2 text-center">
          <ShieldCheck className="h-5 w-5 shrink-0 text-green-600" />
          <p className="text-sm text-muted-foreground">{t("heroBadge")}</p>
        </div>

        <div className="mt-10 text-center">
          <Link href={`/${locale}/register`}>
            <Button size="lg">{t("getStarted")}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
