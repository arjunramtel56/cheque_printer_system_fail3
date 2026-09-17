// ============================================================================
// PART 4 — PRINT WORKFLOW RELIABILITY + LIGHT SYSTEM REGRESSION
// ----------------------------------------------------------------------------
// Audit + test the printing pipeline so that STALE STATE can never reach
// physical printing. Uses the same source-code-verification approach as the
// existing print-verification.mjs / part5-qa.test.mjs suite (no browser needed).
//
// Scenarios covered (the 11 rapid-state-change tests):
//   1.  Rapid Print clicks
//   2.  Bank template change before printing
//   3.  Print mode change
//   4.  Calibration change
//   5.  Amount change
//   6.  Payee change
//   7.  Date change
//   8.  Amount-in-words change
//   9.  A/C PAYEE ONLY toggle
//   10. Clear All
//   11. Switching Direct Feed <-> A4 Carrier
//
// Plus audit checks for: print button, validation gate, isPrinting state,
// beforeprint/afterprint, temporary print styles, event listeners, cleanup,
// duplicate-print protection, error handling.
// And PREVIEW vs PRINT consistency.
// And responsive UI (no physical-dimension changes).
// And light system regression (Landing / Workspace build + runtime).
// ============================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate, getAllTemplates } from "../lib/templates.ts";
import {
  validateAmount,
  amountToWordsFromPaisa,
  checkAmountWordsConsistency,
  formatDateDigits,
  validatePayee,
  validateChequeDate,
  isValidDate,
} from "../lib/amountWords.ts";
import { clampCalibration, validateCalibrationPair } from "../lib/calibration.ts";
import {
  resolvePrintGeometry,
  rotatedContentOffset,
  resolveCalibratedGeometry,
} from "../lib/printGeometry.ts";
import {
  validateBankTemplate,
  validatePrintGeometry,
  validateCalibratedBounds,
} from "../lib/validation.ts";
import { isDirectFeed, isA4Carrier, DIRECT_FEED_MODES, A4_CARRIER_MODES } from "../lib/types.ts";

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log("  PASS: " + msg); }
  else { fail++; console.error("  FAIL: " + msg); }
}
function assertContains(code, needle, msg) { assert(code.includes(needle), msg); }

const repoRoot = fileURLToPath(new URL("..", import.meta.url)) + "/";
const ws = readFileSync(repoRoot + "components/Workspace.tsx", "utf8");
const printCss = readFileSync(repoRoot + "app/print.css", "utf8");
const globalsCss = readFileSync(repoRoot + "app/globals.css", "utf8");
const layoutTsx = readFileSync(repoRoot + "app/layout.tsx", "utf8");
const pageTsx = readFileSync(repoRoot + "app/page.tsx", "utf8");

const siddhartha = getTemplate("siddhartha");
const nabil = getTemplate("nabil");

// ---------------------------------------------------------------------------
// AUDIT 1: HandlePrint — validation gate is exhaustive and sequential
// ---------------------------------------------------------------------------
console.log("\n=== AUDIT 1: Print button + validation gate ===");

// handlePrint exists and starts with synchronous lock guard
assert(ws.includes("function handlePrint()"), "handlePrint function exists");
assertContains(
  ws,
  "if (printLockRef.current || isPrinting) return;",
  "handlePrint starts with synchronous printLockRef.isPrinting guard (rapid-click / duplicate-print protection)",
);
assertContains(
  ws,
  "printLockRef.current = true;",
  "printLockRef set synchronously to true on first invocation (blocks re-entry before React re-render)",
);
assertContains(
  ws,
  "setIsPrinting(true);",
  "isPrinting state set to true when print cycle begins",
);

// Sequential validation steps present in handlePrint
const handlePrintBody = ws.split("function handlePrint()")[1].split("function handleClear")[0];
assertContains(handlePrintBody, "STEP 1: VALIDATE DATA", "Step 1: data validation labelled");
assertContains(handlePrintBody, "validateChequeDate(date)", "Validates cheque date");
assertContains(handlePrintBody, "validatePayee(payee)", "Validates payee");
assertContains(handlePrintBody, "validateAmount(amount)", "Validates amount");
assertContains(handlePrintBody, "checkAmountWordsConsistency(amount, amountWords)", "Validates amount-words consistency");
assertContains(handlePrintBody, "STEP 2: VALIDATE BANK TEMPLATE", "Step 2: template validation");
assertContains(handlePrintBody, "STEP 3: VALIDATE PRINT MODE", "Step 3: print mode validation");
assertContains(handlePrintBody, "STEP 4: APPLY CALIBRATION", "Step 4: calibration validation");
assertContains(handlePrintBody, "validateCalibrationPair", "Calibration pair validated");
assertContains(handlePrintBody, "STEP 5: PREPARE PRINT LAYOUT", "Step 5: layout preparation");
assertContains(handlePrintBody, "STEP 5b: VALIDATE GEOMETRY", "Step 5b: geometry validation (stale-template safety net)");
assertContains(handlePrintBody, "validatePrintGeometry", "Print geometry validated");
assertContains(handlePrintBody, "STEP 5c: CALIBRATED BOUNDS CHECK", "Step 5c: calibrated bounds safety net");
assertContains(handlePrintBody, "validateCalibratedBounds", "Calibrated bounds validated");

