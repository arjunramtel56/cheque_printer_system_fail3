"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

interface Bank {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  templates: Template[];
}

interface Template {
  id: string;
  name: string;
  chequeWidth: number;
  chequeHeight: number;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
}

export default function TemplatesPage() {
  const t = useTranslations("templates");
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/banks");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setBanks(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button variant="outline" onClick={() => router.push("/dashboard/print")}>
          <Plus size={16} className="mr-2" />
          {t("newCheque")}
        </Button>
      </div>

      <div className="space-y-4">
        {banks.map((bank) => (
          <Card key={bank.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{bank.name}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {t("templatesCount", { count: bank.templates.length })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bank.templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noTemplates")}</p>
              ) : (
                <div className="space-y-3">
                  {bank.templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.chequeWidth}mm × {template.chequeHeight}mm
                          {template.isDefault && ` · ${t("default")}`}
                          {" · v" + template.version}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/print")}
                      >
                        {t("useTemplate")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
