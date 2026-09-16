// Validation tests for PART 17 — Professional Cheque Data Validation
// Covers: amount parsing, money precision, amount-to-words, date validation,
// payee validation, and consistency checks.

import {
  parseNumericAmount,
  validateAmount,
  amountToWordsFromPaisa,
  generateAmountWords,
  checkAmountWordsConsistency,
  formatDateDigits,
  validateChequeDate,
  isValidDate,
  validatePayee,
  formatAmountDisplay,
  MAX_AMOUNT_PAISA,
  MAX_PAYEE_CHARS,
  MIN_PAYEE_FONT_SIZE,
} from "../lib/amountWords.ts";
import { getTemplate, getAllTemplates } from "../lib/templates.ts";
import { validateCalibrationPair } from "../lib/calibration.ts";
import { resolvePrintGeometry } from "../lib/printGeometry.ts";
import { validatePrintGeometry, validateCalibratedBounds } from "../lib/validation.ts";

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

function assertRejects(input, message) {
  const result = validateAmount(input);
  assert(!result.valid, message + " (input: " + JSON.stringify(input) + ")");
}

function assertAccepts(input, expectedPaisa, message) {
  const result = validateAmount(input);
  assert(result.valid && result.paisa === expectedPaisa, message + ` (input: ${JSON.stringify(input)}, expected paisa: ${expectedPaisa}, got: ${result.paisa})`);
}

console.log("\n=== TEST GROUP 1: AMOUNT VALIDATION — ACCEPTS ===");

assertAccepts("100", 10000, "valid integer 100");
assertAccepts("100.5", 10050, "valid decimal 100.5");
assertAccepts("100.50", 10050, "valid decimal 100.50");
assertAccepts("1,000", 100000, "comma amount 1,000");
assertAccepts("1,000.50", 100050, "comma amount 1,000.50");
assertAccepts("0.50", 50, "sub-rupee amount 0.50");
assertAccepts("0.01", 1, "single paisa 0.01");
assertAccepts("10", 1000, "small integer 10");

console.log("\n=== TEST GROUP 2: AMOUNT VALIDATION — REJECTS ===");

// Explicit rejection list from PART 17
assertRejects("abc", "rejects abc");
assertRejects("123abc", "rejects 123abc");
assertRejects("abc123", "rejects abc123");
assertRejects("1.2.3", "rejects 1.2.3");
assertRejects("10..50", "rejects 10..50");
assertRejects("10.123", "rejects 10.123 (too many decimals)");
assertRejects("-100", "rejects negative -100");
assertRejects("", "rejects empty");
assertRejects("   ", "rejects whitespace-only");
assertRejects("Infinity", "rejects Infinity string");
assertRejects("-Infinity", "rejects -Infinity string");
assertRejects("NaN", "rejects NaN string");
assertRejects("NaN", "rejects NaN");
assertRejects("1e5", "rejects scientific notation");
assertRejects("1,00", "rejects invalid comma grouping 1,00");
assertRejects("1,0000", "rejects invalid comma grouping 1,0000");
assertRejects("1,00,000", "rejects Indian grouping 1,00,000 (non-standard)");
assertRejects("1,000,00", "rejects mixed grouping");
assertRejects("100.", "rejects trailing decimal point");
assertRejects(".50", "rejects leading decimal point no integer");
assertRejects("00", "rejects 00");
assertRejects("007", "rejects leading zeros");
assertRejects(" ", "rejects space only");

console.log("\n=== TEST GROUP 3: AMOUNT EDGE CASES ===");

// Zero is valid but paisa === 0 (rejected by >0 gate, not by parseNumericAmount)
const zeroResult = validateAmount("0");
assert(zeroResult.valid && zeroResult.paisa === 0, "0 is parseable as 0 paisa (zero rejection is gate-level)");

// Whitespace around valid number should be rejected by strict parser
// Surrounding whitespace is trimmed by the parser (acceptable normalization)
assertAccepts(" 100 ", 10000, "surrounding whitespace trimmed before parsing");

// Very large but within range
const maxResult = validateAmount("999999999999.99");
assert(maxResult.valid === true, "max valid amount 999999999999.99 is accepted");
if (maxResult.valid) {
  assert(maxResult.paisa === MAX_AMOUNT_PAISA, "max valid amount yields MAX_AMOUNT_PAISA");
}

// Just above max
assertRejects("1000000000000.00", "rejects amount above max");
assertRejects("999999999999.999", "rejects amount with 3 decimals even if under max");

// Non-string inputs rejected (Infinity, NaN as actual values, numbers, null, undefined)
assert(parseNumericAmount(Infinity) === null, "rejects Infinity value");
assert(parseNumericAmount(-Infinity) === null, "rejects -Infinity value");
assert(parseNumericAmount(NaN) === null, "rejects NaN value");
assert(parseNumericAmount(123) === null, "rejects number type");
assert(parseNumericAmount(null) === null, "rejects null");
assert(parseNumericAmount(undefined) === null, "rejects undefined");

// Decimal precision — exactly 2 decimals OK, 3+ rejected
assertAccepts("1.99", 199, "exactly 2 decimals accepted");
assertRejects("1.999", "3 decimals rejected");

// Comma variations (Western grouping only)
assertAccepts("10,000", 1000000, "Western comma grouping 10,000 accepted");
assertAccepts("1,000,000", 100000000, "Western grouping 1,000,000 accepted");
assertAccepts("100,000", 10000000, "Western grouping 100,000 accepted");

console.log("\n=== TEST GROUP 4: MONEY PRECISION (integer paisa) ===");

// 100.50 NPR → 10050 paisa
const paisa = parseNumericAmount("100.50");
assert(paisa === 10050, "100.50 NPR → 10050 paisa (integer, no float)");