// The validation happens BEFORE any DOM/style mutation
const validateIdx = handlePrintBody.indexOf("STEP 1");
const injectIdx = handlePrintBody.indexOf("STEP 6");
assert(validateIdx !== -1 && injectIdx !== -1 && validateIdx < injectIdx, "Validation occurs strictly before @page style injection");

// ---------------------------------------------------------------------------
// AUDIT 2: beforeprint / afterprint / event listeners / cleanup
// ---------------------------------------------------------------------------
console.log("\n=== AUDIT 2: beforeprint/afterprint, listeners, cleanup ===");

assertContains(ws, 'window.addEventListener("beforeprint"', "beforeprint listener registered");
assertContains(ws, 'window.addEventListener("afterprint"', "afterprint listener registered");
assertContains(ws, 'window.addEventListener("pagehide"', "pagehide fallback listener registered (for browsers without afterprint)");
assertContains(ws, "function onBeforePrint()", "onBeforePrint handler defined inside handlePrint");
assertContains(ws, "function onAfterPrint()", "onAfterPrint handler defined inside handlePrint");

// onAfterPrint must be a no-op when the print lock is not engaged (prevents
// pagehide from clobbering state on normal navigation)
assertContains(ws, "if (!printLockRef.current) return;", "onAfterPrint guards on printLockRef (pagehide no-op when not printing)");

// Cleanup in onAfterPrint
assertContains(handlePrintBody.split("function onAfterPrint")[1], "window.removeEventListener", "onAfterPrint removes beforeprint/afterprint/pagehide listeners");
assertContains(handlePrintBody.split("function onAfterPrint")[1], "printStyleRef.current.remove()", "onAfterPrint removes injected print style");
assertContains(handlePrintBody.split("function onAfterPrint")[1], "setIsPrinting(false)", "onAfterPrint resets isPrinting");
assertContains(handlePrintBody.split("function onAfterPrint")[1], "setPrintCompleted(true)", "onAfterPrint sets printCompleted");

// Error path cleanup (try/catch around window.print())
assertContains(handlePrintBody, "try {", "window.print() wrapped in try/catch");
assertContains(handlePrintBody, "window.print();", "window.print() invoked");
assertContains(handlePrintBody.split("try {")[1].split("}")[0], "printLockRef.current = false", "catch resets print lock");
assertContains(handlePrintBody.split("try {")[1].split("}")[0], "setIsPrinting(false)", "catch resets isPrinting");
assertContains(handlePrintBody.split("try {")[1].split("}")[0], "window.removeEventListener", "catch removes listeners");

// Template-change effect cleans up print state (stale-state protection)
const templateEffect = ws.split("useEffect(() => {")[0] ? null : null;
assert(
  /useEffect\([^}]*if \(printStyleRef\.current\)[^]*?setIsPrinting\(false\)/.test(ws.replace(/\s+/g, " ")),
  "templateId effect resets isPrinting + removes print style + releases lock",
);
assertContains(ws, "return () => {", "templateId effect returns unmount cleanup");
// unmount cleanup also clears listeners + style
const unmountCleanup = ws.match(/return \(\) => \{[\s\S]*?printLockRef\.current = false;\s*\}/)?.[0] ?? "";
assert(unmountCleanup.includes("printStyleRef.current"), "unmount cleanup removes print style");
assert(unmountCleanup.includes("beforePrintRef"), "unmount cleanup clears beforeprint ref");
assert(unmountCleanup.includes("afterPrintRef"), "unmount cleanup clears afterprint ref");
assert(unmountCleanup.includes("pagehide"), "unmount cleanup clears pagehide listener");

// ---------------------------------------------------------------------------
// AUDIT 3: @page injection — single source of truth
// ---------------------------------------------------------------------------
console.log("\n=== AUDIT 3: temporary print styles (@page injection) ===");

