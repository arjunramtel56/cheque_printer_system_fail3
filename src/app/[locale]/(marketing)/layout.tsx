"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { siteConfig } from "@/lib/config";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const tNav = useTranslations("nav");
  const locale = useLocale();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href={`/${locale}`} className="flex items-center space-x-2">
            <img src={siteConfig.logo} alt={siteConfig.company} className="logo-image h-8 w-auto" />
            <span className="hidden text-sm font-medium sm:inline-block">{siteConfig.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Desktop nav links — hidden on mobile to prevent overflow */}
            <nav className="hidden items-center gap-1 md:flex">
              {siteConfig.navItems.map((item) => (
                <Link
                  key={item.href}
                  href={`/${locale}${item.href}`}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {tNav(item.labelKey)}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex">
                <LanguageSwitcher />
              </span>
              <Link
                href={`/${locale}/login`}
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent sm:inline-block"
              >
                {tNav("login")}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:px-4 sm:py-2"
              >
                {tNav("register")}
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <img
                src={siteConfig.logo}
                alt={siteConfig.company}
                className="logo-image h-8 w-auto"
              />
              <div className="text-center md:text-left">
                <p className="text-sm font-medium">{siteConfig.name}</p>
                <p className="text-xs text-muted-foreground">{siteConfig.company}</p>
                <p className="text-xs text-muted-foreground">{siteConfig.contact.phone}</p>
                <p className="text-xs text-muted-foreground">{siteConfig.contact.email}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {siteConfig.company}. {tNav("allRightsReserved")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
