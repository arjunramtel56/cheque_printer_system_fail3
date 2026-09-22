import { getRequestConfig } from "next-intl/server";
import { locales } from "./i18n/config";

export { locales, defaultLocale } from "./i18n/config";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    return {
      locale: "en",
      messages: (await import(`../src/messages/en.json`)).default,
    };
  }

  const safeLocale = locales.includes(locale as any) ? locale : "en";

  return {
    locale: safeLocale,
    messages: (await import(`../src/messages/${safeLocale}.json`)).default,
  };
});