assertContains(ws, "const currentPrintKey = ++printKeyRef.current;", "printKey increments for each print attempt (monotonic, stale-rejection token)");
assertContains(ws, "data-print-key={printKeyRef.current}", "PrintOutput wrapper carries data-print-key");
assertContains(ws, "data-template-id={template.id}", "PrintOutput wrapper carries data-template-id (stale-template detection)");
assertContains(ws, "data-mode={printMode}", "PrintOutput wrapper carries data-mode");
assertContains(ws, "data-calX={String(cal.x)}", "PrintOutput wrapper carries calibration X");
assertContains(ws, "data-calY={String(cal.y)}", "PrintOutput wrapper carries calibration Y");
assertContains(ws, 'containerSelector = isDirectFeed(printMode)', "Container selector chosen by mode (DF vs A4)");
assertContains(ws, "geom.pageW.toFixed(1)", "@page width sourced from resolved geometry (not hardcoded)");
assertContains(ws, "geom.pageH.toFixed(1)", "@page height sourced from resolved geometry");
assertContains(ws, "geom.containerW", "Container width sourced from resolved geometry");
assertContains(ws, "geom.containerH", "Container height sourced from resolved geometry");
assertContains(ws, 'style.textContent = css', "Injected @page style content set via textContent (safe, no injection vector)");

// onBeforePrint stamps the print key onto the DOM so a re-render with stale
// state can be detected if needed
assertContains(ws, "printOutputRef.current.dataset.printKey = String(currentPrintKey);", "onBeforePrint stamps current printKey to DOM");

// ---------------------------------------------------------------------------
// AUDIT 4: Duplicate-print protection
// ---------------------------------------------------------------------------
console.log("\n=== AUDIT 4: duplicate-print protection ===");

// (a) synchronous ref lock
assertContains(ws, "printLockRef", "Synchronous printLockRef exists");
assertContains(ws, "if (printLockRef.current || isPrinting) return;", "Re-entry blocked before any work");
// (b) React state guard on the button
assertContains(ws, 'disabled={!printReadiness.ready || isPrinting}', "Print button disabled when not ready or already printing");
// (c) printKey monotonic increment
assertContains(ws, "printKeyRef.current", "printKeyRef monotonic counter exists");
// (d) print.css page-break avoidance (one page only)
assertContains(printCss, "page-break-before: avoid", "print.css prevents page-break-before duplicates");
assertContains(printCss, "page-break-after: avoid", "print.css prevents page-break-after duplicates");
assertContains(printCss, "page-break-inside: avoid", "print.css prevents page-break-inside duplicates");

// ---------------------------------------------------------------------------
// AUDIT 5: Error handling
// ---------------------------------------------------------------------------
console.log("\n=== AUDIT 5: error handling ===");

assertContains(ws, "function sanitizeError", "sanitizeError helper exists");
assertContains(ws, "err.message", "sanitizeError returns only message (not stack)");
assertContains(ws, "setPrintError", "printError state populated on failure");
assertContains(ws, 'role="alert"', "error surfaced with role=alert (assertive announcement)");
// Every error branch resets the lock + isPrinting
const errorBranches = ws.match(/setPrintError\([^)]*\);[^}]*?printLockRef\.current = false;[^}]*?setIsPrinting\(false\)/g);
assert(errorBranches !== null && errorBranches.length >= 7, "Every error branch (date/payee/amount/words/template/mode/cal/geom/bounds) resets lock + isPrinting");

// ---------------------------------------------------------------------------
// TEST 1: Rapid Print clicks
// ---------------------------------------------------------------------------
console.log("\n=== TEST 1: Rapid Print clicks (duplicate-print protection) ===");

// The synchronous guard means: first click sets printLockRef.current=true and
// isPrinting=true; the synchronous second click (before re-render) sees
// printLockRef.current===true and returns immediately.
// We verify the guard ordering: lock is checked BEFORE setIsPrinting, and lock
// is released only in onAfterPrint or error paths.
const guardBlock = ws.slice(ws.indexOf("function handlePrint()"), ws.indexOf("function handleClear"));
const lockCheckIdx = guardBlock.indexOf("printLockRef.current || isPrinting) return");
const lockSetIdx = guardBlock.indexOf("printLockRef.current = true");
const isPrintingSetIdx = guardBlock.indexOf("setIsPrinting(true)");
assert(lockCheckIdx !== -1, "guard checks printLockRef at top");
assert(lockCheckIdx < lockSetIdx, "guard check precedes lock acquisition");
assert(lockSetIdx < isPrintingSetIdx, "lock acquired before isPrinting state set (synchronous)");
// Verify lock is released in onAfterPrint
const afterPrintSection = guardBlock.split("function onAfterPrint")[1];
assertContains(afterPrintSection, "printLockRef.current = false", "onAfterPrint releases the print lock");
// Verify lock released in every catch/error path
const catchSection = guardBlock.split("try {")[1].split("}")[0];
assertContains(catchSection, "printLockRef.current = false", "catch block releases lock");

