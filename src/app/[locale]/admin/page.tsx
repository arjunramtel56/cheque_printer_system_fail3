import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Banknote, LayoutTemplate, BarChart3, TrendingUp, DollarSign } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin_ui");
  const session = await auth();
  const user = session?.user as any;

  let stats = {
    totalUsers: 0,
    totalCheques: 0,
    totalPrints: 0,
    totalBanks: 0,
    totalTemplates: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    recentAuditLogs: [] as any[],
  };

  try {
    stats = {
      totalUsers: await prisma.user.count(),
      totalCheques: await prisma.chequeEntry.count(),
      totalPrints: await prisma.printHistory.count(),
      totalBanks: await prisma.bank.count(),
      totalTemplates: await prisma.bankTemplate.count(),
      totalRevenue:
        Number(
          (
            await prisma.plan.aggregate({
              _sum: { price: true },
              where: { isActive: true },
            })
          )._sum?.price
        ) || 0,
      activeSubscriptions: await prisma.subscription.count({
        where: { isActive: true },
      }),
      recentAuditLogs: await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    };
  } catch {
    // Database not available
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("title")}</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalUsers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{t("registeredUsers")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalCheques")}</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCheques}</div>
            <p className="text-xs text-muted-foreground">{t("chequeEntries")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalPrints")}</CardTitle>
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPrints}</div>
            <p className="text-xs text-muted-foreground">{t("chequesPrinted")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("banks")}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBanks}</div>
            <p className="text-xs text-muted-foreground">
              {t("bankTemplates")}: {stats.totalTemplates}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("activeSubscriptions")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">{t("currentlyActive")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalRevenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              NPR {Number(stats.totalRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{t("fromPlans")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentAuditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noRecentActivity")}</p>
            ) : (
              <div className="space-y-3">
                {stats.recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.user?.name || "System"} · {log.entity}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/admin/users">
              <span className="block rounded-lg border p-3 text-center transition hover:bg-accent">
                <Users className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1 text-sm font-medium">{t("manageUsers")}</p>
              </span>
            </Link>
            <Link href="/admin/banks">
              <span className="block rounded-lg border p-3 text-center transition hover:bg-accent">
                <Banknote className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1 text-sm font-medium">{t("manageBanks")}</p>
              </span>
            </Link>
            <Link href="/admin/templates">
              <span className="block rounded-lg border p-3 text-center transition hover:bg-accent">
                <LayoutTemplate className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1 text-sm font-medium">{t("manageTemplates")}</p>
              </span>
            </Link>
            <Link href="/admin/audit-logs">
              <span className="block rounded-lg border p-3 text-center transition hover:bg-accent">
                <BarChart3 className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1 text-sm font-medium">{t("auditLogs")}</p>
              </span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
