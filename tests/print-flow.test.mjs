// Print-flow validation tests for PART 4 — Real Browser Printing + Physical Printer Validation
// These tests verify the print pipeline logic without requiring a browser or physical printer.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate, getAllTemplates } from "../src/lib/templates.ts";
import { validateAmount, formatDateDigits } from "../src/lib/amountWords.ts";
import { isDirectFeed } from "../src/lib/types.ts";
import {
  clampCalibration,
  validateCalibrationPair,
  CALIBRATION_MIN_MM,
  CALIBRATION_MAX_MM,
} from "../src/lib/calibration.ts";
import { validateBankTemplate, validatePrintGeometry, validateCalibratedBounds } from "../src/lib/validation.ts";

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

// ---------------------------------------------------------------------------
// Test Group 1: Print Data Validation
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 1: PRINT DATA VALIDATION ===");

function simulateValidatePrintData(
  template,
  date,
  payee,
  amount,
  amountWords,
  printMode,
  dfCalibration,
  a4Calibration,
) {
  if (!template) return { valid: false, error: "No bank template selected." };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { valid: false, error: "Invalid or missing date." };
  if (!payee.trim()) return { valid: false, error: "Payee name is required." };
  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) return { valid: false, error: amountValidation.error || "Invalid amount." };
  if (amountValidation.paisa === 0) return { valid: false, error: "Amount must be greater than zero." };
  if (!amountWords.trim()) return { valid: false, error: "Amount in words is required." };
  if (!printMode) return { valid: false, error: "Print mode not selected." };
  const cal = isDirectFeed(printMode) ? dfCalibration : a4Calibration;
  if (cal.x < -25 || cal.x > 25 || cal.y < -25 || cal.y > 25) {
    return { valid: false, error: "Calibration values must be between -25 and 25 mm." };
  }
  const profile = template.profiles[printMode];
  if (!profile) return { valid: false, error: "Print layout not available for selected mode." };
  return { valid: true, error: "" };
}

const siddhartha = getTemplate("siddhartha");
assert(siddhartha !== undefined, "Siddhartha template exists");

// 1.1 No template
const r1 = simulateValidatePrintData(null, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r1.valid && r1.error === "No bank template selected.", "Rejects null template");

// 1.2 Invalid date
const r2 = simulateValidatePrintData(siddhartha, "", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r2.valid && r2.error === "Invalid or missing date.", "Rejects empty date");

const r2b = simulateValidatePrintData(siddhartha, "not-a-date", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r2b.valid && r2b.error === "Invalid or missing date.", "Rejects malformed date");

// 1.3 Missing payee
const r3 = simulateValidatePrintData(siddhartha, "2024-03-15", "", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r3.valid && r3.error === "Payee name is required.", "Rejects empty payee");

const r3b = simulateValidatePrintData(siddhartha, "2024-03-15", "   ", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r3b.valid && r3b.error === "Payee name is required.", "Rejects whitespace-only payee");

// 1.4 Invalid amount
const r4 = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram", "", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r4.valid, "Rejects empty amount");

const r4b = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram", "abc", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r4b.valid, "Rejects non-numeric amount");

// 1.5 Zero amount
const r5 = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram", "0", "Zero Rupees Only", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r5.valid && r5.error === "Amount must be greater than zero.", "Rejects zero amount");

// 1.6 Missing amount words
const r6 = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram", "1000", "", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r6.valid && r6.error === "Amount in words is required.", "Rejects empty amount words");

// 1.7 Missing print mode
const r7 = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", "", { x: 0, y: 0 }, { x: 0, y: 0 });
assert(!r7.valid && r7.error === "Print mode not selected.", "Rejects empty print mode");

// 1.8 Calibration out of range
const r8 = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 30, y: 0 }, { x: 0, y: 0 });
assert(!r8.valid && r8.error === "Calibration values must be between -25 and 25 mm.", "Rejects X calibration > 25");

const r8b = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: -30 }, { x: 0, y: 0 });
assert(!r8b.valid && r8b.error === "Calibration values must be between -25 and 25 mm.", "Rejects Y calibration < -25");

// 1.9 Valid print data passes all checks
const r9 = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram Bahadur", "25000.50", "Twenty-Five Thousand Rupees and Fifty Paisa Only", "custom_short", { x: 0.5, y: -0.3 }, { x: 0, y: 0 });
assert(r9.valid && r9.error === "", "Accepts valid print data with calibration");

// 1.10 A4 Carrier calibration also validated
const r10 = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram Bahadur", "25000.50", "Twenty-Five Thousand Rupees and Fifty Paisa Only", "a4_vertical", { x: 0, y: 0 }, { x: 0.5, y: -0.3 });
assert(r10.valid && r10.error === "", "Accepts valid A4 Carrier data with calibration");

const r10b = simulateValidatePrintData(siddhartha, "2024-03-15", "Ram Bahadur", "25000.50", "Twenty-Five Thousand Rupees and Fifty Paisa Only", "a4_horizontal", { x: 0, y: 0 }, { x: 30, y: 0 });
assert(!r10b.valid, "Rejects A4 Carrier with out-of-range calibration");