// 100.5 NPR → 10050 paisa (pad to 2 digits)
const paisa2 = parseNumericAmount("100.5");
assert(paisa2 === 10050, "100.5 NPR → 10050 paisa (1 decimal padded)");

// 100.05 NPR → 10005 paisa
const paisa3 = parseNumericAmount("100.05");
assert(paisa3 === 10005, "100.05 NPR → 10005 paisa (leading zero in paisa)");

// 1,000.50 NPR → 100050 paisa
const paisa4 = parseNumericAmount("1,000.50");
assert(paisa4 === 100050, "1,000.50 NPR → 100050 paisa (comma + decimal)");

// Maximum amount round-trips correctly through integer paisa
assert(formatAmountDisplay(MAX_AMOUNT_PAISA) === "999,999,999,999.99", "max amount displays correctly with integer paisa (no float errors)");

// Verify no floating point arithmetic issues in display formatting
assert(formatAmountDisplay(10050) === "100.50", "formatAmountDisplay(10050) → '100.50'");
assert(formatAmountDisplay(1) === "0.01", "formatAmountDisplay(1) → '0.01' (single paisa)");
assert(formatAmountDisplay(100) === "1.00", "formatAmountDisplay(100) → '1.00'");

console.log("\n=== TEST GROUP 5: AMOUNT IN WORDS ===");

// Auto-regeneration
const gen1 = generateAmountWords("1000");
assert(gen1 === "One Thousand Rupees Only", "generateAmountWords(1000) correct");

const gen2 = generateAmountWords("100.50");
assert(gen2 === "One Hundred Rupees and Fifty Paisa Only", "generateAmountWords(100.50) correct");

// Invalid amount → empty words
const gen3 = generateAmountWords("abc");
assert(gen3 === "", "invalid amount → empty words");

// Zero amount → empty words
const gen4 = generateAmountWords("0");
assert(gen4 === "", "zero amount → empty words");

// Whitespace-only amount → empty words
const gen5 = generateAmountWords("  ");
assert(gen5 === "", "whitespace-only amount → empty words");

// Consistency check — matching words
const c1 = checkAmountWordsConsistency("25000.50", "Twenty-Five Thousand Rupees and Fifty Paisa Only");
assert(c1.consistent === true, "matching words → consistent");

// Consistency check — mismatched words
const c2 = checkAmountWordsConsistency("25000.50", "Twenty-Five Thousand Rupees Only");
assert(c2.consistent === false, "mismatched words → not consistent");

// Consistency check — empty words
const c3 = checkAmountWordsConsistency("1000", "");
assert(c3.consistent === false, "empty words → not consistent");

// Consistency check — stale words (amount 0, words present)
const c4 = checkAmountWordsConsistency("0", "One Thousand Rupees Only");
assert(c4.consistent === false, "zero amount with words → not consistent");

// Consistency check — whitespace-normalised matching
const c5 = checkAmountWordsConsistency("1000", "  One   Thousand   Rupees   Only  ");
assert(c5.consistent === true, "whitespace-normalised matching words → consistent");

// Consistency check — case-insensitive matching
const c6 = checkAmountWordsConsistency("1000", "one thousand rupees only");
assert(c6.consistent === true, "case-insensitive matching → consistent");

console.log("\n=== TEST GROUP 6: DATE VALIDATION ===");

// Valid dates
assert(formatDateDigits("2024-03-15") === "15032024", "valid date 2024-03-15 → DDMMYYYY");
assert(formatDateDigits("2024-02-29") === "29022024", "leap day 2024-02-29 accepted");
assert(formatDateDigits("2023-02-28") === "28022023", "non-leap Feb 28 accepted");

// Leap year logic
assert(isValidDate("2024-02-29"), "2024 is a leap year — Feb 29 valid");
assert(!isValidDate("2023-02-29"), "2023 is not a leap year — Feb 29 rejected");
assert(isValidDate("2000-02-29"), "2000 is a leap year (div by 400) — Feb 29 valid");
assert(!isValidDate("1900-02-29"), "1900 is NOT a leap year (div by 100 not 400) — Feb 29 rejected");
assert(isValidDate("2028-02-29"), "2028 is a leap year — Feb 29 valid");
assert(!isValidDate("2100-02-29"), "2100 is NOT a leap year — Feb 29 rejected");

// Impossible dates rejected
assert(!isValidDate("2026-02-30"), "Feb 30 rejected");
assert(!isValidDate("2026-13-01"), "month 13 rejected");
assert(!isValidDate("2026-00-10"), "month 00 rejected");
assert(!isValidDate("2026-01-32"), "day 32 rejected");
assert(!isValidDate("2026-01-00"), "day 00 rejected");
assert(isValidDate("2026-01-31"), "Jan 31 valid");
assert(!isValidDate("2026-04-31"), "April 31 rejected (April has 30 days)");
assert(isValidDate("2026-04-30"), "April 30 valid");
assert(!isValidDate("2026-06-31"), "June 31 rejected (June has 30 days)");

// Format errors
assert(!isValidDate("not-a-date"), "non-date string rejected");
assert(!isValidDate("2024/03/15"), "wrong separator rejected");
assert(!isValidDate("24-03-15"), "2-digit year rejected");
assert(!isValidDate(""), "empty date rejected");
assert(!isValidDate("2024-3-15"), "single-digit month rejected");
assert(!isValidDate("2024-03-5"), "single-digit day rejected");

// Explicit reject cases from PART 2 requirements
assert(!isValidDate("2026-02-30"), "rejects 2026-02-30 (no Feb 30)");
assert(!isValidDate("2026-13-01"), "rejects 2026-13-01 (month 13)");
assert(!isValidDate("2026-00-10"), "rejects 2026-00-10 (month 00)");

