"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "@/lib/config";
import { PaymentBadges } from "@/components/marketing/payment-badges";
import { ShieldCheck } from "lucide-react";

export function MarketingFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const locale = useLocale();

  const productLinks = [
    { label: tNav("features"), href: "/features" },
    { label: tNav("pricing"), href: "/pricing" },
    { label: tNav("faq"), href: "/faq" },
    { label: tNav("contact"), href: "/contact" },
  ];

  const legalLinks = [
    { label: t("privacyPolicy"), href: "/privacy-policy" },
    { label: t("termsOfService"), href: "/terms-of-service" },
    { label: t("refundPolicy"), href: "/refund-policy" },
  ];

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <img
                src={siteConfig.logo}
                alt={siteConfig.company}
                className="logo-image h-8 w-auto"
              />
            </div>
            <p className="text-sm font-medium">{siteConfig.name}</p>
            <p className="text-xs text-muted-foreground">{siteConfig.contact.phone}</p>
            <p className="break-all text-xs text-muted-foreground">{siteConfig.contact.email}</p>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
              {t("privacyNote")}
            </p>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-sm font-semibold">{t("product")}</h3>
            <ul className="mt-3 space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/${locale}${link.href}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-sm font-semibold">{t("legal")}</h3>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/${locale}${link.href}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Payments */}
          <div className="flex flex-col items-start gap-4">
            <PaymentBadges />
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {siteConfig.company}. {tNav("allRightsReserved")}
        </div>
      </div>
    </footer>
  );
}
