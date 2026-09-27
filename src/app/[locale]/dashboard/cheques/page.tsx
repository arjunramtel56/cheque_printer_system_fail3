"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Download, Trash2 } from "lucide-react";
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
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCheques();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCheques() {
    try {
      const res = await fetch("/api/cheques?limit=50");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setCheques(data);
    } catch (error) {
      console.error("Error fetching cheques:", error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button variant="outline" onClick={() => router.push("/dashboard/cheques/new")}>
          <Printer size={16} className="mr-2" />
          {t("newCheque")}
        </Button>
      </div>

      {cheques.length > 0 ? (
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
                  {cheques.map((cheque) => (
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
                          {cheque.status}
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
