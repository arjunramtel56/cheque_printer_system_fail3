import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-errors";
import { ChequesList, type ChequeListRow } from "@/components/dashboard/cheques-list";

export default async function ChequesPage() {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  const userId = user?.id;

  let initialCheques: ChequeListRow[] = [];
  let initialError = false;

  if (!userId) {
    initialError = true;
  } else {
    try {
      const cheques = await prisma.chequeEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          accountHolder: true,
          payeeName: true,
          chequeDate: true,
          amountNumber: true,
          amountWords: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          template: {
            select: {
              id: true,
              name: true,
              bank: { select: { id: true, name: true } },
            },
          },
        },
      });

      initialCheques = cheques.map((cheque) => ({
        id: cheque.id,
        accountHolder: cheque.accountHolder,
        payeeName: cheque.payeeName,
        chequeDate: cheque.chequeDate.toISOString(),
        amountNumber: cheque.amountNumber.toString(),
        amountWords: cheque.amountWords,
        status: cheque.status,
        createdAt: cheque.createdAt.toISOString(),
        updatedAt: cheque.updatedAt.toISOString(),
        template: cheque.template
          ? {
              id: cheque.template.id,
              name: cheque.template.name,
              bank: {
                id: cheque.template.bank.id,
                name: cheque.template.bank.name,
              },
            }
          : null,
      }));
    } catch (error) {
      console.error("[CHEQUES_PAGE_DATA_ERROR]", describePrismaError(error), error);
      initialError = true;
    }
  }

  return <ChequesList initialCheques={initialCheques} initialError={initialError} />;
}
