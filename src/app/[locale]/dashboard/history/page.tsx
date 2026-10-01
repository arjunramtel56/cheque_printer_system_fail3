"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Search, AlertTriangle, RotateCw, Printer } from "lucide-react";
import { useTranslations } from "next-intl";

interface HistoryRow {
  id: string;
  printedAt: string;
  copies: number;
  printerName: string | null;
  cheque: {
    id: string;
    payeeName: string | null;
    accountHolder: string;
    amountNumber: string;
    chequeNumber: string | null;
    status: string;
    template: {
      name: string;
      bank: { name: string };
    };
  };
}

/**
 * Print-history list for the signed-in user only.
 * Data comes from /api/print-history, which scopes every query to the
 * session user, so other users' records are never reachable here.
 */
export default function HistoryPage() {
  const t = useTranslations("history");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchHistory() {
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/print-history?limit=100");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const payee = (r.cheque.payeeName || r.cheque.accountHolder || "").toLowerCase();
      const bank = r.cheque.template.bank.name.toLowerCase();
      return payee.includes(q) || bank.includes(q);
    });
  }, [rows, search]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const formatAmount = (value: string | number) => {
    const n = Number(value);
    return Number.isFinite(n)
      ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(value);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Search — only useful once there are a few rows */}
      {rows.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            aria-label={t("searchPlaceholder")}
          />
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("loading")}
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <h3 className="text-lg font-semibold">{t("loadError")}</h3>
            <p className="text-sm text-muted-foreground">{t("loadErrorDesc")}</p>
            <Button onClick={fetchHistory} variant="outline" size="sm">
              <RotateCw className="mr-2 h-4 w-4" />
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("table.date")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.payee")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.bank")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("table.amount")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.printedAt)}</td>
                      <td className="px-4 py-3 font-medium">
                        {item.cheque.payeeName || item.cheque.accountHolder}
                      </td>
                      <td className="px-4 py-3">{item.cheque.template.bank.name}</td>
                      <td className="px-4 py-3 text-right">
                        {formatAmount(item.cheque.amountNumber)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-950/60 dark:text-green-200">
                          <Printer className="h-3 w-3" />
                          {t("printed")}
                          {item.copies > 1 ? ` ×${item.copies}` : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : search ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t("noSearchResults")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("noSearchResultsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t("noPrintHistory")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("noHistoryDesc")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
