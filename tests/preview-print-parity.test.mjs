// ---------------------------------------------------------------------------
// Preview == print parity tests.
//
// The single most important structural claim of this system is that the screen
// preview and the printed page cannot disagree. That used to be a promise held
// together by three parallel render trees; it is now a property of the code:
//
//   components/ChequeSheet.tsx renders lib/sheetLayout.ts at one of two unit
//   scales, and nothing else renders a cheque.
//
// These tests check both halves: the layout engine behaviour (field text,
// geometry, safe zones, determinism) and the structural claim (one renderer,
// one unit factor, no mode-specific geometry branches).
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getAllTemplates, getTemplate } from "../lib/templates.ts";
import { computeSheetLayout, fieldsWithinCheque, printableFields, resolveWords } from "../lib/sheetLayout.ts";
import { fitFontSize, estimateTextWidthMm, splitWordsAcrossFields, splitWordsToLines } from "../lib/textFit.ts";
import { formatAmountDisplay, formatDateDigits, validateAmount } from "../lib/amountWords.ts";
import { validateSafeZoneClearance } from "../lib/validation.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url)) + "/";
const chequeSheetSource = readFileSync(repoRoot + "components/ChequeSheet.tsx", "utf8");
const sheetLayoutSource = readFileSync(repoRoot + "lib/sheetLayout.ts", "utf8");
const workspaceSource = readFileSync(repoRoot + "components/Workspace.tsx", "utf8");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log("  PASS: " + message);
  } else {
    failed++;
    console.error("  FAIL: " + message);
  }
}

const MODES = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];
const FULL_DATA = {
  date: "2026-09-17",
  payee: "Ram Bahadur Thapa",
  amount: "125000.50",
  amountWords: "",
  accountPayee: true,
};

console.log("=== PREVIEW / PRINT PARITY TESTS ===\n");

// ---------------------------------------------------------------------------
// 1. One renderer, one layout source
// ---------------------------------------------------------------------------
console.log("--- SECTION 1: Structural parity ---");