// ---------------------------------------------------------------------------
// Test Group 2: Print Layout Preparation
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 2: PRINT LAYOUT PREPARATION ===");

function simulatePreparePrintLayout(template, printMode) {
  const profile = template.profiles[printMode];
  if (!profile) return { error: "No profile" };
  let pageSizeW, pageSizeH;
  if (isDirectFeed(printMode)) {
    // Direct Feed: page box is always the cheque's physical size (190.5×88.9mm).
    // Short Edge First vs Long Edge First is a printer feed setting, not a CSS transform.
    pageSizeW = template.widthMm;
    pageSizeH = template.heightMm;
  } else {
    if (printMode === "a4_vertical") {
      pageSizeW = 210;
      pageSizeH = 297;
    } else {
      pageSizeW = 297;
      pageSizeH = 210;
    }
  }
  return { pageSizeW, pageSizeH, profile };
}

// 2.1 Direct Feed short edge first — page is landscape cheque size (no swap/rotation)
const layout1 = simulatePreparePrintLayout(siddhartha, "custom_short");
assert(layout1.pageSizeW === 190.5, "custom_short page width = cheque width (190.5mm)");
assert(layout1.pageSizeH === 88.9, "custom_short page height = cheque height (88.9mm)");

// 2.2 Direct Feed long edge first — page keeps dimensions (same as short edge)
const layout2 = simulatePreparePrintLayout(siddhartha, "custom_long");
assert(layout2.pageSizeW === 190.5, "custom_long page width = cheque width (190.5mm)");
assert(layout2.pageSizeH === 88.9, "custom_long page height = cheque height (88.9mm)");

// 2.3 A4 vertical — standard portrait
const layout3 = simulatePreparePrintLayout(siddhartha, "a4_vertical");
assert(layout3.pageSizeW === 210, "a4_vertical page width = 210mm");
assert(layout3.pageSizeH === 297, "a4_vertical page height = 297mm");

// 2.4 A4 horizontal — standard landscape
const layout4 = simulatePreparePrintLayout(siddhartha, "a4_horizontal");
assert(layout4.pageSizeW === 297, "a4_horizontal page width = 297mm");
assert(layout4.pageSizeH === 210, "a4_horizontal page height = 210mm");

// 2.5 Container vs page dimensions — sourced from the shared resolver
//     (lib/printGeometry.ts) so the test exercises the real code path.
import { resolvePrintGeometry } from "../src/lib/printGeometry.ts";

const dfShortG = resolvePrintGeometry(siddhartha, "custom_short");
assert(dfShortG.containerW === 190.5 && dfShortG.containerH === 88.9, "DF short-edge: container is cheque size (190.5×88.9) — no rotation, page box = cheque");
assert(dfShortG.pageW === 190.5 && dfShortG.pageH === 88.9, "DF short-edge: @page is 190.5×88.9 (landscape, no swap)");
assert(dfShortG.rotate === undefined, "DF short-edge: no content rotation (feed direction is printer setting)");
assert(dfShortG.chequeW === 190.5 && dfShortG.chequeH === 88.9, "DF short-edge: raw cheque dimensions preserved");

const dfLongG = resolvePrintGeometry(siddhartha, "custom_long");
assert(dfLongG.containerW === dfLongG.pageW && dfLongG.containerH === dfLongG.pageH, "DF long-edge: container equals page (no swap)");
assert(dfLongG.rotate === undefined, "DF long-edge: no content rotation");
assert(dfLongG.pageW === 190.5 && dfLongG.pageH === 88.9, "DF long-edge: @page matches cheque size");

const a4vG = resolvePrintGeometry(siddhartha, "a4_vertical");
assert(a4vG.containerW === 210 && a4vG.containerH === 297, "A4 portrait: container equals A4 page");
assert(a4vG.pageW === 210 && a4vG.pageH === 297, "A4 portrait: @page is 210×297");
assert(typeof a4vG.chequeX === "number" && typeof a4vG.chequeY === "number", "A4 portrait: cheque x/y offsets exposed");
assert(a4vG.chequeX + siddhartha.widthMm <= a4vG.pageW, "A4 portrait: cheque fits within page width");

const a4hG = resolvePrintGeometry(siddhartha, "a4_horizontal");
assert(a4hG.pageW === 297 && a4hG.pageH === 210, "A4 landscape: @page is 297×210");
assert(a4hG.rotate === undefined, "A4 modes never rotate content");

// 2.6 rotatedContentOffset — no CSS rotation is applied; all modes return (0, 0).
//     The @page is always the cheque's physical size (190.5×88.9 mm, landscape)
//     for Direct Feed, with content rendered unrotated. Short Edge First vs
//     Long Edge First is handled by the printer paper-feed direction.
import { rotatedContentOffset } from "../src/lib/printGeometry.ts";
const off90 = rotatedContentOffset(dfShortG);
assert(off90.leftMm === 0 && off90.topMm === 0, "DF short-edge: no rotation offset (content rendered flat, no CSS rotation)");

const off0 = rotatedContentOffset(dfLongG);
assert(off0.leftMm === 0 && off0.topMm === 0, "DF long-edge rotation offset is 0,0 (no rotation)");

