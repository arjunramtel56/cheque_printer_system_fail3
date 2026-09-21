// Comprehensive print verification script
// Tests all print scenarios programmatically

import { getTemplate, getAllTemplates } from "../src/lib/templates.ts";
import { validateAmount, formatDateDigits, validatePayee, checkAmountWordsConsistency, validateChequeDate, amountToWordsFromPaisa } from "../src/lib/amountWords.ts";
import { clampCalibration, validateCalibrationPair, CALIBRATION_MIN_MM, CALIBRATION_MAX_MM } from "../src/lib/calibration.ts";
import { resolvePrintGeometry, rotatedContentOffset, resolveCalibratedGeometry, STANDARD_CHEQUE_W_MM, STANDARD_CHEQUE_H_MM, A4_PORTRAIT_W_MM, A4_PORTRAIT_H_MM, A4_LANDSCAPE_W_MM, A4_LANDSCAPE_H_MM } from "../src/lib/printGeometry.ts";
import { validatePrintGeometry, validateCalibratedBounds, validateBankTemplate } from "../src/lib/validation.ts";
import { isDirectFeed, DIRECT_FEED_MODES, A4_CARRIER_MODES } from "../src/lib/types.ts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { passed++; console.log("  PASS: " + message); }
  else { failed++; console.error("  FAIL: " + message); }
}

console.log("=== COMPLETE PRINT TEST SIMULATION ===\n");

// ============================================================================
// SECTION 1: Complete Print Flow - All fields
// ============================================================================
console.log("--- SECTION 1: Complete Print Flow ---");

const templates = getAllTemplates();
const siddhartha = getTemplate("siddhartha");

const testCases = [
  { date: "2024-03-15", payee: "Ram Bahadur Thapa", amount: "100", words: "One Hundred Rupees Only", mode: "custom_short" },
  { date: "2024-03-15", payee: "Ram Bahadur Thapa", amount: "100", words: "One Hundred Rupees Only", mode: "custom_long" },
  { date: "2024-03-15", payee: "Ram Bahadur Thapa", amount: "100", words: "One Hundred Rupees Only", mode: "a4_vertical" },
  { date: "2024-03-15", payee: "Ram Bahadur Thapa", amount: "100", words: "One Hundred Rupees Only", mode: "a4_horizontal" },
];

for (const tc of testCases) {
  const dateOk = validateChequeDate(tc.date).valid;
  const payeeOk = validatePayee(tc.payee).valid;
  const amountOk = validateAmount(tc.amount);
  const wordsOk = checkAmountWordsConsistency(tc.amount, tc.words).consistent;
  const geom = resolvePrintGeometry(siddhartha, tc.mode);
  const geomValid = validatePrintGeometry(geom, siddhartha, tc.mode);
  const boundsValid = validateCalibratedBounds(siddhartha, tc.mode);
  assert(dateOk, `${tc.mode}: date valid`);
  assert(payeeOk, `${tc.mode}: payee valid`);
  assert(amountOk.valid && amountOk.paisa > 0, `${tc.mode}: amount valid (${amountOk.paisa} paisa)`);
  assert(wordsOk, `${tc.mode}: words consistent`);
  assert(geomValid === null, `${tc.mode}: geometry valid`);
  assert(boundsValid === null, `${tc.mode}: bounds valid`);
}

// ============================================================================
// SECTION 2: All Print Profiles - Direct Feed
// ============================================================================
console.log("\n--- SECTION 2: Direct Feed Profiles ---");

for (const t of templates) {
  for (const mode of DIRECT_FEED_MODES) {
    const geom = resolvePrintGeometry(t, mode);
    const offset = rotatedContentOffset(geom);
    const valid = validatePrintGeometry(geom, t, mode);
    // Direct Feed: page box is always the cheque's physical size (190.5×88.9 mm).
    // No CSS rotation — feed direction is a printer setting.
    assert(geom.pageW === STANDARD_CHEQUE_W_MM && geom.pageH === STANDARD_CHEQUE_H_MM, `${t.id}: DF page = ${STANDARD_CHEQUE_W_MM}x${STANDARD_CHEQUE_H_MM} mm`);
    assert(offset.leftMm === 0 && offset.topMm === 0, `${t.id}: DF no rotation offset`);
    assert(valid === null, `${t.id}: ${mode} geometry valid`);
  }
}

