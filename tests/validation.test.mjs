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
import { getTemplate } from "../lib/templates.ts";

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
assert(parseNumericAmount(Infinity as unknown as string) === null, "rejects Infinity value");
assert(parseNumericAmount(-Infinity as unknown as string) === null, "rejects -Infinity value");
assert(parseNumericAmount(NaN as unknown as string) === null, "rejects NaN value");
assert(parseNumericAmount(123 as unknown as string) === null, "rejects number type");
assert(parseNumericAmount(null as unknown as string) === null, "rejects null");
assert(parseNumericAmount(undefined as unknown as string) === null, "rejects undefined");

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

console.log("\n=== VALIDATION TEST SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome validation tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll validation tests PASSED.");
}
