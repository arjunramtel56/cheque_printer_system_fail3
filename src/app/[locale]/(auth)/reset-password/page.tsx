import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("auth");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-lg font-medium text-foreground">{t("resetPassword")}</p>
    </div>
  );
}