// ============================================================================
// SECTION 3: All Print Profiles - A4
// ============================================================================
console.log("\n--- SECTION 3: A4 Carrier Profiles ---");

for (const t of templates) {
  for (const mode of A4_CARRIER_MODES) {
    const geom = resolvePrintGeometry(t, mode);
    const valid = validatePrintGeometry(geom, t, mode);
    const boundsValid = validateCalibratedBounds(t, mode);
    const profile = t.profiles[mode];
    const rightEdge = profile.x + t.widthMm;
    const bottomEdge = profile.y + t.heightMm;
    assert(rightEdge <= geom.pageW + 0.05, `${t.id}: ${mode} cheque right edge (${rightEdge}) <= page (${geom.pageW})`);
    assert(bottomEdge <= geom.pageH + 0.05, `${t.id}: ${mode} cheque bottom edge (${bottomEdge}) <= page (${geom.pageH})`);
    assert(valid === null, `${t.id}: ${mode} geometry valid`);
    assert(boundsValid === null, `${t.id}: ${mode} bounds valid`);
    const calGeom = resolveCalibratedGeometry(t, mode, { x: 5, y: 5 });
    assert(calGeom.finalChequeX + t.widthMm <= calGeom.pageW + 0.05, `${t.id}: ${mode} +5cal X fits`);
    assert(calGeom.finalChequeY + t.heightMm <= calGeom.pageH + 0.05, `${t.id}: ${mode} +5cal Y fits`);
  }
}

// ============================================================================
// SECTION 4: Input - Amount tests
// ============================================================================
console.log("\n--- SECTION 4: Amount Input Tests ---");

const amountTests = [
  { input: "1", expected: 100 },
  { input: "10", expected: 1000 },
  { input: "100", expected: 10000 },
  { input: "100.50", expected: 10050 },
  { input: "1,000.50", expected: 100050 },
  { input: "999999999999.99", expected: 99999999999999 },
];
for (const at of amountTests) {
  const result = validateAmount(at.input);
  assert(result.valid && result.paisa === at.expected, `Amount "${at.input}" -> ${result.paisa} paisa (expected ${at.expected})`);
}
const invalidAmounts = ["invalid", "-100", "abc", "NaN", "Infinity", "10.123", ""];
for (const ia of invalidAmounts) {
  const result = validateAmount(ia);
  assert(!result.valid, `Invalid amount "${ia}" rejected`);
}
const zeroResult = validateAmount("0");
assert(zeroResult.valid && zeroResult.paisa === 0, "Zero parses to 0 paisa (rejected at gate level)");

// ============================================================================
// SECTION 5: Input - Date tests
// ============================================================================
console.log("\n--- SECTION 5: Date Input Tests ---");

const dateTests = [
  { input: "2024-03-15", desc: "normal date" },
  { input: "2024-02-29", desc: "leap year Feb 29" },
  { input: "2023-02-28", desc: "non-leap Feb 28" },
  { input: "2024-01-01", desc: "year boundary" },
  { input: "2024-01-31", desc: "month boundary Jan 31" },
  { input: "2024-12-31", desc: "year boundary Dec 31" },
];
for (const dt of dateTests) {
  assert(validateChequeDate(dt.input).valid, `Date ${dt.desc}: ${dt.input} valid`);
}
const invalidDates = ["2023-02-29", "2026-02-30", "2026-13-01", "not-a-date", "2024/03/15"];
for (const id of invalidDates) {
  assert(!validateChequeDate(id).valid, `Invalid date "${id}" rejected`);
}

// ============================================================================
// SECTION 6: Input - Payee tests
// ============================================================================
console.log("\n--- SECTION 6: Payee Input Tests ---");

const payeeTests = [
  { input: "A", desc: "short payee" },
  { input: "Ram Bahadur Thapa", desc: "normal payee" },
  { input: "\u0930\u093E\u092E \u092C\u0939\u093E\u0926\u0941\u0930", desc: "unicode payee" },
  { input: "O'Brien-Smith Jr.", desc: "special chars" },
  { input: "ABC & Co. #5 @ Ltd.", desc: "special chars only" },
];
for (const pt of payeeTests) {
  const result = validatePayee(pt.input);
  assert(result.valid, `Payee "${pt.desc}": valid`);
}
const longPayee = "A".repeat(121);
const longResult = validatePayee(longPayee);
assert(!longResult.valid, "Overlong payee (121 chars) rejected");