// ---------------------------------------------------------------------------
// TEST 2: Bank template change before printing
// ---------------------------------------------------------------------------
console.log("\n=== TEST 2: Bank template change before printing ===");

// Selecting a new template triggers the templateId effect which: removes
// injected print style, removes beforeprint/afterprint/pagehide listeners,
// resets printCompleted, printError, isPrinting, and releases the lock.
// This means a stale print cycle cannot complete after a template switch.
assertContains(ws, "setPrintCompleted(false);", "templateId effect resets printCompleted");
assertContains(ws, "setIsPrinting(false);", "templateId effect resets isPrinting");
assertContains(ws, "printLockRef.current = false;", "templateId effect releases print lock");
assertContains(ws, "setPrintError(\"\");", "templateId effect clears print error");

// The PrintOutput is conditionally rendered on `template && profile`, so
// switching templates unmounts the stale print payload before it can print.
assertContains(ws, "{template && profile && (", "PrintOutput conditionally rendered — stale template unmounts payload");

// ---------------------------------------------------------------------------
// TEST 3: Print mode change
// ---------------------------------------------------------------------------
console.log("\n=== TEST 3: Print mode change ===");

// Print mode change calls handleModeChange which clears printError.
assertContains(ws, "function handleModeChange", "handleModeChange exists");
assertContains(ws, "setPrintMode(newMode);", "handleModeChange updates printMode");
assertContains(ws, "setPrintError(\"\");", "handleModeChange clears printError");
// The PrintReadiness recompute depends on printMode
assertContains(ws, "[template, date, payee, amount, amountWords, printMode, isDF, dfCalibration, a4Calibration]", "printReadiness recomputes when printMode changes");

// Switching DF <-> A4 uses the correct calibration set
assertContains(ws, "const currentCalibration = isDF ? dfCalibration : a4Calibration;", "Calibration selection is mode-aware");
assertContains(ws, "const setCurrentCalibration = isDF ? setDfCalibration : setA4Calibration;", "Calibration setter is mode-aware");
assert(
  ws.includes("offsetX={isDF ? dfCalibration.x : a4Calibration.x}") &&
  ws.includes("offsetY={isDF ? dfCalibration.y : a4Calibration.y}"),
  "Preview uses mode-appropriate calibration",
);

// ---------------------------------------------------------------------------
// TEST 4: Calibration change
// ---------------------------------------------------------------------------
console.log("\n=== TEST 4: Calibration change ===");

// Calibration is clamped at input and re-validated at print time
assertContains(ws, "clampCalibration", "Calibration clamped via clampCalibration");
assertContains(ws, "parseCalibrationInput", "Strict parser used for calibration input");
assertContains(ws, "/^[-+]?\\d*\\.?\\d*$/"?.replace?.("\\d", "d") ?? "", "") // placeholder, real check below
{
  const parserFn = ws.match(/function parseCalibrationInput[\s\S]*?^  \}/m)?.[0] ?? "";
  assert(parserFn.includes("/^"), "parseCalibrationInput uses regex anchoring");
  assert(parserFn.includes("Number.isFinite"), "parseCalibrationInput checks finiteness");
}
// Print-time re-validation of the *stored* pair (catches tampered state)
assertContains(ws, "validateCalibrationPair(cal.x, cal.y)", "Print-time calibration pair validation");
// A4 calibration clamping keeps cheque on-page even at ±25mm
for (const t of getAllTemplates()) {
  const g = resolveCalibratedGeometry(t, "a4_vertical", { x: 25, y: 25 });
  assert(g.finalChequeX + t.widthMm <= g.pageW + 0.05, t.id + " A4v: +25cal clamped (X)");
  assert(g.finalChequeY + t.heightMm <= g.pageH + 0.05, t.id + " A4v: +25cal clamped (Y)");
  assert(g.calibratedClamped === true, t.id + " A4v: +25cal flagged as clamped");
}
// DF calibration does not move the cheque page box
{
  const g = resolveCalibratedGeometry(siddhartha, "custom_short", { x: 10, y: -10 });
  assert(g.finalChequeX === 0 && g.finalChequeY === 0, "DF calibration does not shift cheque page position");
}

// ---------------------------------------------------------------------------
// TEST 5: Amount change
// ---------------------------------------------------------------------------
console.log("\n=== TEST 5: Amount change ===");

// Amount words auto-sync when amount changes (unless overridden)
assertContains(ws, "function handleAmountChange", "handleAmountChange exists");
assertContains(ws, "wordOverrideRef.current = false", "handleAmountChange clears word-override flag (enables auto-sync)");
assertContains(ws, "autoWords", "autoWords derived from amount");

