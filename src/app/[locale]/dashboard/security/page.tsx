import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export default async function SecurityPage() {
  const t = await getTranslations("dashboard_ui");
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("security")}</h2>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t("securityPlaceholder")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