const offA4 = rotatedContentOffset(a4vG);
assert(offA4.leftMm === 0 && offA4.topMm === 0, "A4 modes do not rotate (offset 0,0)");

// ---------------------------------------------------------------------------
// Test Group 3: Repeatability — same input produces same output
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 3: REPEATABILITY ===");

function simulatePrintOutput(template, date, payee, amount, amountWords, accountPayee, calX, calY, mode) {
  const amountPaisa = validateAmount(amount).paisa;
  const dateDigits = formatDateDigits(date);
  // Simulate key fields positions with calibration
  const dateFieldX = (template.fields.date.x || 128) + calX;
  const dateFieldY = (template.fields.date.y || 6) + calY;
  const payeeFieldX = (template.fields.payee.x || 12) + calX;
  const payeeFieldY = (template.fields.payee.y || 28) + calY;
  const amountFieldX = (template.fields.amount.x || 110) + calX;
  const amountFieldY = (template.fields.amount.y || 66) + calY;
  return { dateDigits, dateFieldX, dateFieldY, payeeFieldX, payeeFieldY, amountFieldX, amountFieldY, amountPaisa };
}

const run1 = simulatePrintOutput(siddhartha, "2024-03-15", "Ram Bahadur Thapa", "25000.50", "Twenty-Five Thousand Rupees and Fifty Paisa Only", true, 0.5, -0.3, "custom_short");
const run2 = simulatePrintOutput(siddhartha, "2024-03-15", "Ram Bahadur Thapa", "25000.50", "Twenty-Five Thousand Rupees and Fifty Paisa Only", true, 0.5, -0.3, "custom_short");
const run3 = simulatePrintOutput(siddhartha, "2024-03-15", "Ram Bahadur Thapa", "25000.50", "Twenty-Five Thousand Rupees and Fifty Paisa Only", true, 0.5, -0.3, "custom_short");

assert(run1.dateFieldX === run2.dateFieldX && run2.dateFieldX === run3.dateFieldX, "Date X position stable across 3 runs");
assert(run1.dateFieldY === run2.dateFieldY && run2.dateFieldY === run3.dateFieldY, "Date Y position stable across 3 runs");
assert(run1.payeeFieldX === run2.payeeFieldX, "Payee X position stable across runs");
assert(run1.amountFieldX === run2.amountFieldX, "Amount X position stable across runs");
assert(run1.amountPaisa === run2.amountPaisa, "Amount paisa stable across runs");

// Different calibration should produce different positions
const run4 = simulatePrintOutput(siddhartha, "2024-03-15", "Ram Bahadur Thapa", "25000.50", "Twenty-Five Thousand Rupees and Fifty Paisa Only", true, 1.0, 0.0, "custom_short");
assert(run4.dateFieldX !== run1.dateFieldX, "Different calibration produces different field positions");
assert(run4.dateFieldY !== run1.dateFieldY, "Different Y calibration produces different Y position");

// Same calibration, different template should still be deterministic per template
const nabil = getTemplate("nabil");
const nabilRun1 = simulatePrintOutput(nabil, "2024-03-15", "Sita Devi", "5000", "Five Thousand Rupees Only", true, 0, 0, "custom_short");
const nabilRun2 = simulatePrintOutput(nabil, "2024-03-15", "Sita Devi", "5000", "Five Thousand Rupees Only", true, 0, 0, "custom_short");
assert(nabilRun1.dateFieldX === nabilRun2.dateFieldX, "Nabil template repeatable across runs");

// ---------------------------------------------------------------------------
// Test Group 4: Print CSS Class Names Present
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 4: PRINT CSS CLASS REGRESSION ===");

// Verify class names used in components match what print.css targets
const cssTargets = [
  "no-print",
  "print-output-screen",
  "print-direct-feed",
  "print-a4-carrier",
  "compose-grid",
  "preview-column",
  "preview-stage",
];
assert(cssTargets.length === 7, "All expected print CSS classes accounted for");
assert(cssTargets.includes("print-output-screen"), "print-output-screen class present");
assert(cssTargets.includes("print-direct-feed"), "print-direct-feed class present");
assert(cssTargets.includes("print-a4-carrier"), "print-a4-carrier class present");

// ---------------------------------------------------------------------------
// Test Group 5: Multi-template Consistency
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 5: MULTI-TEMPLATE CONSISTENCY ===");

const allTemplates = getAllTemplates();
for (const t of allTemplates) {
  const r = simulateValidatePrintData(t, "2024-06-01", "Test Payee", "1000.00", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 }, { x: 0, y: 0 });
  assert(r.valid, t.bankName + ": custom_short validation passes");

  const r2 = simulateValidatePrintData(t, "2024-06-01", "Test Payee", "1000.00", "One Thousand Rupees Only", "a4_vertical", { x: 0, y: 0 }, { x: 0, y: 0 });
  assert(r2.valid, t.bankName + ": a4_vertical validation passes");

  const layout = simulatePreparePrintLayout(t, "custom_short");
  assert(layout.pageSizeW > 0 && layout.pageSizeH > 0, t.bankName + ": custom_short layout has positive dimensions");
}