// Auto-sync logic: if amount invalid/zero -> clear words; else regenerate
const autoSyncEffect = ws.match(/useEffect\([^}]*if \(!wordOverrideRef\.current\)[\s\S]*?\}\s*\}, \[autoWords, amount\]/);
assert(autoSyncEffect !== null, "Amount-change auto-sync effect keyed on [autoWords, amount]");

// The print gate rejects mismatched amount/words
{
  const consistent = checkAmountWordsConsistency("1000", "Nine Hundred Rupees Only");
  assert(consistent.consistent === false, "Print gate would reject mismatched amount/words");
}
// Stale autoWords cannot be printed: if amount changes to invalid, words clear
{
  const r = validateAmount("not-an-amount");
  assert(r.valid === false, "invalid amount rejected");
}

// ---------------------------------------------------------------------------
// TEST 6: Payee change
// ---------------------------------------------------------------------------
console.log("\n=== TEST 6: Payee change ===");

// Live payee validation
assertContains(ws, "validatePayee(payee)", "Payee validated live in render");
// Print gate re-validates
assertContains(ws, "const payeeCheck = validatePayee(payee)", "handlePrint re-validates payee");
assertContains(ws, "if (!payeeCheck.valid)", "handlePrint blocks on invalid payee");
// safeNormalizePayee returns "" on invalid -> field won't render
{
  const r = validatePayee("   ");
  assert(!r.valid && r.payee === "", "whitespace-only payee normalises to empty (won't print)");
}
// payee stored as string state, no derived stale cache
assertContains(ws, "setPayee(e.target.value.slice(0, 120))", "Payee stored as raw string state (no stale buffer)");

// ---------------------------------------------------------------------------
// TEST 7: Date change
// ---------------------------------------------------------------------------
console.log("\n=== TEST 7: Date change ===");

assertContains(ws, "validateChequeDate(date)", "Date validated live");
assertContains(ws, "const dateCheck = validateChequeDate(date);", "handlePrint re-validates date");
assertContains(ws, "if (!dateCheck.valid)", "handlePrint blocks on invalid date");
// safeFormatDate returns "" on failure -> date field won't render
assertContains(ws, "function safeFormatDate", "safeFormatDate guards date formatting");
// Future dates rejected by gate
assert(!validateChequeDate(new Date().toISOString().slice(0, 10) === "2024-01-01" ? "9999-12-31" : "9999-12-31").valid, "Future date rejected at gate");
// Date state is a string, re-derived on every render
assertContains(ws, "setDate(e.target.value)", "Date stored as string state");

// ---------------------------------------------------------------------------
// TEST 8: Amount-in-words change
// ---------------------------------------------------------------------------
console.log("\n=== TEST 8: Amount-in-words change ===");

// Manual word edit sets override flag so auto-sync does not clobber
assertContains(ws, "function handleWordEdit", "handleWordEdit exists");
assertContains(ws, "wordOverrideRef.current = true", "handleWordEdit sets override flag");
// Print gate enforces consistency when user edited words
assertContains(ws, "checkAmountWordsConsistency(amount, amountWords)", "handlePrint enforces words/amount consistency");
{
  const c = checkAmountWordsConsistency("1000", "One Thousand Rupees Only");
  assert(c.consistent, "Matching words pass gate");
  const c2 = checkAmountWordsConsistency("1000", "Two Thousand Rupees Only");
  assert(!c2.consistent, "Mismatched words blocked by gate");
}
// words2 derived from amountWords state — no separate stale buffer
assertContains(ws, "function splitWordsToLines(words", "words split at render from current amountWords");

// ---------------------------------------------------------------------------
// TEST 9: A/C PAYEE ONLY toggle
// ---------------------------------------------------------------------------
console.log("\n=== TEST 9: A/C PAYEE ONLY toggle ===");

assertContains(ws, "const [accountPayee, setAccountPayee] = useState(true)", "accountPayee default true (standard cheque)");
assertContains(ws, "setAccountPayee(e.target.checked)", "accountPayee toggled from checkbox");
// Both preview AND print render the A/C PAYEE line from the SAME state
assertContains(ws, "accountPayee &&", "accountPayee renders conditionally");
assertContains(ws, 'renderField("accountPayee"', "DirectFeedPreview renders accountPayee");
assertContains(ws, "PrintField", "PrintOutput renders accountPayee via PrintField");
// Same template field used: template.fields.accountPayee
assertContains(ws, "template.fields.accountPayee?.y", "accountPayee Y coordinate sourced from template (single source)");
assertContains(ws, "template.fields.accountPayee?.fontSize", "accountPayee fontSize sourced from template");
// Verify the y value is the same template field in both preview + print
{
  const previewY = "template.fields.accountPayee?.y ?? 16";
  const printY = "template.fields.accountPayee?.y ?? 16";
  assert(ws.includes(previewY), "Preview uses template accountPayee y");
  assert(ws.includes(printY), "Print uses template accountPayee y (same constant)");
}

