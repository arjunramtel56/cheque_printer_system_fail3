import { ChequeAssistant } from "@/components/assistant/ChequeAssistant";
import { getTranslations } from "next-intl/server";

export default async function AssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  // Resolve the locale from the route instead of relying on the layout's
  // request-locale store, which is not guaranteed to be set yet.
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sidebar" });
  const td = await getTranslations({ locale, namespace: "dashboard_ui" });

  return (
    <div className="space-y-6">
      {/* Page header — consistent with other dashboard pages */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">{t("assistant")}</h2>
        <p className="text-sm text-muted-foreground">{td("assistantDescription")}</p>
      </div>
      <ChequeAssistant />
    </div>
  );
}
