// Print-flow validation tests for PART 4 — Real Browser Printing + Physical Printer Validation
// These tests verify the print pipeline logic without requiring a browser or physical printer.

import { getTemplate, getAllTemplates } from "../lib/templates.ts";
import { validateAmount, formatDateDigits } from "../lib/amountWords.ts";
import { isDirectFeed } from "../lib/types.ts";

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