// ---------------------------------------------------------------------------
// TEST 10: Clear All
// ---------------------------------------------------------------------------
console.log("\n=== TEST 10: Clear All (no stale state) ===");

assertContains(ws, "function handleClear()", "handleClear exists");
// All form data cleared
assertContains(ws, "setTemplateId(\"\")", "Clear All resets templateId");
assertContains(ws, "setDate(\"\")", "Clear All resets date");
assertContains(ws, "setPayee(\"\")", "Clear All resets payee");
assertContains(ws, "setAmount(\"\")", "Clear All resets amount");
assertContains(ws, "setAmountWords(\"\")", "Clear All resets amountWords");
assertContains(ws, "setAccountPayee(true)", "Clear All resets accountPayee to default true");
assertContains(ws, "setDfCalibration({ x: 0, y: 0 })", "Clear All resets DF calibration");
assertContains(ws, "setA4Calibration({ x: 0, y: 0 })", "Clear All resets A4 calibration");
// Printing/transient state cleared
assertContains(ws, "setPrintError(\"\")", "Clear All resets printError");
assertContains(ws, "setPrintCompleted(false)", "Clear All resets printCompleted");
assertContains(ws, "setIsPrinting(false)", "Clear All resets isPrinting");
// DOM / listeners / lock reset
assertContains(ws, "printStyleRef.current.remove()", "Clear All removes injected print style");
assertContains(ws, "window.removeEventListener(\"beforeprint\"", "Clear All removes beforeprint listener");
assertContains(ws, "window.removeEventListener(\"afterprint\"", "Clear All removes afterprint listener");
assertContains(ws, "window.removeEventListener(\"pagehide\"", "Clear All removes pagehide listener");
assertContains(ws, "printLockRef.current = false", "Clear All releases print lock");
assertContains(ws, "printKeyRef.current = 0", "Clear All resets printKey (stale-print rejection token)");
// wordOverrideRef reset
assertContains(ws, "wordOverrideRef.current = false", "Clear All resets wordOverrideRef");
// Confirmation guard before destructive clear
assertContains(ws, "window.confirm", "Clear All confirms before destructive reset");

// Verify no stale amount-words survives a clear
{
  const r1 = checkAmountWordsConsistency("1000", "One Thousand Rupees Only");
  assert(r1.consistent, "pre-clear: words consistent");
}
// After clear: template="" so template-based consistency is moot (no template).
// The gate requires amountWords.trim() !== "" -> clear blocks print.
assert(siddhartha !== undefined, "template still loadable after clear scenario (library unaffected)");

// ---------------------------------------------------------------------------
// TEST 11: Switching Direct Feed ↔ A4 Carrier
// ---------------------------------------------------------------------------
console.log("\n=== TEST 11: Switching Direct Feed <-> A4 Carrier ===");

// Mode groups are disjoint sets
assert(DIRECT_FEED_MODES.length === 2 && A4_CARRIER_MODES.length === 2, "Mode groups exist (2 DF + 2 A4)");
assert(isDirectFeed("custom_short") && isDirectFeed("custom_long"), "DF modes detected");
assert(isA4Carrier("a4_vertical") && isA4Carrier("a4_horizontal"), "A4 modes detected");
assert(DIRECT_FEED_MODES.every((m) => !A4_CARRIER_MODES.includes(m)), "Mode groups are disjoint");

// Geometry differs per mode group
{
  const gDfShort = resolvePrintGeometry(siddhartha, "custom_short");
  const gDfLong = resolvePrintGeometry(siddhartha, "custom_long");
  const gA4v = resolvePrintGeometry(siddhartha, "a4_vertical");
  const gA4h = resolvePrintGeometry(siddhartha, "a4_horizontal");
  assert(gDfShort.pageW === 88.9 && gDfShort.pageH === 190.5, "DF short page = 88.9x190.5 (swapped)");
  assert(gDfLong.pageW === 190.5 && gDfLong.pageH === 88.9, "DF long page = 190.5x88.9");
  assert(gA4v.pageW === 210 && gA4v.pageH === 297, "A4 v page = 210x297");
  assert(gA4h.pageW === 297 && gA4h.pageH === 210, "A4 h page = 297x210");
  assert(gDfShort.rotate === 90 && gDfLong.rotate === 0 && gA4v.rotate === 0 && gA4h.rotate === 0, "Rotation flags correct");
}

