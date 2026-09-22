import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Clock, CreditCard, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  let chequeCount = 0;
  let recentCheques: any[] = [];
  let subscription: any = null;
  let trialInfo: { daysLeft: number; isTrial: boolean } = { daysLeft: 0, isTrial: false };

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
        (new Date(subscription.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );
      trialInfo = { daysLeft: daysLeft > 0 ? daysLeft : 0, isTrial: true };
    }
  } catch {
    // Database not available, show placeholder data
  }

  const stats = [
    {
      title: "Total Cheques",
      value: chequeCount.toString(),
      icon: FileText,
      description: "Printed to date",
    },
    {
      title: "Recent Prints",
      value: recentCheques.length.toString(),
      icon: Printer,
      description: "Last 5 prints",
    },
    {
      title: "Plan",
      value: subscription?.plan?.name || "Trial",
      icon: CreditCard,
      description: subscription?.plan
        ? `Valid till ${new Date(subscription.endDate).toLocaleDateString()}`
        : "14-day free trial",
    },
    {
      title: "History",
      value: "View all",
      icon: Clock,
      description: "Print history",
      href: "/dashboard/history",
    },
  ];

  return (
    <div className="space-y-6">
      {trialInfo.isTrial && trialInfo.daysLeft <= 7 && trialInfo.daysLeft > 0 && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold">
                Your trial period ends in {trialInfo.daysLeft} day{trialInfo.daysLeft !== 1 ? "s" : ""}.
              </p>
              <p className="mt-1">
                Upgrade now to continue creating cheques without interruption.
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
          href="/en/dashboard/print"
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
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {recentCheques.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent Cheques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCheques.map((cheque) => (
                <div
                  key={cheque.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{cheque.payeeName || cheque.accountHolder}</p>
                    <p className="text-sm text-muted-foreground">
                      {cheque.template.bank.name} &middot;{" "}
                      {new Date(cheque.chequeDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      NPR {Number(cheque.amountNumber).toLocaleString()}
                    </p>
                    <p className={`text-xs ${cheque.status === "PRINTED" ? "text-green-600" : "text-yellow-600"}`}>
                      {cheque.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Printer className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No cheques yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Print your first cheque to get started.
            </p>
            <Link
              href="/en/dashboard/print"
              className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Print Your First Cheque
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
