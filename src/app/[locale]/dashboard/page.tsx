import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Printer,
  FileText,
  Clock,
  LayoutTemplate,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import { describePrismaError } from "@/lib/prisma-errors";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard_ui" });
  const tStatus = await getTranslations({ locale, namespace: "cheques" });
  const session = await auth();
  const user = session?.user as any;

  let chequeCount = 0;
  let recentCheques: any[] = [];
  let subscription: any = null;
  let activeTemplateCount = 0;
  let dataError = false;
  let trialInfo: {
    daysLeft: number;
    hoursLeft: number;
    printsLeft: number;
    isTrial: boolean;
    expired: boolean;
  } = { daysLeft: 0, hoursLeft: 0, printsLeft: 0, isTrial: false, expired: false };

  const userId = user?.id as string | undefined;
  let isTrial = user?.role === "TRIAL_USER";

  if (!userId) {
    dataError = true;
  } else {
    try {
      chequeCount = await prisma.chequeEntry.count({ where: { userId } });

      recentCheques = await prisma.chequeEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { template: { include: { bank: true } } },
      });

      activeTemplateCount = await prisma.bankTemplate.count({
        where: { isActive: true, bank: { isActive: true } },
      });

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      isTrial = dbUser?.role === "TRIAL_USER";

      subscription = await prisma.subscription.findFirst({
        where: { userId, isActive: true },
        include: { plan: true },
      });

      if (subscription && isTrial) {
        const rawMsLeft = new Date(subscription.endDate).getTime() - Date.now();
        const msLeft = Math.max(0, rawMsLeft);
        const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
        const daysLeft = Math.floor(msLeft / (24 * 60 * 60 * 1000));
        const printsUsed = await prisma.printHistory.count({ where: { userId } });
        const limit = subscription.plan.chequeLimit > 0 ? subscription.plan.chequeLimit : 0;
        const printsLeft = limit > 0 ? Math.max(0, limit - printsUsed) : 0;
        trialInfo = {
          daysLeft,
          hoursLeft,
          printsLeft,
          isTrial: true,
          expired: rawMsLeft <= 0,
        };
      }
    } catch (error) {
      console.error("[DASHBOARD_DATA_ERROR]", describePrismaError(error), error);
      dataError = true;
    }
  }

  const stats = [
    {
      title: t("stats.chequesPrinted"),
      value: dataError ? "—" : chequeCount.toString(),
      icon: FileText,
    },
    {
      title: t("stats.trialDaysLeft"),
      value:
        trialInfo.isTrial && !dataError
          ? trialInfo.daysLeft > 0
            ? trialInfo.daysLeft.toString()
            : t("trialHoursLeft", { hours: trialInfo.hoursLeft })
          : "—",
      icon: CalendarClock,
    },
    {
      title: t("stats.activeTemplates"),
      value: dataError ? "—" : activeTemplateCount.toString(),
      icon: LayoutTemplate,
    },
    {
      title: t("printsLeftTrial"),
      value: trialInfo.isTrial && !dataError ? trialInfo.printsLeft.toString() : "—",
      icon: Printer,
    },
  ];

  const statusLabels: Record<string, string> = {
    DRAFT: tStatus("status.draft"),
    READY: tStatus("status.ready"),
    PRINTED: tStatus("status.printed"),
    CANCELLED: tStatus("status.cancelled"),
  };

  return (
    <div className="space-y-6">
      {dataError && (
        <Alert
          variant="destructive"
          title={t("loadError")}
          action={
            <Link href="/dashboard">
              <span className="ml-2 text-sm font-medium underline">{t("retry")}</span>
            </Link>
          }
        >
          <p className="mt-1 text-sm">{t("loadErrorDesc")}</p>
        </Alert>
      )}

      {isTrial && trialInfo.isTrial && !trialInfo.expired && trialInfo.hoursLeft <= 48 && (
        <Alert variant="warning" title={t("trialEndingSoon", { days: trialInfo.daysLeft })}>
          <p className="mt-1">{t("upgradeToContinue")}</p>
          <Link href="/dashboard/subscription" className="mt-2 inline-block">
            <Button size="sm" variant="outline">
              {t("upgradeNow")}
            </Button>
          </Link>
        </Alert>
      )}

      {isTrial && trialInfo.isTrial && trialInfo.expired && (
        <Alert variant="destructive" title={t("trialExpired")}>
          <p className="mt-1">{t("upgradeToContinue")}</p>
          <Link href="/dashboard/subscription" className="mt-2 inline-block">
            <Button size="sm">{t("upgradeNow")}</Button>
          </Link>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-navy-700 dark:text-navy-200">{t("overview")}</h2>
        <Link href={`/${locale}/dashboard/cheques/new`}>
          <Button size="lg" className="shadow-md shadow-primary/20">
            <Printer className="mr-2 h-4 w-4" />
            {t("printNewCheque")}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-navy-500 dark:text-navy-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy-800 dark:text-navy-200">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy-700 dark:text-navy-200">{t("recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("table.payee")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.bank")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.date")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentCheques.length > 0 ? (
                  recentCheques.map((cheque) => (
                    <tr key={cheque.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {cheque.payeeName || cheque.accountHolder || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {cheque.template?.bank?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {new Date(cheque.chequeDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {statusLabels[cheque.status] ?? cheque.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      {dataError ? t("loadError") : t("noRecentActivity")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy-700 dark:text-navy-200">{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={`/${locale}/dashboard/cheques/new`}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Printer className="h-4 w-4" />
              {t("createNew")}
            </Link>
            <Link
              href={`/${locale}/dashboard/templates`}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <FileText className="h-4 w-4" />
              {t("viewTemplates")}
            </Link>
            <Link
              href={`/${locale}/dashboard/history`}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Clock className="h-4 w-4" />
              {t("printHistory")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