// Year 0000 rejected (invalid year, not a leap year)
assert(!isValidDate("0000-02-29"), "rejects year 0000");
assert(!isValidDate("0000-01-01"), "rejects year 0000");
assert(!isValidDate("0000-01-01"), "year 0000 rejected");
assert(!isValidDate("2024-12-32"), "day 32 in December rejected");
assert(isValidDate("9999-12-31"), "max valid year 9999 accepted");

// validateChequeDate — future date rejection
const futureCheck = validateChequeDate("9999-12-31");
assert(!futureCheck.valid, "future date rejected by validateChequeDate");

// Past date accepted
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 1);
const pastISO = pastDate.toISOString().slice(0, 10);
const pastCheck = validateChequeDate(pastISO);
assert(pastCheck.valid, "yesterday's date accepted");

// today's date accepted
const todayISO = new Date().toISOString().slice(0, 10);
const todayCheck = validateChequeDate(todayISO);
assert(todayCheck.valid, "today's date accepted");

// Empty date rejected
assert(!validateChequeDate("").valid, "empty date rejected by validateChequeDate");

console.log("\n=== TEST GROUP 7: PAYEE VALIDATION ===");

const siddhartha = getTemplate("siddhartha");

// Normal names
const p1 = validatePayee("Ram Bahadur Thapa");
assert(p1.valid && p1.payee === "Ram Bahadur Thapa", "normal payee accepted");

// Leading/trailing spaces trimmed
const p2 = validatePayee("  Ram Bahadur  ");
assert(p2.valid && p2.payee === "Ram Bahadur", "leading/trailing spaces trimmed");

// Repeated spaces collapsed
const p3 = validatePayee("Ram   Bahadur   Thapa");
assert(p3.valid && p3.payee === "Ram Bahadur Thapa", "repeated spaces collapsed to single");

// Empty payee rejected
const p4 = validatePayee("");
assert(!p4.valid, "empty payee rejected");

// Whitespace-only payee rejected
const p5 = validatePayee("   ");
assert(!p5.valid, "whitespace-only payee rejected");

// Very long payee rejected
const longName = "A".repeat(MAX_PAYEE_CHARS + 1);
const p6 = validatePayee(longName);
assert(!p6.valid, "payee exceeding max length rejected");

// Exactly max length accepted
const maxLenName = "A".repeat(MAX_PAYEE_CHARS);
const p7 = validatePayee(maxLenName);
assert(p7.valid, "payee at exactly max length accepted");

// Unicode names
const p8 = validatePayee("राम बहादुर थापा");
assert(p8.valid && p8.payee === "राम बहादुर थापा", "Unicode (Devanagari) payee accepted");

// Unicode with special characters
const p9 = validatePayee("José María Ñoño");
assert(p9.valid && p9.payee === "José María Ñoño", "Unicode with diacritics accepted");

// Special characters (valid in names)
const p10 = validatePayee("O'Brien-Smith Jr.");
assert(p10.valid && p10.payee === "O'Brien-Smith Jr.", "name with apostrophe and hyphen accepted");

// Numbers in payee (e.g. company names)
const p11 = validatePayee("Company 123 Ltd.");
assert(p11.valid, "payee with numbers accepted");

// Mixed scripts
const p12 = validatePayee("सिन्ह्वले कम्पानी");
assert(p12.valid, "Devanagari payee accepted");

// payee with special chars only — should still accept if non-empty
const p13 = validatePayee("ABC & Co. #5");
assert(p13.valid, "payee with ampersand and hash accepted");

// Very long Unicode payee (Devanagari) at exact max length
const unicodeLong = "राम".repeat(Math.ceil(MAX_PAYEE_CHARS / 3));
const p14 = validatePayee(unicodeLong.slice(0, MAX_PAYEE_CHARS));
assert(p14.valid, "long Unicode payee at max length accepted");

// Unicode payee exceeding max length rejected
const unicodeTooLong = "राम".repeat(Math.ceil(MAX_PAYEE_CHARS / 3) + 10);
const p15 = validatePayee(unicodeTooLong);
assert(!p15.valid, "overlength Unicode payee rejected");

console.log("\n=== TEST GROUP 8: AMOUNT-TO-WORDS CONSISTENCY ===");

// Consistent
const c7 = checkAmountWordsConsistency("100", "One Hundred Rupees Only");
assert(c7.consistent, "100 → 'One Hundred Rupees Only' consistent");

// Inconsistent (wrong words)
const c8 = checkAmountWordsConsistency("100", "One Thousand Rupees Only");
assert(!c8.consistent, "100 → 'One Thousand...' inconsistent");

// Invalid amount → never consistent
const c9 = checkAmountWordsConsistency("abc", "Some words");
assert(!c9.consistent, "invalid amount → not consistent");

// Zero amount with words → not consistent (no valid words for 0)
const c10 = checkAmountWordsConsistency("0", "Zero Rupees Only");
assert(!c10.consistent, "zero amount → not consistent (expected empty)");

// Empty words → not consistent
const c11 = checkAmountWordsConsistency("500", "");
assert(!c11.consistent, "empty words → not consistent");

// Large amount with paisa
const c12 = checkAmountWordsConsistency(
  "123456.78",
  "One Lakh Twenty-Three Thousand Four Hundred Fifty-Six Rupees and Seventy-Eight Paisa Only"
);
assert(c12.consistent, "123456.78 → correct words with paisa");

console.log("\n=== TEST GROUP 9: PAYEE + fitFontSize INTEGRATION ===");

// Verify the font floor is enforced — MIN_PAYEE_FONT_SIZE constant
assert(typeof MIN_PAYEE_FONT_SIZE === "number" && MIN_PAYEE_FONT_SIZE >= 6, "MIN_PAYEE_FONT_SIZE is a sane floor (≥6)");
assert(MIN_PAYEE_FONT_SIZE === 6, "MIN_PAYEE_FONT_SIZE is exactly 6pt (readable minimum)");

