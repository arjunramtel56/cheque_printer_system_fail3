import { getTranslations } from "next-intl/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12.75h.008v.008H12v-.008zM12 10.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold">{t("verifyEmail")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("verifyEmailDescription")}</p>
      </div>
    </div>
  );
}