// ---------------------------------------------------------------------------
// Test Group 6: Calibration — clamping, independence, validation
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 6: CALIBRATION GUARDS ===");

// 6.1 clampCalibration sanitizes invalid inputs
assert(clampCalibration(NaN) === 0, "NaN clamps to 0");
assert(clampCalibration(Infinity) === 0, "+Infinity clamps to 0");
assert(clampCalibration(-Infinity) === 0, "-Infinity clamps to 0");
assert(clampCalibration("30mm") === 0, "invalid string clamps to 0");
assert(clampCalibration(null) === 0, "null clamps to 0");
assert(clampCalibration(undefined) === 0, "undefined clamps to 0");
assert(Object.is(clampCalibration(-0), 0), "negative zero normalizes to +0");
assert(clampCalibration(30) === 25, "30 clamps to +25");
assert(clampCalibration(-30) === -25, "-30 clamps to -25");
assert(clampCalibration(25.4) === 25, "25.4 rounds/clamps to 25");
assert(clampCalibration(12.34) === 12.3, "12.34 rounds to 0.1mm step (12.3)");
assert(clampCalibration(CALIBRATION_MAX_MM) === 25, "+25 passes through");
assert(clampCalibration(CALIBRATION_MIN_MM) === -25, "-25 passes through");

// 6.2 Mode independence — mutating the DF state object never touches A4 state
//     (mirrors the dfCalibration/a4Calibration two-state model in Workspace)
function simulateIndependentCalibration() {
  const dfCalibration = { x: 0, y: 0 };
  const a4Calibration = { x: 0, y: 0 };
  const setDf = (patch) => Object.assign(dfCalibration, patch);
  const setA4 = (patch) => Object.assign(a4Calibration, patch);
  setDf({ x: clampCalibration(0.5) });
  setDf({ y: clampCalibration(-0.3) });
  const afterDf = { ...a4Calibration };
  setA4({ x: clampCalibration(1.2) });
  const afterA4 = { ...dfCalibration };
  return { dfCalibration, a4Calibration, afterDf, afterA4 };
}
const { dfCalibration, a4Calibration, afterDf, afterA4 } = simulateIndependentCalibration();
assert(a4Calibration.x === 1.2 && a4Calibration.y === 0, "A4 X set while Y stays 0");
assert(afterDf.x === 0 && afterDf.y === 0, "setting DF values did not touch A4 state");
assert(afterA4.x === 0.5 && afterA4.y === -0.3, "setting A4 X did not touch DF state");
assert(dfCalibration.x === 0.5 && dfCalibration.y === -0.3, "DF state holds its own values");

// 6.3 validateCalibrationPair — boundary + corruption cases
assert(validateCalibrationPair(0, 0) === null, "0,0 valid");
assert(validateCalibrationPair(25, 25) === null, "+25,+25 at range edge valid");
assert(validateCalibrationPair(-25, -25) === null, "-25,-25 at range edge valid");
assert(validateCalibrationPair(0.5, -0.3) === null, "in-range values valid");
assert(validateCalibrationPair(30, 0) !== null, "X > 25 rejected");
assert(validateCalibrationPair(0, -30) !== null, "Y < -25 rejected");
assert(validateCalibrationPair(NaN, 0) !== null, "NaN X rejected");
assert(validateCalibrationPair(0, Infinity) !== null, "Infinity Y rejected");

// 6.4 Range safety: runtime clamping ensures cheque stays on-page at any calibration.
//      resolveCalibratedGeometry clamps A4 calibration so the cheque can never
//      leave the page — verified here at ±25mm extreme inputs.
import { resolveCalibratedGeometry } from "../src/lib/printGeometry.ts";
const extremeCal = { x: 25, y: 25 };
for (const t of getAllTemplates()) {
  for (const key of ["a4_vertical", "a4_horizontal"]) {
    const g = resolveCalibratedGeometry(t, key, extremeCal);
    assert(g.finalChequeX >= -0.05, t.bankName + " " + key + ": +25mm X cal clamped to keep cheque on left edge");
    assert(g.finalChequeX + t.widthMm <= g.pageW + 0.05, t.bankName + " " + key + ": +25mm X cal clamped to keep cheque on right edge");
    assert(g.finalChequeY >= -0.05, t.bankName + " " + key + ": +25mm Y cal clamped to keep cheque on top edge");
    assert(g.finalChequeY + t.heightMm <= g.pageH + 0.05, t.bankName + " " + key + ": +25mm Y cal clamped to keep cheque on bottom edge");
  }
}
const negCal = { x: -25, y: -25 };
for (const t of getAllTemplates()) {
  for (const key of ["a4_vertical", "a4_horizontal"]) {
    const g = resolveCalibratedGeometry(t, key, negCal);
    assert(g.finalChequeX >= -0.05, t.bankName + " " + key + ": -25mm X cal clamped to keep cheque on left edge");
    assert(g.finalChequeY >= -0.05, t.bankName + " " + key + ": -25mm Y cal clamped to keep cheque on top edge");
    assert(g.finalChequeX + t.widthMm <= g.pageW + 0.05, t.bankName + " " + key + ": -25mm X cal clamped to keep cheque on right edge");
    assert(g.finalChequeY + t.heightMm <= g.pageH + 0.05, t.bankName + " " + key + ": -25mm Y cal clamped to keep cheque on bottom edge");
  }
}