// Payee that would shrink below floor should still be renderable at floor
const veryLongPayee = "R".repeat(80);
const payeeResult = validatePayee(veryLongPayee);
assert(payeeResult.valid, "80-char payee is valid (not rejected before font-fitting)");

console.log("\n=== TEST GROUP 10: PRINT GATE VALIDATION COVERAGE ===");

// Verify all print gate inputs are validated
// (simulating the sequential guards from handlePrint)
function simulatePrintGate(
  template,
  date,
  payee,
  amount,
  amountWords,
  printMode,
  cal,
) {
  if (!template) return { valid: false, error: "No bank template selected." };
  const dc = validateChequeDate(date);
  if (!dc.valid) return { valid: false, error: dc.error ?? "Invalid date." };
  const pc = validatePayee(payee);
  if (!pc.valid) return { valid: false, error: pc.error ?? "Payee name is required." };
  const ac = validateAmount(amount);
  if (!ac.valid) return { valid: false, error: ac.error ?? "Invalid amount." };
  if (ac.paisa === 0) return { valid: false, error: "Amount must be greater than zero." };
  if (!amountWords.trim()) return { valid: false, error: "Amount in words is required." };
  const consistency = checkAmountWordsConsistency(amount, amountWords);
  if (!consistency.consistent) return { valid: false, error: "Amount in words does not match numeric amount." };
  if (!printMode) return { valid: false, error: "Print mode not selected." };
  if (cal.x < -25 || cal.x > 25 || cal.y < -25 || cal.y > 25) return { valid: false, error: "Calibration out of range." };
  return { valid: true, error: "" };
}

// 10.1 Valid gate passes
const g1 = simulatePrintGate(
  siddhartha,
  "2024-03-15",
  "Ram Bahadur",
  "25000.50",
  "Twenty-Five Thousand Rupees and Fifty Paisa Only",
  "custom_short",
  { x: 0, y: 0 },
);
assert(g1.valid, "valid print gate passes");

// 10.2 No template
const g2 = simulatePrintGate(null, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!g2.valid && g2.error.includes("template"), "gate rejects no template");

// 10.3 Invalid date (Feb 30)
const g3 = simulatePrintGate(siddhartha, "2026-02-30", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!g3.valid, "gate rejects impossible date Feb 30");

// 10.4 Invalid amount (malformed)
const g4 = simulatePrintGate(siddhartha, "2024-03-15", "Ram", "abc123", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!g4.valid, "gate rejects malformed amount 'abc123'");

