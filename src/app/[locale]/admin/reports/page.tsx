"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, RefreshCw, Users, FileText, Printer, DollarSign, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface ReportData {
  range: { from: string; to: string };
  newUsers: number;
  newCheques: number;
  prints: number;
  payments: { approved: number; pending: number; rejected: number };
  revenueApproved: number;
  chequesByStatus: Array<{ status: string; count: number }>;
}

export default function AdminReportsPage() {
  const t = useTranslations("admin_reports");
  const locale = useLocale() as "en" | "ne";
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReport(rangeFrom?: string, rangeTo?: string) {
    setIsLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (rangeFrom) params.set("from", rangeFrom);
      if (rangeTo) params.set("to", rangeTo);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!res.ok) throw new Error("failed");
      setData(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function applyRange(e: React.FormEvent) {
    e.preventDefault();
    fetchReport(from || undefined, to || undefined);
  }

  const cards = data
    ? [
        {
          title: locale === "ne" ? "नयाँ प्रयोगकर्ता" : "New users",
          value: data.newUsers.toString(),
          icon: Users,
        },
        {
          title: locale === "ne" ? "नयाँ चेक" : "New cheques",
          value: data.newCheques.toString(),
          icon: FileText,
        },
        {
          title: locale === "ne" ? "प्रिन्ट" : "Prints",
          value: data.prints.toString(),
          icon: Printer,
        },
        {
          title: locale === "ne" ? "स्वीकृत भुक्तानी" : "Approved payments",
          value: data.payments.approved.toString(),
          icon: Clock,
        },
        {
          title: locale === "ne" ? "स्वीकृत आम्दानी" : "Verified revenue",
          value: `NPR ${data.revenueApproved.toLocaleString()}`,
          icon: DollarSign,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchReport(from || undefined, to || undefined)}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? "mr-2 animate-spin" : "mr-2"} />
          {locale === "ne" ? "रिफ्रेस" : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="from">{locale === "ne" ? "मिति देखि" : "From"}</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="to">{locale === "ne" ? "मिति सम्म" : "To"}</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" size="sm" disabled={isLoading}>
              <BarChart3 size={16} className="mr-2" />
              {locale === "ne" ? "रिपोर्ट हेर्नुहोस्" : "Apply"}
            </Button>
            <span className="pb-2 text-xs text-muted-foreground">
              {locale === "ne" ? "खाली छोडे: पछिल्ला ३० दिन" : "Leave empty for the last 30 days."}
            </span>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {locale === "ne" ? "लोड हुँदै…" : "Loading…"}
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">
              {locale === "ne" ? "रिपोर्ट लोड गर्न सकिएन।" : "Failed to load the report."}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => fetchReport()}>
              {locale === "ne" ? "फेरि प्रयास" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((c) => (
              <Card key={c.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {c.title}
                  </CardTitle>
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{c.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{locale === "ne" ? "अवस्थानुसार चेक" : "Cheques by status"}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.chequesByStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {locale === "ne" ? "यो अवधिमा चेक छैन।" : "No cheques in this range."}
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">
                          {locale === "ne" ? "अवस्था" : "Status"}
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          {locale === "ne" ? "संख्या" : "Count"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.chequesByStatus.map((row) => (
                        <tr key={row.status} className="border-b">
                          <td className="px-4 py-2">{row.status}</td>
                          <td className="px-4 py-2 text-right font-medium">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{locale === "ne" ? "भुक्तानी सारांश" : "Payment summary"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {locale === "ne" ? "स्वीकृत" : "Approved"}
                  </span>
                  <span className="font-medium text-green-600">{data.payments.approved}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {locale === "ne" ? "पेन्डिङ" : "Pending"}
                  </span>
                  <span className="font-medium text-yellow-600">{data.payments.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {locale === "ne" ? "अस्वीकृत" : "Rejected"}
                  </span>
                  <span className="font-medium text-red-600">{data.payments.rejected}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">
                    {locale === "ne" ? "प्रमाणित आम्दानी" : "Verified revenue"}
                  </span>
                  <span className="font-bold">NPR {data.revenueApproved.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