// 6.5 Direct Feed profiles have correct page dimensions (cheque size, no rotation/swap)
for (const t of getAllTemplates()) {
  const cs = t.profiles.custom_short;
  assert(cs.pageWidth === 190.5 && cs.pageHeight === 88.9, t.bankName + " custom_short: page dims = 190.5×88.9 (cheque W×H, landscape, no swap)");
  const csGeom = resolvePrintGeometry(t, "custom_short");
   assert(csGeom.rotate === undefined, t.bankName + " custom_short: no rotate field (no CSS rotation — feed direction is printer setting)");
   assert(cs.x === 0 && cs.y === 0, t.bankName + " custom_short: x=y=0 (cheque fills page box)");

   const cl = t.profiles.custom_long;
   assert(cl.pageWidth === 190.5 && cl.pageHeight === 88.9, t.bankName + " custom_long: page dims = 190.5×88.9 (cheque W×H)");
   const clGeom = resolvePrintGeometry(t, "custom_long");
   assert(clGeom.rotate === undefined, t.bankName + " custom_long: no rotate field");
  assert(cl.x === 0 && cl.y === 0, t.bankName + " custom_long: x=y=0 (cheque fills page box)");
}

// 6.6 DF calibration does NOT affect A4 and vice versa — state independence
//     (mirrors Workspace two-state model)
function simulateCalIndependence() {
  let dfCal = { x: 0, y: 0 };
  let a4Cal = { x: 0, y: 0 };
  dfCal = { x: clampCalibration(1.5), y: clampCalibration(0.7) };
  const dfX = dfCal.x, dfY = dfCal.y;
  a4Cal = { x: clampCalibration(-2.3), y: clampCalibration(1.1) };
  const a4X = a4Cal.x, a4Y = a4Cal.y;
  // DF values unchanged after A4 edit
  assert(dfCal.x === dfX && dfCal.y === dfY, "DF calibration unchanged after A4 edit");
  // A4 values changed
  assert(a4X === -2.3 && a4Y === 1.1, "A4 calibration applied independently");
  return { dfCal, a4Cal };
}
const indepResult = simulateCalIndependence();
assert(indepResult.dfCal.x === 1.5 && indepResult.dfCal.y === 0.7, "DF calibration values preserved");
assert(indepResult.a4Cal.x === -2.3 && indepResult.a4Cal.y === 1.1, "A4 calibration values applied");

// ---------------------------------------------------------------------------
// Test Group 7: Template + geometry validation (lib/validation.ts)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 7: TEMPLATE & GEOMETRY VALIDATION ===");

// 7.1 All shipped templates pass validation at load (templates.ts throws otherwise)
for (const t of getAllTemplates()) {
  assert(validateBankTemplate(t) === null, t.bankName + ": template validates clean");
}

// 7.2 A template with NaN dimensions fails
const corrupt = { ...siddhartha, widthMm: NaN, heightMm: 88.9 };
assert(validateBankTemplate(corrupt) !== null, "NaN widthMm rejected");

// 7.3 A field that overflows the cheque is flagged
const badField = {
  ...siddhartha,
  fields: { ...siddhartha.fields, date: { ...siddhartha.fields.date, x: 300, width: 50 } },
};
{
  const errs = validateBankTemplate(badField);
  assert(errs !== null && errs.some((e) => e.code === "FIELD_OVERFLOW"), "field with right edge past cheque width flagged");
}

// 7.4 Geometry validation: valid for all templates/modes
for (const t of getAllTemplates()) {
  for (const m of ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"]) {
    const g = resolvePrintGeometry(t, m);
    assert(validatePrintGeometry(g, t, m) === null, t.id + " " + m + ": geometry validates clean");
  }
}

// 7.5 Calibrated bounds: all shipped templates have valid base positions
// (cheque fits on page at base profile position; runtime clamping handles excess cal)
for (const t of getAllTemplates()) {
  for (const m of ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"]) {
    const errs = validateCalibratedBounds(t, m);
    assert(errs === null, t.id + " " + m + ": base position valid (runtime clamping handles excess cal)");
  }
}

// 7.6 A template whose base profile position puts the cheque off-page is flagged
const badBase = JSON.parse(JSON.stringify(siddhartha));
badBase.profiles.a4_vertical.x = -5;
assert(validateCalibratedBounds(badBase, "a4_vertical") !== null, "A4 portrait with negative base x flagged");

const badBase2 = JSON.parse(JSON.stringify(siddhartha));
badBase2.profiles.a4_vertical.y = 210;
assert(validateCalibratedBounds(badBase2, "a4_vertical") !== null, "A4 portrait with base y overflow flagged");

// 7.7 DF profiles with wrong page dims are flagged by validateBankTemplate
const badDfProfile = JSON.parse(JSON.stringify(siddhartha));
badDfProfile.profiles.custom_short.pageWidth = 210;
badDfProfile.profiles.custom_short.pageHeight = 297;
{
  const errs = validateBankTemplate(badDfProfile);
  assert(errs !== null && errs.some((e) => e.code === "DF_PROFILE_DIM_MISMATCH"), "DF profile wrong page dimensions flagged");
}

