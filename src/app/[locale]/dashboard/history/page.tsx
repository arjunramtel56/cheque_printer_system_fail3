import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function HistoryPage() {
  const t = await getTranslations("history");
  const session = await auth();
  const user = session?.user as any;

  let history: any[] = [];

  try {
    history = await prisma.printHistory.findMany({
      where: { userId: user?.id },
      orderBy: { printedAt: "desc" },
      take: 50,
      include: {
        cheque: {
          include: { template: { include: { bank: true } } },
        },
      },
    });
  } catch {
    // Database not available
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("title")}</h2>

      {history.length > 0 ? (
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
                    <th className="px-4 py-3 text-left font-medium">{t("table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">{new Date(item.printedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{item.cheque.payeeName || "-"}</td>
                      <td className="px-4 py-3">{item.cheque.template.bank.name}</td>
                      <td className="px-4 py-3 text-right">
                        NPR {Number(item.cheque.amountNumber).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-950/60 dark:text-green-200">
                          {t("printed")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
