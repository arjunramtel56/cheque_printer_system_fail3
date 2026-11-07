import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-errors";
import { PayeesList, type Payee } from "@/components/dashboard/payees-list";

export default async function PayeesPage() {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  const userId = user?.id;

  let initialPayees: Payee[] = [];
  let initialError = false;

  if (!userId) {
    initialError = true;
  } else {
    try {
      const payees = await prisma.payee.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          bankAccount: true,
          chequeLimit: true,
          createdAt: true,
        },
      });

      initialPayees = payees.map((payee) => ({
        id: payee.id,
        name: payee.name,
        address: payee.address ?? undefined,
        phone: payee.phone ?? undefined,
        email: payee.email ?? undefined,
        bankAccount: payee.bankAccount ?? undefined,
        chequeLimit: payee.chequeLimit?.toString() ?? undefined,
        createdAt: payee.createdAt.toISOString(),
      }));
    } catch (error) {
      console.error("[PAYEES_PAGE_DATA_ERROR]", describePrismaError(error), error);
      initialError = true;
    }
  }

  return <PayeesList initialPayees={initialPayees} initialError={initialError} />;
}