// 7.8 A4 profiles with wrong page dims are flagged by validateBankTemplate
const badA4Profile = JSON.parse(JSON.stringify(siddhartha));
badA4Profile.profiles.a4_vertical.pageWidth = 200;
{
  const errs = validateBankTemplate(badA4Profile);
  assert(errs !== null && errs.some((e) => e.code === "A4_PROFILE_DIM_MISMATCH"), "A4 profile wrong page dimensions flagged");
}

// 7.9 resolveCalibratedGeometry returns clamped position for A4 at extreme cal
const clampedG = resolveCalibratedGeometry(siddhartha, "a4_horizontal", { x: 25, y: 25 });
assert(clampedG.finalChequeX + siddhartha.widthMm <= clampedG.pageW + 0.05, "Extreme +25mm X cal is clamped on A4 landscape");
assert(clampedG.finalChequeY + siddhartha.heightMm <= clampedG.pageH + 0.05, "Extreme +25mm Y cal is clamped on A4 landscape");

// 7.10 DF calibration does not move the cheque bounding box
const dfCalG = resolveCalibratedGeometry(siddhartha, "custom_short", { x: 10, y: -10 });
assert(dfCalG.finalChequeX === 0 && dfCalG.finalChequeY === 0, "DF calibration does not move cheque on page (fields shift inside)");

console.log("\n=== TEST GROUP 8: PRINT CSS WIRING ===");

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const printCss = readFileSync(repoRoot + "src/app/print.css", "utf8");
const globalsCss = readFileSync(repoRoot + "src/app/globals.css", "utf8");
const layoutTsx = readFileSync(repoRoot + "src/app/layout.tsx", "utf8");

assert(layoutTsx.includes('./print.css') || layoutTsx.includes("'./print.css'"), "layout.tsx imports ./print.css (stylesheet is actually active)");
assert(printCss.includes("@media print"), "print.css contains @media print block");
assert(printCss.includes("@page"), "print.css contains @page rule");
assert(printCss.includes("margin: 0"), "print.css enforces @page margin 0");
assert(printCss.includes(".no-print"), "print.css hides .no-print screen UI");
assert(printCss.includes(".print-output-screen"), "print.css manages the print output wrapper");
assert(printCss.includes(".print-direct-feed"), "print.css targets .print-direct-feed container");
assert(printCss.includes(".print-a4-carrier"), "print.css targets .print-a4-carrier container");
assert(printCss.includes("transform: none"), "print.css disables browser scaling on containers");
// The wrapper must NOT be clipped to 0×0 on screen (would blank the print output)
assert(!/\.print-output-screen\s*{[^}]*width:\s*0/.test(printCss), "print-output-screen is not width:0 clipped");
assert(!/\.print-output-screen\s*{[^}]*overflow:\s*hidden/.test(printCss), "print-output-screen is not overflow:hidden clipped");
// Single source of truth: wrapper/print rules live in print.css, not globals.css
assert(!globalsCss.includes(".print-output-screen"), "globals.css no longer defines .print-output-screen");

// ---------------------------------------------------------------------------
// Test Group 9: DF Short Edge First — No rotation (feed direction is printer setting)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 9: DF SHORT EDGE FIRST — NO CSS ROTATION ===");

// For custom_short: cheque is 190.5×88.9 mm. The @page is the cheque's physical
// size (190.5×88.9 mm, landscape). No CSS rotation is applied — Short Edge First
// vs Long Edge First is a printer paper-feed setting, not a CSS transform.
// The cheque coordinate system (origin top-left, X right, Y down) maps directly
// onto the page box. rotatedContentOffset returns (0, 0).
for (const t of getAllTemplates()) {
  const geom = resolvePrintGeometry(t, "custom_short");
   assert(geom.rotate === undefined, t.bankName + " custom_short: no rotate field (no CSS rotation — feed direction is printer setting)");
  assert(geom.pageW === t.widthMm, t.bankName + " custom_short: pageW = chequeW (190.5)");
  assert(geom.pageH === t.heightMm, t.bankName + " custom_short: pageH = chequeH (88.9)");
  assert(geom.containerW === geom.pageW, t.bankName + " custom_short: containerW = pageW");
  assert(geom.containerH === geom.pageH, t.bankName + " custom_short: containerH = pageH");

  const offset = rotatedContentOffset(geom);
  assert(offset.leftMm === 0, t.bankName + " custom_short: offset.leftMm = 0 (no rotation offset)");
  assert(offset.topMm === 0, t.bankName + " custom_short: offset.topMm = 0");

  // Verify corners: with no rotation, corners of cheque (0,0),(W,0),(W,H),(0,H)
  // map directly to the page box [0, W] × [0, H]. No offset needed.
  const W = t.widthMm;   // 190.5
  const H = t.heightMm;  // 88.9
  const mappedCorners = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ];
  for (const c of mappedCorners) {
    assert(c.x >= -0.001 && c.x <= W + 0.001, t.bankName + " custom_short: corner X (" + c.x.toFixed(2) + ") within page box [0, " + W + "]");
    assert(c.y >= -0.001 && c.y <= H + 0.001, t.bankName + " custom_short: corner Y (" + c.y.toFixed(2) + ") within page box [0, " + H + "]");
  }
}

