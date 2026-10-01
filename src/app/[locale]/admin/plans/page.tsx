"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, RefreshCw, Users, Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  durationDays: number;
  chequeLimit: number;
  features: unknown;
  isActive: boolean;
  _count: { subscriptions: number; payments: number };
}

export default function AdminPlansPage() {
  const t = useTranslations("admin_plans");
  const locale = useLocale() as "en" | "ne";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/plans");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setPlans(data.plans ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function formatFeatures(f: unknown): string[] {
    if (!f) return [];
    if (Array.isArray(f)) return f.map(String);
    if (typeof f === "object") {
      return Object.entries(f as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`);
    }
    return [String(f)];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {locale === "ne"
              ? "भुक्तानी शुल्क src/lib/pricing.ts बाट सर्भर-पक्षमा लागू हुन्छ; यो सूची खाता/सीमा अनुगमनका लागि हो।"
              : "Paid-plan pricing is enforced server-side from src/lib/pricing.ts; this catalogue is for monitoring accounts and limits."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPlans} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? "mr-2 animate-spin" : "mr-2"} />
          {locale === "ne" ? "रिफ्रेस" : "Refresh"}
        </Button>
      </div>

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
              {locale === "ne" ? "योजना लोड गर्न सकिएन।" : "Failed to load plans."}
            </p>
            <Button variant="outline" className="mt-3" onClick={fetchPlans}>
              {locale === "ne" ? "फेरि प्रयास" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">
              {locale === "ne" ? "कुनै योजना छैन।" : "No plans configured."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={plan.isActive ? "" : "opacity-70"}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg capitalize">{plan.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description || "—"}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    plan.isActive
                      ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {plan.isActive
                    ? locale === "ne"
                      ? "सक्रिय"
                      : "Active"
                    : locale === "ne"
                      ? "निष्क्रिय"
                      : "Inactive"}
                </span>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {Number(plan.price) === 0
                      ? locale === "ne"
                        ? "निःशुल्क"
                        : "Free"
                      : `${plan.currency} ${Number(plan.price).toLocaleString()}`}
                  </span>
                  <span className="text-muted-foreground">
                    / {plan.durationDays}{" "}
                    {locale === "ne" ? "दिन" : plan.durationDays === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {locale === "ne" ? "चेक सीमा" : "Cheque limit"}
                  </span>
                  <span className="font-medium">
                    {plan.chequeLimit === 0
                      ? locale === "ne"
                        ? "असीमित"
                        : "Unlimited"
                      : plan.chequeLimit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users size={14} />
                    {locale === "ne" ? "सक्रिय सदस्यता" : "Active subscriptions"}
                  </span>
                  <span className="font-medium">{plan._count.subscriptions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Receipt size={14} />
                    {locale === "ne" ? "भुक्तानी रेकर्ड" : "Payment records"}
                  </span>
                  <span className="font-medium">{plan._count.payments}</span>
                </div>
                {formatFeatures(plan.features).length > 0 && (
                  <div className="border-t pt-2 text-xs text-muted-foreground">
                    {formatFeatures(plan.features).map((f) => (
                      <p key={f}>• {f}</p>
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
