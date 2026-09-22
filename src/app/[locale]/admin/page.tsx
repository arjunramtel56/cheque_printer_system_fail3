import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Banknote, LayoutTemplate, BarChart3 } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  let stats = {
    totalUsers: 0,
    totalCheques: 0,
    totalPrints: 0,
    totalBanks: 0,
  };

  try {
    stats = {
      totalUsers: await prisma.user.count(),
      totalCheques: await prisma.chequeEntry.count(),
      totalPrints: await prisma.printHistory.count(),
      totalBanks: await prisma.bank.count(),
    };
  } catch {
    // Database not available
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cheques</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCheques}</div>
            <p className="text-xs text-muted-foreground">Cheque entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Prints</CardTitle>
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPrints}</div>
            <p className="text-xs text-muted-foreground">Cheques printed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Banks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBanks}</div>
            <p className="text-xs text-muted-foreground">Bank templates</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
