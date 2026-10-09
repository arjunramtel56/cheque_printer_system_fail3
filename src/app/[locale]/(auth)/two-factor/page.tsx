import { getTranslations } from "next-intl/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  // Resolve the locale from the route instead of relying on the layout's
  // request-locale store, which is not guaranteed to be set yet.
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-lg font-medium text-foreground">{t("twoFactor")}</p>
    </div>
  );
}