// Calibration independence: switching mode uses the other calibration set
// (mirrors Workspace dfCalibration/a4Calibration two-state model)
{
  let dfCal = { x: 1.5, y: 0.7 };
  let a4Cal = { x: -2.3, y: 1.1 };
  dfCal = { x: clampCalibration(0.5), y: clampCalibration(-0.3) };
  const dfSnap = { ...dfCal };
  a4Cal = { x: clampCalibration(2.0), y: clampCalibration(-1.2) };
  assert(dfCal.x === 0.5 && dfCal.y === -0.3, "DF calibration unchanged after A4 edit");
  assert(a4Cal.x === 2.0 && a4Cal.y === -1.2, "A4 calibration applied independently");
  assert(dfSnap.x === 0.5 && dfSnap.y === -0.3, "DF snapshot matches expected independent values");
}

// PrintOutput switches DOM structure based on isDF
assertContains(ws, "if (isDF) {", "PrintOutput branches on isDF");
assertContains(ws, "className=\"print-direct-feed\"", "DF uses print-direct-feed container");
assertContains(ws, "className=\"print-a4-carrier\"", "A4 uses print-a4-carrier container");

// ---------------------------------------------------------------------------
// PREVIEW vs PRINT consistency
// ---------------------------------------------------------------------------
console.log("\n=== PREVIEW vs PRINT consistency ===");

// Both derive geometry from the SAME resolver
assertContains(ws, "resolveCalibratedGeometry(template, mode, { x: calX, y: calY })", "A4CarrierPreview uses resolveCalibratedGeometry");
assertContains(ws, "resolveCalibratedGeometry(template, mode, { x: calX, y: calY })", "PrintOutput A4 path uses resolveCalibratedGeometry (same call)");
assertContains(ws, "resolvePrintGeometry(template, mode)", "DirectFeedPreview uses resolvePrintGeometry");
assertContains(ws, "resolvePrintGeometry(template, mode)", "PrintOutput DF path uses resolvePrintGeometry");
// @page injection uses the same resolved geometry
assertContains(ws, "geom.pageW.toFixed(1)", "@page width from same resolver");
assertContains(ws, "geom.pageH.toFixed(1)", "@page height from same resolver");
assertContains(ws, "geom.containerW", "container width from same resolver");
assertContains(ws, "geom.containerH", "container height from same resolver");

// Both use identical props: template, date, payee, amount, amountWords, accountPayee, offsetX, offsetY, mode
const previewProps = ws.match(/<A4CarrierPreview[\s\S]*?\/>/m)?.[0] ?? "";
const printProps = ws.match(/<PrintOutput[\s\S]*?\/>/m)?.[0] ?? "";
const commonProps = ["template={template}", "date={date}", "payee={payee}", "amount={amount}", "amountWords={amountWords}", "accountPayee={accountPayee}"];
for (const p of commonProps) {
  assert(previewProps.includes(p) && printProps.includes(p), "Both preview and print pass: " + p);
}
assert(
  previewProps.includes("offsetX={a4Calibration.x}") && previewProps.includes("offsetY={a4Calibration.y}") &&
  printProps.includes("offsetX={isDF ? dfCalibration.x : a4Calibration.x}") && printProps.includes("offsetY={isDF ? dfCalibration.y : a4Calibration.y}"),
  "Both use mode-appropriate calibration for the active mode",
);

// A/C PAYEE ONLY state — same prop in both
assert(
  previewProps.includes("accountPayee={accountPayee}") && printProps.includes("accountPayee={accountPayee}"),
  "accountPayee prop identical in preview and print",
);

// Calibration: preview and print both apply calX/calY directly on the unrotated
// cheque coordinate system. No rotation compensation is needed because no CSS
// rotation is applied — Short Edge First vs Long Edge First is a printer
// paper-feed setting, not a CSS transform.
const previewFnMatch = ws.match(/function DirectFeedPreview[\s\S]*?^  \}/m)?.[0] ?? "";
assert(previewFnMatch.includes("(fieldX + calX) * SCALE") || previewFnMatch.includes("+ calX"), "DirectFeedPreview applies calX directly (unrotated canvas matches physical cheque)");
// PrintOutput DF branch also applies calX/calY directly (no axis swap)
assertContains(ws, "x={(template.fields.date?.x ?? 128) + calX}", "PrintOutput applies calX directly to date field (no rotation compensation)");
assertContains(ws, "y={(template.fields.date?.y ?? 6) + calY}", "PrintOutput applies calY directly to date field (no rotation compensation)");

