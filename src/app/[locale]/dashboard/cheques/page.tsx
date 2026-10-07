"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Printer, Download, Trash2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/providers/toast-provider";

interface ChequeEntry {
  id: string;
  accountHolder: string;
  payeeName?: string;
  chequeDate: string;
  amountNumber: string;
  amountWords: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    name: string;
    bank: { id: string; name: string };
  };
}

export default function ChequesPage() {
  const t = useTranslations("cheques");
  const router = useRouter();
  const { showToast } = useToast();
  const [cheques, setCheques] = useState<ChequeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCheques();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCheques() {
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/cheques?limit=50");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setCheques(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching cheques:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(chequeId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;

    try {
      const res = await fetch(`/api/cheques?id=${chequeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      setCheques(cheques.filter((c) => c.id !== chequeId));
      showToast(t("deleteSuccess"), "success");
    } catch (error) {
      showToast(t("deleteError"), "error");
    }
  }

  async function handleExportPDF(chequeId: string) {
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chequeId }),
      });

      if (!res.ok) throw new Error("failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cheque-${chequeId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      showToast(t("exportError"), "error");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cheques;
    return cheques.filter(
      (c) =>
        (c.payeeName ?? "").toLowerCase().includes(q) ||
        c.template?.bank?.name?.toLowerCase().includes(q) ||
        String(c.amountNumber).includes(q)
    );
  }, [cheques, search]);

  // Static lookup so each status renders an existing translated label.
  const statusLabels: Record<string, string> = {
    DRAFT: t("status.draft"),
    READY: t("status.ready"),
    PRINTED: t("status.printed"),
    CANCELLED: t("status.cancelled"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <div className="flex items-center gap-3">
          {cheques.length > 3 && (
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
          <Button variant="outline" onClick={() => router.push("/dashboard/cheques/new")}>
            <Printer size={16} className="mr-2" />
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
            <Button variant="outline" className="mt-3" onClick={fetchCheques}>
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : cheques.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("table.payee")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.bank")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.date")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("table.amount")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("table.status")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        {t("noSearchResults")}
                      </td>
                    </tr>
                  )}
                  {filtered.map((cheque) => (
                    <tr key={cheque.id} className="border-b">
                      <td className="px-4 py-3 font-medium">
                        {cheque.payeeName || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">{cheque.template?.bank?.name}</td>
                      <td className="px-4 py-3">
                        {new Date(cheque.chequeDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        NPR {parseFloat(cheque.amountNumber).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                            cheque.status === "PRINTED"
                              ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200"
                              : cheque.status === "CANCELLED"
                                ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {statusLabels[cheque.status] ?? cheque.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportPDF(cheque.id)}
                            title={t("exportPDF")}
                          >
                            <Download size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cheque.id)}
                            title={t("delete")}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t("noChequesFound")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("noChequesDesc")}</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push("/dashboard/cheques/new")}
            >
              <Printer size={16} className="mr-2" />
              {t("createFirstCheque")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
