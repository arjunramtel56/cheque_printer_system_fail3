import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-errors";
import { HistoryList, type HistoryRow } from "@/components/dashboard/history-list";

export default async function HistoryPage() {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  const userId = user?.id;

  let initialRows: HistoryRow[] = [];
  let initialError = false;

  if (!userId) {
    initialError = true;
  } else {
    try {
      const history = await prisma.printHistory.findMany({
        where: { userId },
        orderBy: { printedAt: "desc" },
        take: 100,
        select: {
          id: true,
          printedAt: true,
          copies: true,
          printerName: true,
          cheque: {
            select: {
              id: true,
              payeeName: true,
              accountHolder: true,
              amountNumber: true,
              chequeNumber: true,
              status: true,
              template: {
                select: {
                  name: true,
                  bank: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      initialRows = history.map((item) => ({
        id: item.id,
        printedAt: item.printedAt.toISOString(),
        copies: item.copies,
        printerName: item.printerName,
        cheque: {
          id: item.cheque.id,
          payeeName: item.cheque.payeeName,
          accountHolder: item.cheque.accountHolder,
          amountNumber: item.cheque.amountNumber.toString(),
          chequeNumber: item.cheque.chequeNumber,
          status: item.cheque.status,
          template: {
            name: item.cheque.template.name,
            bank: { name: item.cheque.template.bank.name },
          },
        },
      }));
    } catch (error) {
      console.error("[HISTORY_PAGE_DATA_ERROR]", describePrismaError(error), error);
      initialError = true;
    }
  }

  return <HistoryList initialRows={initialRows} initialError={initialError} />;
}
