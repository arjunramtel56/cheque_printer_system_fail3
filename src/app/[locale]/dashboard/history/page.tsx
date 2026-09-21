import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default async function HistoryPage() {
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
      <h2 className="text-2xl font-bold">Print History</h2>

      {history.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Payee</th>
                    <th className="px-4 py-3 text-left font-medium">Bank</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">
                        {new Date(item.printedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{item.cheque.payeeName || "-"}</td>
                      <td className="px-4 py-3">{item.cheque.template.bank.name}</td>
                      <td className="px-4 py-3 text-right">
                        NPR {Number(item.cheque.amountNumber).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                          Printed
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
            <h3 className="mt-4 text-lg font-semibold">No print history</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your printed cheques will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