assert(sheetLayoutSource.includes("export function computeSheetLayout"), "there is exactly one layout computation");
assert(
  (sheetLayoutSource.match(/export function computeSheetLayout/g) || []).length === 1,
  "the layout is computed in exactly one exported function",
);
assert(chequeSheetSource.includes("function fieldStyle("), "there is exactly one field style function");
assert((chequeSheetSource.match(/function fieldStyle\(/g) || []).length === 1, "field styling is not duplicated per output path");
assert(
  (chequeSheetSource.match(/lengthToCss\(field\./g) || []).length >= 3,
  "field rectangles are converted to display units through one conversion function",
);
assert(!chequeSheetSource.includes("DirectFeed"), "the renderer has no direct-feed-specific branch");
assert(!chequeSheetSource.includes("A4Carrier"), "the renderer has no carrier-specific branch");
assert(!/mode === "a4_vertical" \?[^;]*left|mode === "a4_vertical" \?[^;]*top/.test(chequeSheetSource), "no per-mode geometry math in the renderer");
assert(
  workspaceSource.includes('variant="preview"') && workspaceSource.includes('variant="print"'),
  "the workspace renders the same component for preview and print",
);
assert(
  (workspaceSource.match(/<ChequeSheet/g) || []).length >= 2,
  "both output paths go through ChequeSheet",
);
assert(
  !workspaceSource.includes("function PrintField") && !workspaceSource.includes("PrintSignatureBox"),
  "the old duplicated print renderers are gone",
);

// ---------------------------------------------------------------------------
// 2. The unit factor is the only difference between the two paths
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 2: Unit scaling ---");

assert(chequeSheetSource.includes("export function unitFactor(variant: SheetVariant): number"), "a single unitFactor function is exported");
assert(chequeSheetSource.includes("export const PREVIEW_SCALE = 2.4"), "the preview scale is a single named constant");
{
  const lengthFn = chequeSheetSource.match(/export function lengthToCss\([\s\S]*?\n}/)?.[0] ?? "";
  assert(lengthFn.includes("px") && lengthFn.includes("mm"), "lengthToCss maps millimetres to px for preview and mm for print");
  assert((lengthFn.match(/\?/g) || []).length === 1, "lengthToCss has a single, exhaustive variant decision");
  assert(!sheetLayoutSource.includes("PREVIEW_SCALE"), "the layout engine knows nothing about screen pixels");
}
{
  // The renderer must never apply a per-field scale of its own.
  const scaleUsages = chequeSheetSource.match(/PREVIEW_SCALE/g) || [];
  assert(scaleUsages.length <= 10, `the preview scale is referenced in a fixed number of places (${scaleUsages.length}), not once per field`);
  assert(!chequeSheetSource.includes("* 0.352778"), "font-point conversion is not re-implemented in the renderer");
}

// ---------------------------------------------------------------------------
// 3. Layout behaviour: identical rectangles regardless of who asks
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 3: Deterministic, unit-independent layout ---");

for (const template of getAllTemplates()) {
  for (const mode of MODES) {
    const first = computeSheetLayout(template, FULL_DATA, mode, { x: 1.4, y: -0.6 });
    const second = computeSheetLayout(template, FULL_DATA, mode, { x: 1.4, y: -0.6 });
    assert(
      JSON.stringify(first) === JSON.stringify(second),
      `${template.id} ${mode}: layout is byte-identical across recomputation`,
    );
    assert(
      first.fields.every((f) => Number.isFinite(f.xMm) && Number.isFinite(f.yMm) && Number.isFinite(f.widthMm)),
      `${template.id} ${mode}: every field rectangle is finite`,
    );
    assert(first.pageW > 0 && first.pageH > 0, `${template.id} ${mode}: page box is real`);
  }
}

// ---------------------------------------------------------------------------
// 4. Field content resolution
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 4: Field content ---");

{
  const layout = computeSheetLayout(getTemplate("siddhartha"), FULL_DATA, "custom_short", { x: 0, y: 0 });
  const byKey = Object.fromEntries(layout.fields.map((f) => [f.key, f]));
  assert(byKey.date.text === formatDateDigits("2026-09-17"), "date renders as eight independent digits");
  assert(byKey.payee.text === "Ram Bahadur Thapa", "payee renders the entered name");
  assert(byKey.amount.text === `Rs. ${formatAmountDisplay(12500050)}`, "amount renders with the rupee marker and grouping");
  assert(byKey.words1.text.startsWith("One Lakh"), "amount in words uses the Nepali lakh grouping");
  assert(byKey.bankNameLine.text === "Siddhartha Bank Limited", "the bank name is a data-driven field, not hardcoded in the renderer");
  assert(byKey.payLabel.text === "Pay against this cheque to", "captions are data-driven fields");
  assert(byKey.accountPayee.text.includes("A/C PAYEE"), "the crossing comes from template data");
  assert(byKey.sig1.kind === "signature" && byKey.sig1.printable === false, "signature panels are screen-only placeholders");
}

{
  const wordsFields = Object.values(getTemplate("siddhartha").fields).filter((f) => f.kind === "words");
  const long = resolveWords({ ...FULL_DATA, amountWords: "Nine Hundred Ninety Nine Crore Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Rupees Only" });
  const lines = splitWordsAcrossFields(long, wordsFields);
  assert(lines.length === wordsFields.length, "words wrap across exactly the declared number of word fields");
  assert(lines.every((l) => typeof l === "string"), "each word line is a string");
  const [l1, l2] = splitWordsToLines(long, getTemplate("siddhartha"));
  assert(l1.length > 0 && (l1.length + l2.length) >= long.length - 1, "the classic two-line splitter still packs greedily");
}

{
  const empty = computeSheetLayout(getTemplate("siddhartha"), { date: "", payee: "", amount: "", amountWords: "", accountPayee: false }, "custom_short", { x: 0, y: 0 });
  const dataKinds = ["date-grid", "payee", "words", "amount", "ac-payee"];
  assert(
    empty.fields.filter((f) => dataKinds.includes(f.kind)).every((f) => f.text === ""),
    "an empty form prints no data at all (only the template's static captions)",
  );
  assert(
    printableFields(empty).every((f) => f.kind === "label"),
    "with no data entered, only the static template labels are printable",
  );
  assert(empty.fields.find((f) => f.key === "amount").text === "", "empty amount renders empty");
  assert(empty.fields.find((f) => f.key === "date").text === "", "empty date renders empty");
}

{
  const invalid = computeSheetLayout(getTemplate("siddhartha"), { ...FULL_DATA, amount: "0", payee: "   " }, "custom_short", { x: 0, y: 0 });
  assert(invalid.fields.find((f) => f.key === "amount").text === "", "a zero amount prints nothing");
  assert(invalid.fields.find((f) => f.key === "payee").text === "", "an invalid payee prints nothing");
}

// ---------------------------------------------------------------------------
// 5. Text fitting is shared by both paths
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 5: Shared text fitting ---");

{
  const field = { width: 40, fontSize: 12, minFontSize: 6 };
  const long = "Ram Bahadur Thapa Shrestha Jyoti Kumari Maharjan";
  const fitted = fitFontSize(long, field);
  assert(fitted < 12, "long text shrinks below the preferred size");
  assert(fitted >= 6, "text never shrinks below the readable floor");
  assert(fitFontSize("Ram", field) === 12, "short text keeps the preferred size");

  const normal = "Ram Bahadur Thapa Shrestha";
  const fittedNormal = fitFontSize(normal, field);
  assert(estimateTextWidthMm(normal, fittedNormal) <= 40, "a normal-length name is fitted to the field width");

  // Documented floor behaviour: below the readable minimum the text stops
  // shrinking and is clipped instead, rather than becoming unprintable.
  assert(fitFontSize(long, field) === 6, "text beyond the readable floor stops shrinking at 6 pt (clipped, not unreadable)");

  for (const template of getAllTemplates()) {
    const normalLayout = computeSheetLayout(template, { ...FULL_DATA, payee: normal }, "custom_short", { x: 0, y: 0 });
    const payee = normalLayout.fields.find((f) => f.key === "payee");
    assert(payee.fontSizePt >= 6, `${template.id}: payee font floor respected in the shared layout`);
    assert(
      estimateTextWidthMm(payee.text, payee.fontSizePt) <= payee.widthMm + 0.01,
      `${template.id}: a normal payee name fits its field width`,
    );
    const longLayout = computeSheetLayout(template, { ...FULL_DATA, payee: long }, "custom_short", { x: 0, y: 0 });
    assert(longLayout.fields.find((f) => f.key === "payee").fontSizePt >= 6, `${template.id}: floor holds for over-long names too`);
  }
}

// ---------------------------------------------------------------------------
// 6. Reserved zones reach neither output
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 6: Reserved zones in parity ---");

for (const template of getAllTemplates()) {
  assert(validateSafeZoneClearance(template).length === 0, `${template.id}: no printed field enters a reserved zone`);
  const layout = computeSheetLayout(template, FULL_DATA, "custom_short", { x: 0, y: 0 });
  assert((layout.safeZones ?? []).length > 0, `${template.id}: reserved zones travel with the layout`);
  assert(fieldsWithinCheque(layout), `${template.id}: printed fields stay inside the cheque box`);
}

// ---------------------------------------------------------------------------
// 7. Calibration parity
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 7: Calibration parity ---");

for (const mode of MODES) {
  const neutral = computeSheetLayout(getTemplate("siddhartha"), FULL_DATA, mode, { x: 0, y: 0 });
  const shifted = computeSheetLayout(getTemplate("siddhartha"), FULL_DATA, mode, { x: 0.5, y: 0.5 });
  assert(neutral.calibration.x === 0 && neutral.calibration.y === 0, `${mode}: neutral calibration reported as zero`);
  assert(shifted.calibration.x === 0.5 && shifted.calibration.y === 0.5, `${mode}: applied calibration is reported back exactly`);
  const neutralDate = neutral.fields.find((f) => f.key === "date");
  const shiftedDate = shifted.fields.find((f) => f.key === "date");
  assert(Math.abs(shiftedDate.xMm - neutralDate.xMm - 0.5) < 0.0001, `${mode}: 0.5 mm X calibration moves the field exactly 0.5 mm`);
  assert(Math.abs(shiftedDate.yMm - neutralDate.yMm - 0.5) < 0.0001, `${mode}: 0.5 mm Y calibration moves the field exactly 0.5 mm`);
  assert(shiftedDate.widthMm === neutralDate.widthMm, `${mode}: calibration does not resize`);
  assert(shifted.chequeW === neutral.chequeW && shifted.chequeH === neutral.chequeH, `${mode}: cheque physical size is calibration-invariant`);
}

{
  const amount = validateAmount("100.50");
  assert(amount.paisa === 10050, "amounts remain integer paisa in the shared pipeline (no float drift into print)");
}

console.log("\n=== PREVIEW / PRINT PARITY SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome parity tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll preview/print parity tests PASSED.");
}
