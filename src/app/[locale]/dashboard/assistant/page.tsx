import { ChequeAssistant } from "@/components/assistant/ChequeAssistant";
import { getTranslations } from "next-intl/server";

export default async function AssistantPage() {
  const t = await getTranslations("sidebar");
  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold">{t("assistant")}</h1>
      <ChequeAssistant />
    </main>
  );
}