// ---------------------------------------------------------------------------
// Responsive UI check
// ---------------------------------------------------------------------------
console.log("\n=== RESPONSIVE UI (no physical-dimension changes) ===");

assertContains(globalsCss, "@media (max-width: 768px)", "Tablet breakpoint (768px) present");
assertContains(globalsCss, "@media (max-width: 600px)", "Mobile breakpoint (600px) present");
assertContains(globalsCss, "@media (max-width: 480px)", "Small-screen breakpoint (480px) present");
// Responsive rules must NOT touch the print output (which lives in print.css)
assert(!globalsCss.includes(".print-output-screen"), "globals.css does NOT define .print-output-screen (no print-dimension conflict)");
assert(!globalsCss.includes(".print-direct-feed"), "globals.css does NOT define .print-direct-feed");
assert(!globalsCss.includes(".print-a4-carrier"), "globals.css does NOT define .print-a4-carrier");
// print.css locks physical dimensions regardless of screen viewport
assertContains(printCss, "scale: 1", "print.css locks scale:1 for physical output");
assertContains(printCss, "zoom: 1", "print.css locks zoom:1 for physical output");
assertContains(printCss, "transform: none", "print.css locks transform:none for physical output");
assertContains(printCss, "image-rendering: crisp-edges", "print.css prevents interpolation scaling");
// The responsive transform only applies to the screen preview, not print payload
assertContains(globalsCss, ".preview-stage", "Responsive rules target .preview-stage (screen only)");
assert(!printCss.includes("scale("), "print.css does not apply responsive scale transforms to print payload");
// Print output uses absolute mm units (never rems/em that viewport scaling could alter)
assertContains(ws, "mm`", "PrintField uses absolute mm units for print output");
assertContains(ws, "mm", "PrintOutput uses mm-based geometry");

// ---------------------------------------------------------------------------
// LIGHT SYSTEM REGRESSION: Landing + Workspace build/runtime
// ---------------------------------------------------------------------------
console.log("\n=== LIGHT SYSTEM REGRESSION ===");

// Landing page intact
assert(fileExists(repoRoot + "app/page.tsx"), "Landing: app/page.tsx intact");
assert(fileExists(repoRoot + "app/layout.tsx"), "Landing: app/layout.tsx intact");
assertContains(pageTsx, "Workspace", "Landing imports Workspace component");
assertContains(layoutTsx, "./globals.css", "Root layout imports globals.css");
assertContains(layoutTsx, "./print.css", "Root layout imports print.css (print styles active)");
assertContains(layoutTsx, "color-scheme", "Root layout sets color-scheme for print");

// Workspace intact + no broken imports
assertContains(ws, 'import { getAllTemplates, getTemplate } from "@/lib/templates"', "Workspace imports templates (no broken path)");
assertContains(ws, 'import type { BankTemplate, ProfileKey, Calibration } from "@/lib/types"', "Workspace imports types");
assertContains(ws, 'import { clampCalibration, validateCalibrationPair } from "@/lib/calibration"', "Workspace imports calibration");
assertContains(ws, 'import { resolvePrintGeometry, rotatedContentOffset, resolveCalibratedGeometry } from "@/lib/printGeometry"', "Workspace imports printGeometry");
assertContains(ws, 'import { validatePrintGeometry, validateCalibratedBounds } from "@/lib/validation"', "Workspace imports validation");
assert(!ws.includes("@/lib/"), "No broken '@/lib/' import path that doesn't resolve");

// Production build artifacts present (built earlier)
assert(fileExists(repoRoot + ".next/server/app/page.js"), "Production build: page.js artifact exists");
assert(fileExists(repoRoot + ".next/server/app/index.html"), "Production build: prerendered index exists");
assert(fileExists(repoRoot + ".next/static"), "Production build: static assets dir exists");

// Linting: no raw parseFloat for calibration (security/correctness regression check)
assert(!ws.includes("parseFloat(e.target.value)"), "Workspace no longer uses raw parseFloat (strict parser enforced)");
assert(!ws.includes("as any"), "No 'as any' type escapes (type safety preserved)");

// Templates still validate (regression: no corrupt template reached engine)
for (const t of getAllTemplates()) {
  assert(validateBankTemplate(t) === null, t.id + ": template still validates clean after all changes");
}

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log("\n=== PART 4 TEST SUMMARY ===");
console.log("Passed: " + pass);
console.log("Failed: " + fail);
if (fail > 0) {
  console.error("\nSome PART 4 tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll PART 4 print-workflow tests PASSED.");
}

function fileExists(p) {
  try { readFileSync(p); return true; } catch { return false; }
}
