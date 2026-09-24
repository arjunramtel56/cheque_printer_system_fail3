import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Clock, CreditCard, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ChequePrintLayout } from "@/components/cheque/ChequePrintLayout";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  let chequeCount = 0;
  let recentCheques: any[] = [];
  let subscription: any = null;
  let trialInfo: { daysLeft: number; printsLeft: number; isTrial: boolean } = {
    daysLeft: 0,
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

    subscription = await prisma.subscription.findFirst({
      where: { userId: user?.id, isActive: true },
      include: { plan: true },
    });

    if (subscription && user?.role === "TRIAL_USER") {
      const daysLeft = Math.ceil(
        (new Date(subscription.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      trialInfo = {
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        printsLeft: Math.max(0, 10 - (chequeCount || 0)),
        isTrial: true,
      };
    }
  } catch {
    // Database not available, show placeholder data
  }

  const stats = [
    {
      title: "Cheques Printed",
      value: chequeCount.toString(),
      icon: FileText,
    },
    {
      title: "Trial Days Left",
      value: trialInfo.isTrial ? trialInfo.daysLeft.toString() : "—",
      icon: AlertTriangle,
    },
    {
      title: "Active Templates",
      value: "3",
      icon: CreditCard,
    },
    {
      title: "Prints Left (Trial)",
      value: trialInfo.isTrial ? trialInfo.printsLeft.toString() : "—",
      icon: Printer,
    },
  ];

  const isTrial = user?.role === "TRIAL_USER";

  return (
    <div className="space-y-6">
      {trialInfo.isTrial && trialInfo.daysLeft <= 7 && trialInfo.daysLeft > 0 && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold">
                Your trial period ends in {trialInfo.daysLeft} day
                {trialInfo.daysLeft !== 1 ? "s" : ""}.
              </p>
              <p className="mt-1">Upgrade now to continue creating cheques without interruption.</p>
              <Link href="/en/dashboard/subscription">
                <Button size="sm" className="mt-2">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {trialInfo.isTrial && trialInfo.daysLeft <= 0 && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="font-semibold">Your trial period has expired.</p>
              <p className="mt-1">
                Please upgrade your subscription to continue using the service.
              </p>
              <Link href="/en/dashboard/subscription">
                <Button size="sm" className="mt-2">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Overview</h2>
        <Link
          href="/en/dashboard/cheques/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print New Cheque
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

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Recent Activity</h3>
        </div>
        <table className="w-full text-left text-sm text-slate-800 dark:text-slate-200">
          <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {recentCheques.length > 0 ? (
              recentCheques.map((cheque) => (
                <tr key={cheque.id}>
                  <td className="px-6 py-4 font-medium text-sm">
                    {cheque.payeeName || cheque.accountHolder || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold">
                      CHEQUE_CREATED
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                    {new Date(cheque.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No recent activity.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Link
              href="/en/dashboard/cheques/new"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 w-full"
            >
              <Printer className="mr-2 h-4 w-4" />
              Create New Cheque
            </Link>
            <Link
              href="/en/dashboard/templates"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm font-medium shadow-sm hover:bg-accent w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              View Templates
            </Link>
            <Link
              href="/en/dashboard/history"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm font-medium shadow-sm hover:bg-accent w-full"
            >
              <Clock className="mr-2 h-4 w-4" />
              Print History
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
