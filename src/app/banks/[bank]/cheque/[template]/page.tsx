import { notFound } from "next/navigation";
import { getBank, getBanks, getTemplatesForBank } from "@/lib/catalogue";
import { getTemplateForBank } from "@/lib/templates";
import ChequeWorkspaceClient from "./ChequeWorkspaceClient";

/**
 * Deep-linked cheque workspace: /banks/[bank]/cheque/[template]
 *
 * The bank and template come from the URL, so a layout is shareable and can
 * never silently fall back to a different bank's geometry: both ids are
 * resolved here on the server and re-checked inside the workspace.
 */
export function generateStaticParams(): { bank: string; template: string }[] {
  return getBanks()
    .filter((bank) => bank.enabled)
    .flatMap((bank) =>
      getTemplatesForBank(bank.id)
        .filter((template) => template.enabled)
        .map((template) => ({ bank: bank.id, template: template.id })),
    );
}

export default async function BankChequePage({
  params,
}: {
  params: Promise<{ bank: string; template: string }>;
}) {
  const { bank: bankId, template: templateId } = await params;
  const bank = getBank(bankId);
  if (!bank || !bank.enabled) notFound();

  const template = getTemplateForBank(bankId, templateId);
  if (!template || !template.enabled) notFound();

  return (
    <ChequeWorkspaceClient bank={bank} template={template} />
  );
}