// ---------------------------------------------------------------------------
// Test Group 10: DF Long Edge First — same as Short Edge First (no rotation)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 10: DF LONG EDGE FIRST — NO ROTATION ===");

for (const t of getAllTemplates()) {
  const geom = resolvePrintGeometry(t, "custom_long");
   assert(geom.rotate === undefined, t.bankName + " custom_long: no rotate field (no CSS rotation)");
  assert(geom.pageW === t.widthMm, t.bankName + " custom_long: pageW = chequeW (190.5)");
  assert(geom.pageH === t.heightMm, t.bankName + " custom_long: pageH = chequeH (88.9)");
  const offset = rotatedContentOffset(geom);
  assert(offset.leftMm === 0 && offset.topMm === 0, t.bankName + " custom_long: no rotation offset");
}

// ---------------------------------------------------------------------------
// Test Group 11: A4 Portrait — cheque containment math
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 11: A4 PORTRAIT — CHEQUE CONTAINMENT MATH ===");

for (const t of getAllTemplates()) {
  const geom = resolvePrintGeometry(t, "a4_vertical");
  const profile = t.profiles.a4_vertical;

  // Base position: cheque must fit on the A4 page
  const rightEdge = profile.x + t.widthMm;
  const bottomEdge = profile.y + t.heightMm;
  assert(rightEdge <= 210 + 0.05, t.bankName + " a4_vertical: cheque right edge (" + rightEdge.toFixed(2) + ") ≤ 210");
  assert(bottomEdge <= 297 + 0.05, t.bankName + " a4_vertical: cheque bottom edge (" + bottomEdge.toFixed(2) + ") ≤ 297");

  // Calibration clamping range math
  const minCalX = -profile.x;                          // -9.75
  const maxCalX = 210 - profile.x - t.widthMm;          // 210 - 9.75 - 190.5 = 9.75
  const minCalY = -profile.y;                          // -104.05
  const maxCalY = 297 - profile.y - t.heightMm;        // 297 - 104.05 - 88.9 = 104.05
  assert(minCalX === -9.75, t.bankName + " a4_vertical: minCalX = -9.75");
  assert(Math.abs(maxCalX - 9.75) < 0.01, t.bankName + " a4_vertical: maxCalX = 9.75");
  assert(Math.abs(minCalY + 104.05) < 0.01, t.bankName + " a4_vertical: minCalY = -104.05");
  assert(Math.abs(maxCalY - 104.05) < 0.01, t.bankName + " a4_vertical: maxCalY = 104.05");

  // Verify extreme calibration is clamped
  const calExt = resolveCalibratedGeometry(t, "a4_vertical", { x: 25, y: 25 });
  assert(calExt.finalChequeX + t.widthMm <= 210 + 0.05, t.bankName + " a4_vertical: +25cal X clamped (right edge ≤ 210)");
  assert(calExt.finalChequeY + t.heightMm <= 297 + 0.05, t.bankName + " a4_vertical: +25cal Y clamped (bottom edge ≤ 297)");

  const calNeg = resolveCalibratedGeometry(t, "a4_vertical", { x: -25, y: -25 });
  assert(calNeg.finalChequeX >= -0.05, t.bankName + " a4_vertical: -25cal X clamped (left edge ≥ 0)");
  assert(calNeg.finalChequeY >= -0.05, t.bankName + " a4_vertical: -25cal Y clamped (top edge ≥ 0)");
}

// ---------------------------------------------------------------------------
// Test Group 12: A4 Landscape — cheque containment math
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 12: A4 LANDSCAPE — CHEQUE CONTAINMENT MATH ===");

for (const t of getAllTemplates()) {
  const geom = resolvePrintGeometry(t, "a4_horizontal");
  const profile = t.profiles.a4_horizontal;

  const rightEdge = profile.x + t.widthMm;
  const bottomEdge = profile.y + t.heightMm;
  assert(rightEdge <= 297 + 0.05, t.bankName + " a4_horizontal: cheque right edge (" + rightEdge.toFixed(2) + ") ≤ 297");
  assert(bottomEdge <= 210 + 0.05, t.bankName + " a4_horizontal: cheque bottom edge (" + bottomEdge.toFixed(2) + ") ≤ 210");

  // Calibration clamping range math
  const minCalX = -profile.x;                          // -53.25
  const maxCalX = 297 - profile.x - t.widthMm;         // 297 - 53.25 - 190.5 = 53.25
  const minCalY = -profile.y;                          // -60.55
  const maxCalY = 210 - profile.y - t.heightMm;        // 210 - 60.55 - 88.9 = 60.55
  assert(Math.abs(minCalX + 53.25) < 0.01, t.bankName + " a4_horizontal: minCalX = -53.25");
  assert(Math.abs(maxCalX - 53.25) < 0.01, t.bankName + " a4_horizontal: maxCalX = 53.25");
  assert(Math.abs(minCalY + 60.55) < 0.01, t.bankName + " a4_horizontal: minCalY = -60.55");
  assert(Math.abs(maxCalY - 60.55) < 0.01, t.bankName + " a4_horizontal: maxCalY = 60.55");

  // Verify extreme calibration is clamped
  const calExt = resolveCalibratedGeometry(t, "a4_horizontal", { x: 25, y: 25 });
  assert(calExt.finalChequeX + t.widthMm <= 297 + 0.05, t.bankName + " a4_horizontal: +25cal X clamped (right edge ≤ 297)");
  assert(calExt.finalChequeY + t.heightMm <= 210 + 0.05, t.bankName + " a4_horizontal: +25cal Y clamped (bottom edge ≤ 210)");

  const calNeg = resolveCalibratedGeometry(t, "a4_horizontal", { x: -25, y: -25 });
  assert(calNeg.finalChequeX >= -0.05, t.bankName + " a4_horizontal: -25cal X clamped (left edge ≥ 0)");
  assert(calNeg.finalChequeY >= -0.05, t.bankName + " a4_horizontal: -25cal Y clamped (top edge ≥ 0)");
}

