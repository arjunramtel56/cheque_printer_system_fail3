import { auth } from "@/auth";
import { ChequeComposer } from "@/components/cheque/ChequeComposer";

export default async function NewChequePage() {
  const session = await auth();
  const role = (session?.user as any)?.role as
    "TRIAL_USER" | "USER" | "ADMIN" | "SUPER_ADMIN" | undefined;

  return <ChequeComposer userRole={role} />;
}
