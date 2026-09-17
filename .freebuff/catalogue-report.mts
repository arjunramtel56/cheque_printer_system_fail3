import { getCatalogueSummary, getBankGroups, getTemplatesForBank, getBank } from "../lib/catalogue";
import { getAllTemplates } from "../lib/templates";
import { CHEQUE_SIZES, PAPER_SIZES } from "../lib/sizes";

const s = getCatalogueSummary() as Record<string, unknown>;
console.log("SUMMARY", JSON.stringify(s, null, 2));
for (const g of getBankGroups()) {
  const withTemplates = g.banks.filter((b) => getTemplatesForBank(b.id).length > 0);
  console.log(`CLASS ${g.nrbClass}: ${g.banks.length} banks, ${withTemplates.length} with templates`);
}
console.log(
  "TEMPLATES",
  getAllTemplates().map((t) => `${t.id}|${t.bankId}|${t.sizeId}|${t.orientation}|${t.verification?.status ?? "?"}`),
);
console.log("SIZES", CHEQUE_SIZES.map((z) => `${z.id} ${z.widthMm}x${z.heightMm}`));
console.log("PAPERS", PAPER_SIZES.map((p) => `${p.id} ${p.widthMm}x${p.heightMm}`));
void getBank;