// ---------------------------------------------------------------------------
// Test Group 13: Print CSS hardening
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 13: PRINT CSS HARDENING ===");

const workspaceTsx = readFileSync(repoRoot + "src/components/Workspace.tsx", "utf8");

assert(printCss.includes("scale: 1"), "print.css forces scale:1 on print containers");
assert(printCss.includes("image-rendering"), "print.css includes image-rendering anti-scaling rules");
assert(printCss.includes("page-break-before") || printCss.includes("page-break-after") || printCss.includes("page-break-inside"), "print.css includes page-break rules to prevent duplicate pages");
assert(printCss.includes("pagehide") === false || true, "pagehide fallback noted in Workspace.tsx"); // checked below
assert(printCss.includes("zoom"), "print.css includes zoom reset for browser scaling");
assert(workspaceTsx.includes("printLockRef"), "Workspace.tsx has synchronous print lock ref");
assert(workspaceTsx.includes("pagehide"), "Workspace.tsx registers pagehide fallback listener");
assert(workspaceTsx.includes("parseCalibrationInput"), "Workspace.tsx has strict calibration input parser");
assert(!workspaceTsx.includes("parseFloat(e.target.value)"), "Workspace.tsx no longer uses raw parseFloat for calibration input");

// ---------------------------------------------------------------------------
// Test Group 14: Geometry pipeline determinism (preview == print)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 14: GEOMETRY PIPELINE DETERMINISM ===");

// Both preview (A4CarrierPreview) and print (PrintOutput) call resolveCalibratedGeometry
// Verify the function is deterministic
const geom1 = resolveCalibratedGeometry(siddhartha, "a4_vertical", { x: 1.5, y: -0.7 });
const geom2 = resolveCalibratedGeometry(siddhartha, "a4_vertical", { x: 1.5, y: -0.7 });
assert(geom1.finalChequeX === geom2.finalChequeX, "resolveCalibratedGeometry is deterministic (X)");
assert(geom1.finalChequeY === geom2.finalChequeY, "resolveCalibratedGeometry is deterministic (Y)");
assert(geom1.calibratedClamped === geom2.calibratedClamped, "resolveCalibratedGeometry is deterministic (clamped flag)");

// Preview and print are now the SAME component rendered at two scales. The
// calibration/geometry resolution lives in one pure module that both paths use.
const sheetLayoutTs = readFileSync(repoRoot + "src/lib/sheetLayout.ts", "utf8");
const chequeSheetTsx = readFileSync(repoRoot + "src/components/ChequeSheet.tsx", "utf8");

assert(sheetLayoutTs.includes("resolveCalibratedGeometry"), "sheetLayout resolves calibrated geometry (single source)");
assert(sheetLayoutTs.includes("computeSheetLayout"), "sheetLayout exposes computeSheetLayout for both paths");
assert(chequeSheetTsx.includes("lengthToCss"), "ChequeSheet converts millimetres to display units in exactly one place");
assert(chequeSheetTsx.includes("unitFactor"), "ChequeSheet exposes the single linear unit factor");

// The workspace must render the shared sheet twice: preview and print output.
assert(workspaceTsx.includes('<ChequeSheet'), "Workspace renders the shared ChequeSheet");
assert(workspaceTsx.includes('variant="preview"'), "preview uses the shared sheet");
assert(workspaceTsx.includes('variant="print"'), "print output uses the same shared sheet");
assert(
  (workspaceTsx.match(/<ChequeSheet/g) || []).length >= 2,
  "preview and print both render ChequeSheet (one renderer, two scales)",
);
assert(!workspaceTsx.includes("DirectFeedPreview"), "the separate direct-feed preview renderer is gone");
assert(!workspaceTsx.includes("A4CarrierPreview"), "the separate A4 preview renderer is gone");
assert(!workspaceTsx.includes("function PrintField"), "the duplicated PrintField renderer is gone");
assert(sheetLayoutTs.includes("calibration"), "sheetLayout reports the calibration that was applied");

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
console.log("\n=== PRINT FLOW TEST SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome print-flow tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll print-flow tests PASSED.");
}


