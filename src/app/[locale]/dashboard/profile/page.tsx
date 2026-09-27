import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const session = await auth();
  const user = session?.user as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("personalInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName">{t("fullName")}</Label>
              <Input id="fullName" defaultValue={user?.name || ""} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" defaultValue={user?.email || ""} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="company">{t("company")}</Label>
              <Input id="company" defaultValue="" className="mt-1" placeholder={t("companyName")} />
            </div>
            <div>
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                defaultValue=""
                className="mt-1"
                placeholder={t("phonePlaceholder")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>{t("saveChanges")}</Button>
      </div>
    </div>
  );
}
