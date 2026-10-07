"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutTemplate, Plus, Search } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTemplates() {
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/banks");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setBanks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return banks;
    return banks.filter(
      (bank) =>
        bank.name.toLowerCase().includes(query) ||
        bank.code.toLowerCase().includes(query) ||
        bank.templates.some((template) => template.name.toLowerCase().includes(query))
    );
  }, [banks, query]);

  const templateCount = banks.reduce((total, bank) => total + bank.templates.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          {!isLoading && !loadError && banks.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("summary", { banks: banks.length, templates: templateCount })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && !loadError && banks.length > 3 && (
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-56 pl-10"
              />
            </div>
          )}
          <Button variant="outline" onClick={() => router.push("/dashboard/print")}>
            <Plus size={16} className="mr-2" />
            {t("newCheque")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("loading")}
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{t("loadError")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("loadErrorDesc")}</p>
            <Button variant="outline" className="mt-3" onClick={fetchTemplates}>
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : banks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <LayoutTemplate className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">{t("noTemplates")}</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 font-medium">{t("noSearchResults")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noSearchResultsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((bank) => (
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
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 font-medium">
                            <span className="truncate">{template.name}</span>
                            {template.isDefault && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                {t("default")}
                              </span>
                            )}
                            {!template.isActive && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                                {t("inactive")}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {template.chequeWidth}mm × {template.chequeHeight}mm · v
                            {template.version}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push("/dashboard/print")}
                          title={t("newCheque")}
                        >
                          {t("newCheque")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
