import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/lib/config";
import { Link } from "@/i18n/navigation";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <img src={siteConfig.logo} alt={siteConfig.company} className="logo-image h-10 w-auto" />
        </div>
        <h1 className="text-2xl font-bold">{t("twoFactor")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("twoFactorDescription")}</p>
        <div className="mt-6">
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
