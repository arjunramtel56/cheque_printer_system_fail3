"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { LayoutTemplate, Search, Plus, AlertTriangle } from "lucide-react";
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
          <h2 className="text-2xl font-bold text-navy-700 dark:text-navy-200">{t("title")}</h2>
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
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/print")}
            className="gap-2"
          >
            <Plus size={16} />
            {t("newCheque")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <Spinner size="lg" />
        </div>
      ) : loadError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-destructive" />
            <p className="text-destructive">{t("loadError")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("loadErrorDesc")}</p>
            <Button variant="outline" className="mt-3" onClick={fetchTemplates}>
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : banks.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title={t("noTemplates")}
          description={t("noTemplatesDesc")}
        />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t("noSearchResults")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("noSearchResultsDesc")}</p>
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
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <LayoutTemplate className="h-5 w-5 text-navy-400" />
                            <div>
                              <p className="font-medium text-navy-700 dark:text-navy-200">
                                {template.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {template.chequeWidth}mm × {template.chequeHeight}mm · v
                                {template.version}
                                {template.isDefault && ` · ${t("default")}`}
                                {!template.isActive && ` · ${t("inactive")}`}
                              </p>
                            </div>
                          </div>
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