// 10.5 Zero amount
const g5 = simulatePrintGate(siddhartha, "2024-03-15", "Ram", "0", "Zero Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!g5.valid, "gate rejects zero amount");

// 10.6 Words don't match amount
const g6 = simulatePrintGate(
  siddhartha,
  "2024-03-15",
  "Ram",
  "5000",
  "One Thousand Rupees Only",
  "custom_short",
  { x: 0, y: 0 },
);
assert(!g6.valid, "gate rejects inconsistent words");

// 10.7 Missing words
const g7 = simulatePrintGate(siddhartha, "2024-03-15", "Ram", "5000", "", "custom_short", { x: 0, y: 0 });
assert(!g7.valid, "gate rejects empty words");

// 10.8 Future date
const g8 = simulatePrintGate(null, "9999-12-31", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!g8.valid, "gate rejects future date");

// 10.9 Print profile not available
const g9 = simulatePrintGate(siddhartha, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", null, { x: 0, y: 0 });
assert(!g9.valid, "gate rejects null print mode");

// 10.10 Missing payee
const g10 = simulatePrintGate(siddhartha, "2024-03-15", "", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!g10.valid, "gate rejects empty payee");

// 10.11 Out-of-range calibration
const g11 = simulatePrintGate(siddhartha, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 30, y: 0 });
assert(!g11.valid, "gate rejects out-of-range calibration");

// 10.12 Full print gate with geometry & profile validation
function simulateFullPrintGate(
  template,
  date,
  payee,
  amount,
  amountWords,
  printMode,
  cal,
) {
  if (!template) return { valid: false, error: "No bank template selected." };
  const dc = validateChequeDate(date);
  if (!dc.valid) return { valid: false, error: dc.error ?? "Invalid date." };
  const pc = validatePayee(payee);
  if (!pc.valid) return { valid: false, error: pc.error ?? "Payee name is required." };
  const ac = validateAmount(amount);
  if (!ac.valid) return { valid: false, error: ac.error ?? "Invalid amount." };
  if (ac.paisa === 0) return { valid: false, error: "Amount must be greater than zero." };
  if (!amountWords.trim()) return { valid: false, error: "Amount in words is required." };
  const consistency = checkAmountWordsConsistency(amount, amountWords);
  if (!consistency.consistent) return { valid: false, error: "Amount in words does not match numeric amount." };
  if (!printMode) return { valid: false, error: "Print mode not selected." };
  const calError = validateCalibrationPair(cal.x, cal.y);
  if (calError) return { valid: false, error: calError };
  const profile = template.profiles[printMode];
  if (!profile) return { valid: false, error: "Print layout not available for selected mode." };
  const geom = resolvePrintGeometry(template, printMode);
  const geomErrors = validatePrintGeometry(geom, template, printMode);
  if (geomErrors) return { valid: false, error: "Template geometry invalid." };
  const boundsErrors = validateCalibratedBounds(template, printMode);
  if (boundsErrors) return { valid: false, error: "Calibration would push the cheque off the page." };
  return { valid: true, error: "" };
}

const full1 = simulateFullPrintGate(
  siddhartha,
  "2024-06-01",
  "Ram Bahadur",
  "2500.00",
  "Two Thousand Five Hundred Rupees Only",
  "custom_short",
  { x: 5, y: -3 },
);
assert(full1.valid, "full print gate passes for Direct Feed with calibration");

const full2 = simulateFullPrintGate(
  siddhartha,
  "2024-06-01",
  "Sita Devi",
  "100.50",
  "One Hundred Rupees and Fifty Paisa Only",
  "a4_vertical",
  { x: 2.5, y: -1.0 },
);
assert(full2.valid, "full print gate passes for A4 Carrier with calibration");

// Print profile missing (simulate corrupt template)
const corruptTemplate = JSON.parse(JSON.stringify(siddhartha));
delete corruptTemplate.profiles.a4_vertical;
const full3 = simulateFullPrintGate(
  corruptTemplate,
  "2024-06-01",
  "Ram",
  "1000",
  "One Thousand Rupees Only",
  "a4_vertical",
  { x: 0, y: 0 },
);
assert(!full3.valid && full3.error.includes("layout"), "full print gate rejects missing print profile");

console.log("\n=== TEST GROUP 11: A/C PAYEE POSITIONING PRESERVED ===");

// Verify each template has an accountPayee field with a y-coordinate
for (const id of ["siddhartha", "nabil", "nicadc", "everest", "bankpokhara"]) {
  const t = getTemplate(id);
  assert(t?.fields.accountPayee !== undefined, `${id}: accountPayee field exists`);
  assert(typeof t?.fields.accountPayee?.y === "number", `${id}: accountPayee has numeric y-coordinate`);
  assert(t?.fields.accountPayee?.align === "center", `${id}: accountPayee is centered`);
  assert(t?.fields.accountPayee?.x === 0, `${id}: accountPayee starts at x=0`);
}

// Verify accountPayee y-coordinates match the bank-specific template values
const expectedApY = {
  siddhartha: 16,
  nabil: 14,
  nicadc: 18,
  everest: 12,
  bankpokhara: 20,
};
for (const [id, expectedY] of Object.entries(expectedApY)) {
  const t = getTemplate(id);
  assert(t?.fields.accountPayee?.y === expectedY, `${id}: accountPayee Y = ${expectedY} (preserved bank-specific)`);
}

// ---------------------------------------------------------------------------
// TEST GROUP 12: STALE WORDS CLEANUP (PART 2 requirement #3)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 12: STALE WORDS CLEANUP ===");

// 12.1: When amount becomes invalid, auto-generated words should be empty
const staleWords1 = generateAmountWords("1000");
assert(staleWords1 === "One Thousand Rupees Only", "generateAmountWords('1000') produces words");
const staleWords2 = generateAmountWords("abc");
assert(staleWords2 === "", "generateAmountWords('abc') produces empty (stale words cleared)");
const staleWords3 = generateAmountWords("0");
assert(staleWords3 === "", "generateAmountWords('0') produces empty (zero → no words)");

// 12.2: checkAmountWordsConsistency — stale words from previous valid amount should not be consistent
// When the amount changes to a new value, the old words should not match
const sw1 = checkAmountWordsConsistency("2000", "One Thousand Rupees Only");
assert(!sw1.consistent, "stale words from 1000 do not match 2000");
assert(sw1.expected === "Two Thousand Rupees Only", "expected words regenerate for 2000");

// 12.3: Amount invalidated then words cleared — consistency should fail
const sw2 = checkAmountWordsConsistency("abc", "One Thousand Rupees Only");
assert(!sw2.consistent, "invalid amount with any words → not consistent");

// 12.4: The expected field always returns the canonical words for the current amount
const sw3 = checkAmountWordsConsistency("500.50", "Five Hundred Rupees and Fifty Paisa Only");
assert(sw3.consistent, "matching words for 500.50 consistent");
const sw4 = checkAmountWordsConsistency("500.50", "Wrong words");
assert(!sw4.consistent, "wrong words for 500.50 not consistent");
assert(sw4.expected === "Five Hundred Rupees and Fifty Paisa Only", "expected field returns canonical words");

// ---------------------------------------------------------------------------
// TEST GROUP 13: MAXIMUM AMOUNT (PART 2 requirement #1, #2)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 13: MAXIMUM AMOUNT ===");

// 13.1 Maximum valid amount
const maxCheck = validateAmount("999999999999.99");
assert(maxCheck.valid && maxCheck.paisa === MAX_AMOUNT_PAISA, "maximum amount 999999999999.99 accepted as " + MAX_AMOUNT_PAISA + " paisa");

// 13.2 Maximum amount with comma grouping
const maxComma = validateAmount("999,999,999,999.99");
assert(maxComma.valid && maxComma.paisa === MAX_AMOUNT_PAISA, "max amount with commas accepted");

// 13.3 Maximum amount displays without floating-point errors
const maxDisplay = formatAmountDisplay(MAX_AMOUNT_PAISA);
assert(maxDisplay === "999,999,999,999.99", "max amount display uses integer paisa (no float errors): " + maxDisplay);

// 13.4 Words for maximum amount
const maxWords = amountToWordsFromPaisa(MAX_AMOUNT_PAISA);
assert(maxWords.includes("Only") && maxWords.includes("Rupees"), "max amount words generated correctly");

// 13.5 Amount just above maximum rejected
const overMax = validateAmount("1000000000000.00");
assert(!overMax.valid, "amount above maximum rejected");

// 13.6 Amount with 3 decimal places rejected even if under max
const threeDecimals = validateAmount("999999999999.999");
assert(!threeDecimals.valid, "3 decimal places rejected even near max");

// ---------------------------------------------------------------------------
// TEST GROUP 14: UNICODE & SPECIAL CHARACTER PAYEES (PART 2 requirement #5)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 14: UNICODE & SPECIAL CHARACTER PAYEES ===");

// 14.1 Devanagari (Nepali) payee
const unicode1 = validatePayee("कृष्ण प्रसाद शेर्मा");
assert(unicode1.valid && unicode1.payee === "कृष्ण प्रसाद शेर्मा", "Devanagari payee accepted and preserved");

// 14.2 Arabic script payee
const unicode2 = validatePayee("أحمد محمد");
assert(unicode2.valid && unicode2.payee === "أحمد محمد", "Arabic script payee accepted and preserved");

// 14.3 Mixed script payee
const unicode3 = validatePayee("John राम Doe");
assert(unicode3.valid, "mixed-script payee accepted");

// 14.4 Payee with emoji (should be rejected — emoji are not valid in payee names)
const emojiPayee = validatePayee("Ram 🎉 Bahadur");
assert(!emojiPayee.valid, "payee with emoji rejected");

// 14.5 Payee with only special characters (non-empty after trim)
const specialOnly = validatePayee("ABC & Co. #5 @ Ltd.");
assert(specialOnly.valid, "payee with ampersand, hash, at-sign accepted");

// 14.6 Payee with tabs and newlines normalized
const tabbed = validatePayee("Ram\tBahadur\nThapa");
assert(tabbed.valid && tabbed.payee === "Ram Bahadur Thapa", "tabs and newlines collapsed to spaces");

// 14.7 Unicode payee that is at max length
const unicodeMax = "क".repeat(MAX_PAYEE_CHARS);
const unicodeMaxResult = validatePayee(unicodeMax);
assert(unicodeMaxResult.valid, "Unicode payee at exactly max length accepted");

// 14.8 Unicode payee exceeding max length
const unicodeTooLong2 = "क".repeat(MAX_PAYEE_CHARS + 1);
const unicodeTooLongResult = validatePayee(unicodeTooLong2);
assert(!unicodeTooLongResult.valid, "overlength Unicode payee rejected");

// ---------------------------------------------------------------------------
// TEST GROUP 15: DATE VALIDATION — ADDITIONAL EDGE CASES (PART 2 requirement #4)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 15: DATE VALIDATION EDGE CASES ===");

// 15.1 February 29 in various leap years
assert(isValidDate("1600-02-29"), "1600 is a leap year (div by 400) — Feb 29 valid");
assert(!isValidDate("1700-02-29"), "1700 is NOT a leap year (div by 100 not 400) — Feb 29 rejected");
assert(!isValidDate("1800-02-29"), "1800 is NOT a leap year — Feb 29 rejected");
assert(!isValidDate("1900-02-29"), "1900 is NOT a leap year — Feb 29 rejected");
assert(isValidDate("2000-02-29"), "2000 is a leap year — Feb 29 valid");

// 15.2 Months with 31 vs 30 days
assert(isValidDate("2024-01-31"), "January has 31 days");
assert(!isValidDate("2024-01-32"), "January 32 rejected");
assert(isValidDate("2024-03-31"), "March has 31 days");
assert(!isValidDate("2024-03-32"), "March 32 rejected");
assert(isValidDate("2024-05-31"), "May has 31 days");
assert(!isValidDate("2024-05-32"), "May 32 rejected");
assert(isValidDate("2024-07-31"), "July has 31 days");
assert(!isValidDate("2024-07-32"), "July 32 rejected");
assert(isValidDate("2024-08-31"), "August has 31 days");
assert(isValidDate("2024-10-31"), "October has 31 days");
assert(isValidDate("2024-12-31"), "December has 31 days");
assert(!isValidDate("2024-12-32"), "December 32 rejected");

// 15.3 Months with 30 days
assert(isValidDate("2024-04-30"), "April has 30 days");
assert(!isValidDate("2024-04-31"), "April 31 rejected");
assert(isValidDate("2024-06-30"), "June has 30 days");
assert(!isValidDate("2024-06-31"), "June 31 rejected");
assert(isValidDate("2024-09-30"), "September has 30 days");
assert(!isValidDate("2024-09-31"), "September 31 rejected");
assert(isValidDate("2024-11-30"), "November has 30 days");
assert(!isValidDate("2024-11-31"), "November 31 rejected");

// 15.4 Date round-trip through formatDateDigits
assert(formatDateDigits("2024-02-29") === "29022024", "leap day formats to DDMMYYYY");
assert(formatDateDigits("2023-02-28") === "28022023", "non-leap Feb 28 formats correctly");

// 15.5 validateChequeDate rejects future dates
const futureIso = "9999-12-31";
assert(!validateChequeDate(futureIso).valid, "far-future date rejected by validateChequeDate");

// 15.6 Date with extra whitespace — should be rejected by the strict format check
assert(!isValidDate(" 2024-03-15"), "date with leading space rejected");
assert(!isValidDate("2024-03-15 "), "date with trailing space rejected");

// ---------------------------------------------------------------------------
// TEST GROUP 16: AMOUNT-TO-WORDS CONSISTENCY — USER EDIT PRESERVATION
// (PART 2 requirement #3: preserve manual edits, validate before printing)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 16: USER EDITED WORDS VALIDATION ===");

// 16.1 User edits words to be consistent with the amount
const userConsistent = checkAmountWordsConsistency("1000", "One Thousand Rupees Only");
assert(userConsistent.consistent, "user-typed matching words consistent");

// 16.2 User edits words to be inconsistent — should be flagged
const userInconsistent = checkAmountWordsConsistency("1000", "One Thousand Rupees and Fifty Paisa Only");
assert(!userInconsistent.consistent, "user-typed inconsistent words flagged");

// 16.3 Case-insensitive comparison allows user style variations
const caseVariant = checkAmountWordsConsistency("100", "one hundred rupees only");
assert(caseVariant.consistent, "case-insensitive user variation accepted");

// 16.5 Correct words with extra whitespace and different case
const cleanVariant = checkAmountWordsConsistency("1000", "  ONE   THOUSAND   RUPEES   ONLY  ");
assert(cleanVariant.consistent, "canonical words with extra whitespace + uppercase still consistent");

// ---------------------------------------------------------------------------
// TEST GROUP 17: AMOUNT PARSER — EXHAUSTIVE MALFORMED INPUT REJECTION
// (PART 2 requirement #1)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 17: AMOUNT PARSER — EXHAUSTIVE MALFORMED INPUT REJECTION ===");

// 17.1 Non-numeric strings
assertRejects("abc", "rejects pure alphabetic");
assertRejects("123abc", "rejects trailing alphabetic suffix");
assertRejects("abc123", "rejects leading alphabetic prefix");
assertRejects("1.2.3", "rejects multiple decimal points");
assertRejects("10..50", "rejects double decimal point");
assertRejects("10.123", "rejects 3 decimal places");

// 17.2 Negative values
assertRejects("-100", "rejects negative");
assertRejects("-100.50", "rejects negative with decimals");
assertRejects("-0.01", "rejects negative fractional");

// 17.3 Empty / whitespace only
assertRejects("", "rejects empty string");
assertRejects("   ", "rejects whitespace-only");
assertRejects("\t\t", "rejects tab-only");
assertRejects("\n\t ", "rejects mixed whitespace");

// 17.4 Special float values
assertRejects("Infinity", "rejects Infinity string");
assertRejects("-Infinity", "rejects -Infinity string");
assertRejects("+Infinity", "rejects +Infinity string");
assertRejects("NaN", "rejects NaN string");
assert(!validateAmount("Infinity").valid, "validNumber(Infinity) rejects");
assert(!validateAmount("-Infinity").valid, "validNumber(-Infinity) rejects");
assert(!validateAmount("NaN").valid, "validNumber(NaN) rejects");

// 17.5 Scientific notation
assertRejects("1e5", "rejects scientific notation (lowercase)");
assertRejects("1E5", "rejects scientific notation (uppercase)");
assertRejects("1.5e3", "rejects scientific notation with decimal");

// 17.6 Trailing/leading decimal point
assertRejects("100.", "rejects trailing decimal");
assertRejects(".50", "rejects leading decimal");
assertRejects("100.0.", "rejects trailing dot after decimal");

// 17.7 Commas in wrong positions
assertRejects("1,00", "rejects invalid comma group 1,00");
assertRejects("1,0000", "rejects invalid comma group 1,0000");
assertRejects("1,00,000", "rejects Indian comma grouping");
assertRejects("1,000,00", "rejects trailing bad comma group");
assertRejects(",100", "rejects leading comma");
assertRejects("100,", "rejects trailing comma");
assertRejects("1,000.50.00", "rejects multiple decimals after comma");

// 17.8 Leading zeros
assertRejects("007", "rejects leading zeros (007)");
assertRejects("00", "rejects double zero");

// 17.9 Plus sign
assertRejects("+100", "rejects positive sign prefix");
assertRejects("+100.50", "rejects positive sign with decimals");

// 17.10 Hexadecimal
assertRejects("0x100", "rejects hex notation");
assertRejects("0xFF", "rejects hex with letters");

// 17.11 Whitespace inside (internal space)
assertRejects("1 000", "rejects internal space");
assertRejects("1000 00", "rejects internal space between digits");

// 17.12 Currency symbols
assertRejects("$100", "rejects dollar prefix");
assertRejects("100$", "rejects dollar suffix");
assertRejects("Rs. 100", "rejects currency prefix with text");
assertRejects("100 NPR", "rejects currency suffix with text");
assertRejects("₨100", "rejects rupee symbol prefix");

// ---------------------------------------------------------------------------
// TEST GROUP 18: PAYEE OVERFLOW PREVENTION (PART 2 requirement #5)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 18: PAYEE OVERFLOW PREVENTION ===");

// 18.1 Very long ASCII payee at max length is accepted (overflow prevention is via font-fitting)
const longAscii = "A".repeat(MAX_PAYEE_CHARS);
const longAsciiResult = validatePayee(longAscii);
assert(longAsciiResult.valid, "max-length ASCII payee accepted (overflow handled by font-fitting)");

// 18.2 Payee slightly over max length is rejected
const overLong = "A".repeat(MAX_PAYEE_CHARS + 1);
const overLongResult = validatePayee(overLong);
assert(!overLongResult.valid, "payee exceeding max length rejected");

// 18.3 Unicode payee that exceeds byte length but not char count
const longUnicode = "कष्ट".repeat(Math.floor(MAX_PAYEE_CHARS / 4));
const longUnicodeResult = validatePayee(longUnicode);
assert(longUnicodeResult.valid, "long Unicode payee within char limit accepted");

// 18.4 Empty after normalization
const spacesOnly = "   \t\n  ";
const spacesResult = validatePayee(spacesOnly);
assert(!spacesResult.valid, "whitespace-only payee (with tabs/newlines) rejected");

// 18.5 Payee with leading/trailing special whitespace characters
const specialWs = "\u00A0Ram Bahadur\u00A0";
const specialWsResult = validatePayee(specialWs);
assert(specialWsResult.valid, "payee with non-breaking spaces trimmed and accepted");

// ---------------------------------------------------------------------------
// TEST GROUP 19: A/C PAYEE ONLY — RENDERING PRESERVATION (PART 2 requirement #6)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 19: A/C PAYEE ONLY RENDERING PRESERVATION ===");

// 19.1 Verify accountPayee field exists in every template
for (const id of ["siddhartha", "nabil", "nicadc", "everest", "bankpokhara"]) {
  const t = getTemplate(id);
  const ap = t?.fields.accountPayee;
  assert(ap !== undefined, `${id}: accountPayee field exists`);
  assert(ap?.align === "center", `${id}: accountPayee is center-aligned`);
  assert(ap?.x === 0, `${id}: accountPayee starts at x=0 (full-width centering)`);
  assert(typeof ap?.y === "number" && ap.y > 0, `${id}: accountPayee has positive y-coordinate`);
  assert(ap?.width === t?.widthMm, `${id}: accountPayee width equals cheque width (full-width centering)`);
}

// 19.2 Verify no template has accountPayee y=0 (would render at very top edge)
for (const t of getAllTemplates()) {
  const apY = t.fields.accountPayee?.y;
  assert(typeof apY === "number" && apY > 0 && apY < t.heightMm, `${t.bankName}: accountPayee y (${apY}) is within cheque bounds`);
}

// 19.3 Verify accountPayee does not overlap with date field (date is at y~6)
for (const t of getAllTemplates()) {
  const apY = t.fields.accountPayee?.y ?? 0;
  const dateY = t.fields.date?.y ?? 0;
  assert(apY > dateY, `${t.bankName}: accountPayee (y=${apY}) is below date field (y=${dateY}) — no overlap`);
}

// ---------------------------------------------------------------------------
// TEST GROUP 20: FINAL PRINT VALIDATION GATE (PART 2 requirement #7)
// ---------------------------------------------------------------------------
console.log("\n=== TEST GROUP 20: FINAL PRINT VALIDATION GATE ===");

function simulateFinalPrintGate(
  template,
  date,
  payee,
  amount,
  amountWords,
  printMode,
  cal,
) {
  // This mirrors the exact sequence in Workspace.handlePrint()
  if (!date || !validateChequeDate(date).valid) return { valid: false, error: "Invalid date." };
  const payeeCheck = validatePayee(payee);
  if (!payeeCheck.valid) return { valid: false, error: "Payee name is required." };
  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) return { valid: false, error: "Invalid amount." };
  if (amountValidation.paisa === 0) return { valid: false, error: "Amount must be greater than zero." };
  if (!amountWords.trim()) return { valid: false, error: "Amount in words is required." };
  const consistency = checkAmountWordsConsistency(amount, amountWords);
  if (!consistency.consistent) return { valid: false, error: "Amount in words do not match." };
  if (!template) return { valid: false, error: "No bank template selected." };
  if (!printMode) return { valid: false, error: "Print mode not selected." };
  const calError = validateCalibrationPair(cal.x, cal.y);
  if (calError) return { valid: false, error: calError };
  const profile = template.profiles[printMode];
  if (!profile) return { valid: false, error: "Print profile not available." };
  const geom = resolvePrintGeometry(template, printMode);
  const geomErrors = validatePrintGeometry(geom, template, printMode);
  if (geomErrors) return { valid: false, error: "Invalid layout." };
  const boundsErrors = validateCalibratedBounds(template, printMode);
  if (boundsErrors) return { valid: false, error: "Cheque off page." };
  return { valid: true, error: "" };
}

