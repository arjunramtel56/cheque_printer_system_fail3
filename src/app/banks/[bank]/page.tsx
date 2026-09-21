import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBankLabel, getBank, getBanks, getTemplatesForBank } from "@/lib/catalogue";
import { TemplateMeta, VerificationBadge } from "@/components/dashboard/CatalogueBadges";
import BankDetailClient from "./BankDetailClient";

/**
 * Bank detail page: /banks/[bank]
 *
 * The bank id comes from the URL. Templates are filtered server-side so a
 * layout can never silently fall back to a different bank's geometry.
 */
export function generateStaticParams(): { bank: string }[] {
  return getBanks().map((bank) => ({ bank: bank.id }));
}

export default async function BankPage({ params }: { params: Promise<{ bank: string }> }) {
  const { bank: bankId } = await params;
  const bank = getBank(bankId);
  if (!bank) notFound();

  const templates = getTemplatesForBank(bank.id);
  const selectable = templates.filter((template) => template.enabled && bank.enabled);

  return (
    <BankDetailClient
      bank={bank}
      selectable={selectable}
    />
  );
}