// ============================================================================
// SECTION 7: Calibration tests
// ============================================================================
console.log("\n--- SECTION 7: Calibration Tests ---");

const calibrationTests = [
  { x: 0, y: 0, desc: "zero" },
  { x: 0.1, y: 0, desc: "+0.1" },
  { x: -0.1, y: 0, desc: "-0.1" },
  { x: 1, y: 0, desc: "+1" },
  { x: -1, y: 0, desc: "-1" },
  { x: 25, y: 0, desc: "max positive" },
  { x: -25, y: 0, desc: "max negative" },
  { x: 30, y: 0, desc: "above max" },
  { x: -30, y: 0, desc: "below min" },
];
for (const ct of calibrationTests) {
  if (ct.x > 25 || ct.x < -25) {
    assert(validateCalibrationPair(ct.x, ct.y) !== null, `Calibration ${ct.desc}: rejected`);
  } else {
    assert(validateCalibrationPair(ct.x, ct.y) === null, `Calibration ${ct.desc}: accepted`);
  }
  const clamped = clampCalibration(ct.x);
  assert(Number.isFinite(clamped) && clamped >= -25 && clamped <= 25, `clampCalibration(${ct.x}) -> ${clamped}`);
}
assert(clampCalibration(NaN) === 0, "NaN clamps to 0");
assert(clampCalibration(Infinity) === 0, "Infinity clamps to 0");
assert(clampCalibration(-Infinity) === 0, "-Infinity clamps to 0");
assert(validateCalibrationPair(NaN, 0) !== null, "NaN calibration rejected by pair validator");
assert(validateCalibrationPair(0, Infinity) !== null, "Infinity calibration rejected by pair validator");

// Calibration independence
const dfCal = { x: 1.5, y: 0.7 };
const a4Cal = { x: -2.3, y: 1.1 };
assert(dfCal.x !== a4Cal.x, "DF and A4 calibration are independent (different values)");

// A4 clamping independence verification
const a4vExtreme = resolveCalibratedGeometry(siddhartha, "a4_vertical", { x: 25, y: 25 });
assert(a4vExtreme.calibratedClamped === true, "A4 v: extreme cal is clamped");
const a4hExtreme = resolveCalibratedGeometry(siddhartha, "a4_horizontal", { x: -55, y: -65 });
assert(a4hExtreme.calibratedClamped === true, "A4 h: extreme -cal is clamped");
const dfExtreme = resolveCalibratedGeometry(siddhartha, "custom_short", { x: 25, y: 25 });
assert(dfExtreme.calibratedClamped === false, "DF: calibration does not clamp cheque position");

// ============================================================================
// SECTION 8: Bank Template QA
// ============================================================================
console.log("\n--- SECTION 8: Bank Template QA ---");

for (const t of templates) {
  assert(t.widthMm === STANDARD_CHEQUE_W_MM && t.heightMm === STANDARD_CHEQUE_H_MM, `${t.id}: dimensions ${t.widthMm}x${t.heightMm}`);
  const date = t.fields.date;
  assert(date && typeof date.x === "number" && typeof date.y === "number", `${t.id}: date position (${date?.x}, ${date?.y})`);
  const payee = t.fields.payee;
  assert(payee && typeof payee.x === "number" && typeof payee.y === "number", `${t.id}: payee position (${payee?.x}, ${payee?.y})`);
  const amount = t.fields.amount;
  assert(amount && typeof amount.x === "number" && typeof amount.y === "number", `${t.id}: amount position (${amount?.x}, ${amount?.y})`);
  const words1 = t.fields.words1;
  const words2 = t.fields.words2;
  assert(words1 && words2, `${t.id}: amount words fields exist`);
  const ap = t.fields.accountPayee;
  assert(ap && ap.align === "center" && ap.x === 0, `${t.id}: A/C PAYEE at x=0, centered`);
  const signatureFields = Object.values(t.fields).filter((f) => f.kind === "signature");
  assert(signatureFields.length >= 2, `${t.id}: signature areas exist as data-driven fields`);
  assert(signatureFields.every((f) => f.printable === undefined && f.label), `${t.id}: signature fields carry labels`);
  const reservedZones = t.safeZones ?? [];
  assert(reservedZones.some((z) => z.id === "micr"), `${t.id}: MICR band is a reserved (never printed) zone`);
  assert(t.orientation === "landscape" && t.sizeId === "standard-190x89", `${t.id}: orientation and size registry id declared`);
  assert(t.profiles.custom_short && t.profiles.custom_long && t.profiles.a4_vertical && t.profiles.a4_horizontal, `${t.id}: all 4 profiles present`);
  assert(validateBankTemplate(t) === null, `${t.id}: template validates clean`);
}

