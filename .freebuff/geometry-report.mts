import { getTemplate } from "../lib/templates";
import { computeSheetLayout, type ChequeData } from "../lib/sheetLayout";
import type { ProfileKey } from "../lib/types";

const MODE_LABELS: Record<ProfileKey, string> = {
  custom_short: "Direct Feed — Short Edge First",
  custom_long: "Direct Feed — Long Edge First",
  a4_vertical: "A4 Carrier — Portrait",
  a4_horizontal: "A4 Carrier — Landscape",
};

const DATA: ChequeData = {
  date: "2026-09-17",
  payee: "Arjun Ramtel",
  amount: "125000.50",
  amountWords: "",
  accountPayee: true,
};

const t = getTemplate("siddhartha")!;
console.log(`TEMPLATE ${t.id} ${t.bankName} size=${t.sizeId} ${t.widthMm}x${t.heightMm} orientation=${t.orientation}`);
console.log("SAFE ZONES " + JSON.stringify(t.safeZones));
for (const [mode, label] of Object.entries(MODE_LABELS) as [ProfileKey, string][]) {
  const layout = computeSheetLayout(t, DATA, mode, { x: 0, y: 0 });
  console.log(`\n### ${mode} — ${label}`);
  console.log(`page ${layout.pageW}x${layout.pageH} paper=${layout.paperId} cheque @ (${layout.chequeX}, ${layout.chequeY}) ${layout.chequeW}x${layout.chequeH}`);
  for (const f of layout.fields) {
    console.log(
      `| ${f.label} | ${f.kind} | ${f.xMm.toFixed(2)} | ${f.yMm.toFixed(2)} | ${f.widthMm.toFixed(2)} | ${f.heightMm.toFixed(2)} |`,
    );
  }
}
