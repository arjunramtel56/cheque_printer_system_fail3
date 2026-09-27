import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { locales } from "@/i18n/config";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) {
    notFound();
  }

  // Pin the request locale so nested server renders (getMessages,
  // getTranslations) resolve messages for this locale.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangSync />
      {children}
    </NextIntlClientProvider>
  );
}