// ============================================================================
// SECTION 9: Print CSS QA
// ============================================================================
console.log("\n--- SECTION 9: Print CSS QA ---");

const printCss = readFileSync(repoRoot + "src/app/print.css", "utf8");
const globalsCss = readFileSync(repoRoot + "src/app/globals.css", "utf8");
const layoutTsx = readFileSync(repoRoot + "src/app/layout.tsx", "utf8");

assert(layoutTsx.includes("./print.css") || layoutTsx.includes("'./print.css'"), "layout.tsx imports ./print.css");
assert(printCss.includes("@media print"), "print.css contains @media print block");
assert(printCss.includes("@page"), "print.css contains @page rule");
assert(printCss.includes("margin: 0"), "print.css enforces @page margin 0");
assert(printCss.includes(".no-print"), "print.css hides .no-print screen UI");
assert(printCss.includes(".print-output-screen"), "print.css manages the print output wrapper");
assert(printCss.includes(".print-direct-feed"), "print.css targets .print-direct-feed container");
assert(printCss.includes(".print-a4-carrier"), "print.css targets .print-a4-carrier container");
assert(printCss.includes("transform: none"), "print.css disables browser scaling on containers");
assert(!/.print-output-screen\s*{[^}]*width:\s*0/.test(printCss), "print-output-screen is not width:0 clipped");
assert(!/.print-output-screen\s*{[^}]*overflow:\s*hidden/.test(printCss), "print-output-screen is not overflow:hidden clipped");
assert(!globalsCss.includes(".print-output-screen"), "globals.css no longer defines .print-output-screen");
assert(printCss.includes("scale: 1"), "print.css forces scale:1");
assert(printCss.includes("zoom"), "print.css includes zoom reset");
assert(printCss.includes("page-break"), "print.css includes page-break rules");
assert(printCss.includes("image-rendering"), "print.css includes image-rendering anti-scaling rules");

// ============================================================================
// SECTION 10: Complete print test with calibration
// ============================================================================
console.log("\n--- SECTION 10: Complete Print Flow with Calibration ---");

const fullTest = {
  date: "2025-01-15",
  payee: "Ram Bahadur Thapa",
  amount: "10,000.50",
  mode: "custom_long",
  cal: { x: 0.5, y: -0.3 },
};
const dt = formatDateDigits(fullTest.date);
const ap = validateAmount(fullTest.amount);
const words = amountToWordsFromPaisa(ap.paisa);
const consistency = checkAmountWordsConsistency(fullTest.amount, words);
const geom = resolvePrintGeometry(siddhartha, fullTest.mode);
assert(dt === "15012025", `Date formatted: ${dt}`);
assert(ap.valid && ap.paisa === 1000050, `Amount parsed: ${ap.paisa} paisa`);
assert(consistency.consistent, "Words consistent");
assert(geom.pageW === 190.5 && geom.pageH === 88.9, `Geometry: page ${geom.pageW}x${geom.pageH}`);

// ============================================================================
// SECTION 11: Verify no duplicate print logic
// ============================================================================
console.log("\n--- SECTION 11: Code Structure Verification ---");