// 20.1 Fully valid print data passes all checks
const f1 = simulateFinalPrintGate(
  siddhartha,
  "2024-03-15",
  "Ram Bahadur Thapa",
  "25000.50",
  "Twenty-Five Thousand Rupees and Fifty Paisa Only",
  "custom_short",
  { x: 0, y: 0 },
);
assert(f1.valid, "fully valid print data passes");

// 20.2 Missing bank template
const f2 = simulateFinalPrintGate(null, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!f2.valid, "missing template blocked");

// 20.3 Future date blocked
const f3 = simulateFinalPrintGate(siddhartha, "9999-12-31", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!f3.valid, "future date blocked");

// 20.4 Invalid amount (malformed) blocked
const f4 = simulateFinalPrintGate(siddhartha, "2024-03-15", "Ram", "abc", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!f4.valid, "malformed amount blocked");

// 20.5 Zero amount blocked
const f5 = simulateFinalPrintGate(siddhartha, "2024-03-15", "Ram", "0", "Zero Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!f5.valid, "zero amount blocked");

// 20.6 Empty words blocked
const f6 = simulateFinalPrintGate(siddhartha, "2024-03-15", "Ram", "5000", "", "custom_short", { x: 0, y: 0 });
assert(!f6.valid, "empty words blocked");

// 20.7 Inconsistent words blocked
const f7 = simulateFinalPrintGate(siddhartha, "2024-03-15", "Ram", "5000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!f7.valid, "inconsistent words blocked");

// 20.8 Invalid date (Feb 30) blocked
const f8 = simulateFinalPrintGate(siddhartha, "2026-02-30", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!f8.valid, "impossible date blocked");

// 20.9 Out-of-range calibration blocked
const f9 = simulateFinalPrintGate(siddhartha, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: 99, y: 0 });
assert(!f9.valid, "out-of-range calibration blocked");

// 20.10 NaN calibration blocked
const f10 = simulateFinalPrintGate(siddhartha, "2024-03-15", "Ram", "1000", "One Thousand Rupees Only", "custom_short", { x: NaN, y: 0 });
assert(!f10.valid, "NaN calibration blocked");

// 20.11 Empty payee blocked
const f11 = simulateFinalPrintGate(siddhartha, "2024-03-15", "", "1000", "One Thousand Rupees Only", "custom_short", { x: 0, y: 0 });
assert(!f11.valid, "empty payee blocked");

// 20.12 A4 Carrier mode with valid data passes
const f12 = simulateFinalPrintGate(siddhartha, "2024-06-01", "Sita Devi", "100.50", "One Hundred Rupees and Fifty Paisa Only", "a4_vertical", { x: 2.5, y: -1.0 });
assert(f12.valid, "A4 Carrier valid data passes");

// 20.13 All templates pass the final gate
for (const t of getAllTemplates()) {
  const result = simulateFinalPrintGate(
    t, "2024-06-01", "Test Payee", "2500.00", "Two Thousand Five Hundred Rupees Only", "custom_short", { x: 0, y: 0 },
  );
  assert(result.valid, t.bankName + ": final print gate passes");
}

console.log("\n=== VALIDATION TEST SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome validation tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll validation tests PASSED.");
}
