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
      // One user query returns the role, active subscription and both counts.
      // The remaining two reads are independent, so they run concurrently.
      // This replaces seven sequential round-trips with three — the biggest
      // win on serverless/Postgres deployments where latency dominates.
      const [dbUser, recent, templateCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            role: true,
            subscription: {
              where: { isActive: true },
              select: {
                endDate: true,
                plan: { select: { name: true, chequeLimit: true } },
              },
            },
            _count: { select: { chequeEntries: true, printHistories: true } },
          },
        }),
        prisma.chequeEntry.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            payeeName: true,
            accountHolder: true,
            chequeDate: true,
            status: true,
            template: { select: { bank: { select: { name: true } } } },
          },
        }),
        prisma.bankTemplate.count({
          where: { isActive: true, bank: { isActive: true } },
        }),
      ]);

      chequeCount = dbUser?._count.chequeEntries ?? 0;
      recentCheques = recent;
      activeTemplateCount = templateCount;
      isTrial = dbUser?.role === "TRIAL_USER";
      subscription = dbUser?.subscription ?? null;

      if (subscription && isTrial) {
        const rawMsLeft = new Date(subscription.endDate).getTime() - Date.now();
        const msLeft = Math.max(0, rawMsLeft);
        const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
        const daysLeft = Math.floor(msLeft / (24 * 60 * 60 * 1000));
        const printsUsed = dbUser?._count.printHistories ?? 0;
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
      tone: "bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400",
      bar: "from-blue-500 to-cyan-400",
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
      tone: "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400",
      bar: "from-violet-500 to-fuchsia-400",
    },
    {
      title: t("stats.activeTemplates"),
      value: dataError ? "—" : activeTemplateCount.toString(),
      icon: LayoutTemplate,
      tone: "bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-400",
      bar: "from-cyan-500 to-teal-400",
    },
    {
      title: t("printsLeftTrial"),
      value: trialInfo.isTrial && !dataError ? trialInfo.printsLeft.toString() : "—",
      icon: Printer,
      tone: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
      bar: "from-emerald-500 to-lime-400",
    },
  ];

  const statusLabels: Record<string, string> = {
    DRAFT: tStatus("status.draft"),
    READY: tStatus("status.ready"),
    PRINTED: tStatus("status.printed"),
    CANCELLED: tStatus("status.cancelled"),
  };

  const statusStyles: Record<string, string> = {
    PRINTED: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
    READY: "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300",
    DRAFT: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300",
    CANCELLED: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
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

      <section className="relative overflow-hidden rounded-2xl border border-navy-800/40 bg-gradient-to-br from-navy-950 via-navy-900 to-primary/70 px-6 py-7 text-white shadow-xl shadow-navy-950/20">
        <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-[0.14]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
              {t("overview")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {t("welcomeHeader", { name: user?.name ?? "" })}
            </h2>
          </div>
          <Link href={`/${locale}/dashboard/cheques/new`}>
            <Button
              size="lg"
              variant="secondary"
              className="w-full shadow-lg shadow-navy-950/30 sm:w-auto"
            >
              <Printer className="mr-2 h-4 w-4" />
              {t("printNewCheque")}
            </Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="group relative overflow-hidden border-border/70 bg-card/80 shadow-sm transition-shadow hover:shadow-md"
          >
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${stat.bar} opacity-70`}
            />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${stat.tone}`}
              >
                <stat.icon className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-navy-800 dark:text-navy-100">
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
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            statusStyles[cheque.status] ??
                            "bg-muted text-muted-foreground ring-border"
                          }`}
                        >
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