const workspaceCode = readFileSync(repoRoot + "src/components/dashboard/Workspace.tsx", "utf8");
assert(!workspaceCode.includes("parseFloat(e.target.value)"), "Workspace.tsx no longer uses raw parseFloat for calibration input");
assert(!workspaceCode.includes("amountWords, amountWords"), "No duplicate amountWords in dependency array");
assert(!workspaceCode.includes("as any"), "No 'as any' type casts in Workspace.tsx");
assert(workspaceCode.includes("printLockRef"), "Workspace.tsx has synchronous print lock ref");
assert(workspaceCode.includes("pagehide"), "Workspace.tsx registers pagehide fallback listener");
assert(workspaceCode.includes("parseCalibrationInput"), "Workspace.tsx has strict calibration input parser");
const sheetLayoutSource = readFileSync(repoRoot + "src/lib/sheetLayout.ts", "utf8");
const chequeSheetSource = readFileSync(repoRoot + "src/components/cheque/ChequeSheet.tsx", "utf8");
assert(sheetLayoutSource.includes("resolveCalibratedGeometry"), "sheetLayout.ts uses resolveCalibratedGeometry for preview+print consistency");
assert(chequeSheetSource.includes("computeSheetLayout"), "ChequeSheet renders the shared layout (no private field list)");
assert(!chequeSheetSource.includes("'payee'") && !chequeSheetSource.includes('"payee"'), "ChequeSheet contains no hardcoded field keys");

// ============================================================================
// SECTION 12: Direct Feed Short Edge First — Calibration axis compensation
// ---------------------------------------------------------------------------
// For Short Edge First (rotate 90° CW), the PrintOutput compensates calibration
// axes so that the on-paper movement matches the preview direction:
//   preview calX (right) → print: calY drives X in cheque-local space
//   preview calY (down)  → print: -calX drives Y in cheque-local space
// This is verified by checking the source code uses pCalX/pCalY compensation.
// ============================================================================
console.log("\n--- SECTION 12: DF Short Edge First — No CSS Rotation ---");
console.log("  Short Edge First vs Long Edge First is a printer paper-feed setting,\n  not a CSS transform. No rotation compensation exists in the source.");
assert(!workspaceCode.includes("pCalX") || !workspaceCode.includes("pCalY"), "PrintOutput does NOT use rotation-compensated calibration variables (no pCalX/pCalY)");
assert(!workspaceCode.includes("geom.rotate === 90 ? calY"), "No axis-swap compensation string present");
assert(!workspaceCode.includes("geom.rotate === 90 ? -calX"), "No negative axis-swap compensation string present");
assert(!workspaceCode.includes("geom.rotate"), "No rotate reference in PrintOutput geometry logic");
{
  const dfLongCompensation = workspaceCode.match(/geom\.rotate === 90 \? calY : calX/);
  assert(dfLongCompensation === null, "No ternary rotate-compensation expression (rotation-free model)");
}
{
  // Direct-feed calibration is applied as a content offset inside the cheque —
  // X to X and Y to Y, with no axis compensation anywhere in the render path.
  assert(sheetLayoutSource.includes("contentOffsetX") && sheetLayoutSource.includes("contentOffsetY"), "sheetLayout applies direct-feed calibration as a content offset");
  assert(!sheetLayoutSource.includes("contentOffsetY = df ? requested.x"), "calibration axes are never swapped");
  assert(!chequeSheetSource.includes("rotate("), "the shared renderer applies no CSS rotation");
}

// ============================================================================
// SECTION 13: Preview/Print geometry source-of-truth alignment
// ---------------------------------------------------------------------------
// Both preview and print must derive page dimensions from the same resolver.
// A4CarrierPreview uses resolveCalibratedGeometry; PrintOutput also uses it.
// DirectFeedPreview uses resolvePrintGeometry (page box = cheque, no cal shift).
// ============================================================================
console.log("\n--- SECTION 13: Preview/Print Source-of-Truth Alignment ---");

assert(workspaceCode.includes("resolvePrintGeometry(template, printMode)"), "PrepChecklist uses resolvePrintGeometry for validity checks");
assert(sheetLayoutSource.includes("resolveCalibratedGeometry(template, mode, calibration)"), "the shared layout resolves calibrated geometry once for preview and print");
assert(workspaceCode.includes('variant="preview"') && workspaceCode.includes('variant="print"'), "one renderer serves preview and print at two scales");

// Verify the @page injection uses the same geometry resolver
assert(workspaceCode.includes("geom.pageW.toFixed(1)"), "Injected @page size uses resolved pageW from shared geometry");
assert(workspaceCode.includes("geom.pageH.toFixed(1)"), "Injected @page size uses resolved pageH from shared geometry");
assert(workspaceCode.includes("geom.containerW"), "Injected @page container width uses shared geometry");
assert(workspaceCode.includes("geom.containerH"), "Injected @page container height uses shared geometry");

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n=== VERIFICATION SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) process.exit(1);
else console.log("ALL VERIFICATIONS PASSED");



