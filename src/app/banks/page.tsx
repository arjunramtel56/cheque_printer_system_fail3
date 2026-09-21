import Link from "next/link";
import { getBankGroups, getCatalogueSummary, getTemplatesForBank, formatBankLabel } from "@/lib/catalogue";
import BanksDirectoryClient from "./BanksDirectoryClient";

/**
 * Bank directory: every institution in the catalogue, grouped by NRB class,
 * with an honest template-availability column. A bank with no measured layout
 * is listed as "template pending" rather than hidden.
 */
export default function BanksPage() {
  const groups = getBankGroups();
  const summary = getCatalogueSummary();

  return (
    <BanksDirectoryClient
      groups={groups}
      summary={summary}
    />
  );
}
