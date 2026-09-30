import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, FileText, Clock, CreditCard, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard_ui");
  const session = await auth();
  const user = session?.user as any;

  let chequeCount = 0;
  let recentCheques: any[] = [];
  let subscription: any = null;
  let activeTemplateCount = 0;
  let trialInfo: { daysLeft: number; hoursLeft: number; printsLeft: number; isTrial: boolean } = {
    daysLeft: 0,
    hoursLeft: 0,
    printsLeft: 0,
    isTrial: false,
  };

  try {
    chequeCount = await prisma.chequeEntry.count({
      where: { userId: user?.id },
    });

    recentCheques = await prisma.chequeEntry.findMany({
      where: { userId: user?.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { template: { include: { bank: true } } },
    });

    // Real count of active bank templates available to the user.
    activeTemplateCount = await prisma.bankTemplate.count({
      where: { isActive: true, bank: { isActive: true } },
    });

    subscription = await prisma.subscription.findFirst({
      where: { userId: user?.id, isActive: true },
      include: { plan: true },
    });

    if (subscription && user?.role === "TRIAL_USER") {
      const msLeft = new Date(subscription.endDate).getTime() - Date.now();
      // Show fractional trials as hours so a 24-hour trial never reads "365".
      const daysLeft = Math.floor(msLeft / (24 * 60 * 60 * 1000));
      const hoursLeft = Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000)));
      const printsUsed = await prisma.printHistory.count({
        where: { userId: user?.id },
      });
      const limit = subscription.plan.chequeLimit > 0 ? subscription.plan.chequeLimit : 0;
      const printsLeft = limit > 0 ? Math.max(0, limit - printsUsed) : 0;
      trialInfo = {
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        hoursLeft,
        printsLeft,
        isTrial: true,
      };
    }
  } catch {
    // Database not available, show placeholder data
  }

  const stats = [
    {
      title: t("stats.chequesPrinted"),
      value: chequeCount.toString(),
      icon: FileText,
    },
    {
      title: t("stats.trialDaysLeft"),
      value: trialInfo.isTrial
        ? trialInfo.daysLeft > 0
          ? trialInfo.daysLeft.toString()
          : t("trialHoursLeft", { hours: trialInfo.hoursLeft })
        : "—",
      icon: AlertTriangle,
    },
    {
      title: t("stats.activeTemplates"),
      value: activeTemplateCount.toString(),
      icon: CreditCard,
    },
    {
      title: t("printsLeftTrial"),
      value: trialInfo.isTrial ? trialInfo.printsLeft.toString() : "—",
      icon: Printer,
    },
  ];

  const isTrial = user?.role === "TRIAL_USER";

  return (
    <div className="space-y-6">
      {isTrial && trialInfo.isTrial && trialInfo.daysLeft <= 7 && trialInfo.daysLeft > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">{t("trialEndingSoon", { days: trialInfo.daysLeft })}</p>
              <p className="mt-1">{t("upgradeToContinue")}</p>
              <Link href="/dashboard/subscription">
                <span className="mt-2 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  {t("upgradeNow")}
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {isTrial && trialInfo.isTrial && trialInfo.daysLeft <= 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-semibold">{t("trialExpired")}</p>
              <p className="mt-1">{t("upgradeToContinue")}</p>
              <Link href="/dashboard/subscription">
                <span className="mt-2 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  {t("upgradeNow")}
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("overview")}</h2>
        <Link
          href="/dashboard/cheques/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Printer className="mr-2 h-4 w-4" />
          {t("printNewCheque")}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">{t("recentActivity")}</h3>
        </div>
        <table className="w-full text-left text-sm text-foreground">
          <thead className="bg-muted text-muted-foreground font-medium">
            <tr>
              <th className="px-6 py-3">{t("table.user")}</th>
              <th className="px-6 py-3">{t("table.action")}</th>
              <th className="px-6 py-3">{t("table.time")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentCheques.length > 0 ? (
              recentCheques.map((cheque) => (
                <tr key={cheque.id}>
                  <td className="px-6 py-4 font-medium text-sm">
                    {cheque.payeeName || cheque.accountHolder || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-bold">
                      CHEQUE_CREATED
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(cheque.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                  {t("noRecentActivity")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Link
              href="/dashboard/cheques/new"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 w-full"
            >
              <Printer className="mr-2 h-4 w-4" />
              {t("createNew")}
            </Link>
            <Link
              href="/dashboard/templates"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm font-medium shadow-sm hover:bg-accent w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              {t("viewTemplates")}
            </Link>
            <Link
              href="/dashboard/history"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm font-medium shadow-sm hover:bg-accent w-full"
            >
              <Clock className="mr-2 h-4 w-4" />
              {t("printHistory")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
