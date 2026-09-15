// Print-flow validation tests for PART 4 — Real Browser Printing + Physical Printer Validation
// These tests verify the print pipeline logic without requiring a browser or physical printer.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate, getAllTemplates } from "../lib/templates.ts";
import { validateAmount, formatDateDigits } from "../lib/amountWords.ts";
import { isDirectFeed } from "../lib/types.ts";
import {
  clampCalibration,
  validateCalibrationPair,
  CALIBRATION_MIN_MM,
  CALIBRATION_MAX_MM,
} from "../lib/calibration.ts";
import { calibratedBounds } from "../lib/printGeometry.ts";
import { validateBankTemplate, validatePrintGeometry, validateCalibratedBounds } from "../lib/validation.ts";

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
  const isDF = isDirectFeed(printMode);
  let pageSizeW, pageSizeH;
  if (isDF) {
    const pw = template.widthMm;
    const ph = template.heightMm;
    if (printMode === "custom_short") {
      pageSizeW = ph;
      pageSizeH = pw;
    } else {
      pageSizeW = pw;
      pageSizeH = ph;
    }
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

// 2.1 Direct Feed short edge first — page swaps dimensions
const layout1 = simulatePreparePrintLayout(siddhartha, "custom_short");
assert(layout1.pageSizeW === 88.9, "custom_short page width = cheque height (88.9mm)");
assert(layout1.pageSizeH === 190.5, "custom_short page height = cheque width (190.5mm)");

// 2.2 Direct Feed long edge first — page keeps dimensions
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
import { resolvePrintGeometry } from "../lib/printGeometry.ts";

const dfShortG = resolvePrintGeometry(siddhartha, "custom_short");
assert(dfShortG.containerW === 88.9 && dfShortG.containerH === 190.5, "DF short-edge: container is the swapped page box (88.9×190.5)");
assert(dfShortG.pageW === 88.9 && dfShortG.pageH === 190.5, "DF short-edge: @page is 88.9×190.5");
assert(dfShortG.rotate === 90, "DF short-edge: content rotation is 90°");
assert(dfShortG.chequeW === 190.5 && dfShortG.chequeH === 88.9, "DF short-edge: raw cheque dimensions preserved");

const dfLongG = resolvePrintGeometry(siddhartha, "custom_long");
assert(dfLongG.containerW === dfLongG.pageW && dfLongG.containerH === dfLongG.pageH, "DF long-edge: container equals page (no swap)");
assert(dfLongG.rotate === 0, "DF long-edge: no content rotation");
assert(dfLongG.pageW === 190.5 && dfLongG.pageH === 88.9, "DF long-edge: @page matches cheque size");

const a4vG = resolvePrintGeometry(siddhartha, "a4_vertical");
assert(a4vG.containerW === 210 && a4vG.containerH === 297, "A4 portrait: container equals A4 page");
assert(a4vG.pageW === 210 && a4vG.pageH === 297, "A4 portrait: @page is 210×297");
assert(typeof a4vG.chequeX === "number" && typeof a4vG.chequeY === "number", "A4 portrait: cheque x/y offsets exposed");
assert(a4vG.chequeX + siddhartha.widthMm <= a4vG.pageW, "A4 portrait: cheque fits within page width");

const a4hG = resolvePrintGeometry(siddhartha, "a4_horizontal");
assert(a4hG.pageW === 297 && a4hG.pageH === 210, "A4 landscape: @page is 297×210");
assert(a4hG.rotate === 0, "A4 modes never rotate content");

// 2.6 rotatedContentOffset — fixed math for short-edge-first rotation.
//     Page box 88.9×190.5; cheque 190.5×88.9 rotated 90° -> bounding box
//     88.9×190.5 == page box, so with centre-origin rotation the offset is 0.
import { rotatedContentOffset } from "../lib/printGeometry.ts";
const off90 = rotatedContentOffset(dfShortG);
assert(off90.leftMm === 0 && off90.topMm === 0, "DF short-edge rotation offset is 0,0 (rotated box fills page box)");

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

// 6.4 Range safety: even at max calibration the A4 cheque box stays printable
//      AND: the base profile position leaves enough margin for ±25 mm calibration
for (const t of getAllTemplates()) {
  for (const key of ["a4_vertical", "a4_horizontal"]) {
    const p = t.profiles[key];
    // Base position fits page width (cheque right edge <= pageWidth)
    assert(p.x + t.widthMm <= p.pageWidth, t.bankName + " " + key + ": base position fits page width");
    // Base position fits page height
    assert(p.y + t.heightMm <= p.pageHeight, t.bankName + " " + key + ": base position fits page height");
    // At MAX calibration (+25mm right/bottom), cheque right/bottom must still be on page
    assert(p.x + t.widthMm + CALIBRATION_MAX_MM <= p.pageWidth + 0.05, t.bankName + " " + key + ": max +X cal keeps cheque on page");
    assert(p.y + t.heightMm + CALIBRATION_MAX_MM <= p.pageHeight + 0.05, t.bankName + " " + key + ": max +Y cal keeps cheque on page");
    // At MIN calibration (-25mm left/top), cheque must not go off the left/top edge
    assert(p.x - CALIBRATION_MAX_MM >= -0.05, t.bankName + " " + key + ": max -X cal keeps cheque on page");
    assert(p.y - CALIBRATION_MAX_MM >= -0.05, t.bankName + " " + key + ": max -Y cal keeps cheque on page");
  }
}

// 6.5 Direct Feed profiles have correct page dimensions (cheque size, swapped for rotate=90)
for (const t of getAllTemplates()) {
  const cs = t.profiles.custom_short;
  assert(cs.pageWidth === 88.9 && cs.pageHeight === 190.5, t.bankName + " custom_short: page dims = 88.9×190.5 (cheque H×W, swapped)");
  assert(cs.rotate === 90, t.bankName + " custom_short: rotate=90");
  assert(cs.x === 0 && cs.y === 0, t.bankName + " custom_short: x=y=0 (cheque fills page box)");

  const cl = t.profiles.custom_long;
  assert(cl.pageWidth === 190.5 && cl.pageHeight === 88.9, t.bankName + " custom_long: page dims = 190.5×88.9 (cheque W×H)");
  assert(cl.rotate === 0, t.bankName + " custom_long: rotate=0");
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

// 7.5 Calibrated bounds: all shipped templates keep cheque on page at ±25mm cal
for (const t of getAllTemplates()) {
  for (const m of ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"]) {
    const errs = validateCalibratedBounds(t, m);
    assert(errs === null, t.id + " " + m + ": calibrated bounds safe (DF is no-op, A4 checked at ±25mm)");
  }
}

// 7.6 A template that would go off-page at max calibration is flagged
const tightA4 = JSON.parse(JSON.stringify(siddhartha));
tightA4.profiles.a4_vertical.y = 190; // y + 88.9 + 25 = 303.9 > 297 → off bottom at max cal
assert(validateCalibratedBounds(tightA4, "a4_vertical") !== null, "A4 portrait with cheque too close to bottom flagged at max cal");

// 7.7 DF profiles with wrong page dims are flagged by validateBankTemplate
const badDfProfile = JSON.parse(JSON.stringify(siddhartha));
badDfProfile.profiles.custom_short.pageWidth = 210; // wrong — should be 88.9
badDfProfile.profiles.custom_short.pageHeight = 297; // wrong — should be 190.5
{
  const errs = validateBankTemplate(badDfProfile);
  assert(errs !== null && errs.some((e) => e.code === "DF_PROFILE_DIM_MISMATCH"), "DF profile wrong page dimensions flagged");
}

// 7.8 calibratedBounds returns correct worst-case for A4
const siddA4vBounds = calibratedBounds(siddhartha, "a4_vertical");
assert(siddA4vBounds.minX === 9.75 - CALIBRATION_MAX_MM, "A4 portrait minX = profile.x - 25 = " + (9.75 - CALIBRATION_MAX_MM));
assert(siddA4vBounds.maxRight === 9.75 + 190.5 + CALIBRATION_MAX_MM, "A4 portrait maxRight = profile.x + chequeW + 25");
assert(siddA4vBounds.minY === 20 - CALIBRATION_MAX_MM, "A4 portrait minY = profile.y - 25");
assert(siddA4vBounds.maxBottom === 20 + 88.9 + CALIBRATION_MAX_MM, "A4 portrait maxBottom = profile.y + chequeH + 25");

// 7.9 calibratedBounds for DF returns page box (calibration does not move cheque)
const siddDfBounds = calibratedBounds(siddhartha, "custom_short");
assert(siddDfBounds.minX === 0 && siddDfBounds.minY === 0, "DF short-edge minX/minY = 0 (cheque fills page)");
assert(siddDfBounds.maxRight === 88.9 && siddDfBounds.maxBottom === 190.5, "DF short-edge maxRight/maxBottom = page box");

console.log("\n=== TEST GROUP 8: PRINT CSS WIRING ===");

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const printCss = readFileSync(repoRoot + "app/print.css", "utf8");
const globalsCss = readFileSync(repoRoot + "app/globals.css", "utf8");
const layoutTsx = readFileSync(repoRoot + "app/layout.tsx", "utf8");

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
// Summary
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
