import { getTemplate, getAllTemplates } from "../lib/templates.ts";
import { amountToWordsFromPaisa, formatDateDigits, validateAmount } from "../lib/amountWords.ts";
import { isDirectFeed, isA4Carrier, DIRECT_FEED_MODES, A4_CARRIER_MODES } from "../lib/types.ts";

// Test 1: Templates load
const all = getAllTemplates();
console.log("TEST_1_TEMPLATES_COUNT:", all.length);
if (all.length < 5) throw new Error("Should have at least 5 templates");

// Test 2: Default is no selection
console.assert(getTemplate("") === undefined, "Default should be undefined");

// Test 3: Bank templates are distinct
const ids = all.map(t => t.id);
console.log("TEST_3_TEMPLATE_IDS:", ids.join(","));
if (new Set(ids).size !== ids.length) throw new Error("Duplicate template IDs found");

// Test 4: Date format DDMMYYYY
const dateStr = formatDateDigits("2024-03-15");
console.log("TEST_4_DATE_DIGITS:", dateStr);
if (dateStr !== "15032024") throw new Error("Date should be DDMMYYYY: " + dateStr);

// Test 5: Amount to words - whole number
const w1 = amountToWordsFromPaisa(2500000);
console.log("TEST_5_WORDS_25000:", w1);
if (!w1.includes("Rupees") || !w1.includes("Only")) throw new Error("Words should include Rupees and Only");

// Test 6: Amount with paisa
const w2 = amountToWordsFromPaisa(10050);
console.log("TEST_6_WORDS_100_50:", w2);
if (!w2.includes("Paisa")) throw new Error("Should include Paisa for decimals: " + w2);

// Test 7: Zero amount
const w3 = amountToWordsFromPaisa(0);
console.log("TEST_7_WORDS_0:", w3);
if (w3 !== "Zero Rupees Only") throw new Error("Zero should return 'Zero Rupees Only': " + w3);

// Test 8: Valid amount parsing
const v1 = validateAmount("25000.50");
console.log("TEST_8_VALID_AMOUNT:", v1.valid, v1.paisa);
if (!v1.valid || v1.paisa !== 2500050) throw new Error("Valid amount parsed incorrectly");

// Test 9: Empty amount invalid
const v2 = validateAmount("");
console.log("TEST_9_EMPTY_AMOUNT:", v2.valid);
if (v2.valid) throw new Error("Empty string should be invalid");

// Test 10: Negative amount invalid
const v3 = validateAmount("-100");
console.log("TEST_10_NEGATIVE:", v3.valid);
if (v3.valid) throw new Error("Negative should be invalid");

// Test 11: Excessive amount invalid
const v4 = validateAmount("9999999999999.99");
console.log("TEST_11_EXCESSIVE:", v4.valid);
if (v4.valid) throw new Error("Excessive amount should be invalid");

// Test 12: Each template has distinct coordinates
const siddhartha = getTemplate("siddhartha");
const nabil = getTemplate("nabil");
if (!siddhartha || !nabil) throw new Error("Templates not found");
const datesDifferent = siddhartha.fields.date.x !== nabil.fields.date.x || siddhartha.fields.date.y !== nabil.fields.date.y;
console.log("TEST_12_DISTINCT_COORDS:", datesDifferent);
if (!datesDifferent) throw new Error("Templates should have different coordinates");

// Test 13: Account payee field exists in each template
for (const t of all) {
  if (!t.fields.accountPayee) throw new Error(t.bankName + " missing accountPayee field");
}
console.log("TEST_13_ACCOUNT_PAYEE_FIELDS: OK");

// Test 14: Physical dimensions correct
for (const t of all) {
  if (t.widthMm !== 190.5 || t.heightMm !== 88.9) {
    throw new Error(t.bankName + " has wrong dimensions: " + t.widthMm + "x" + t.heightMm);
  }
}
console.log("TEST_14_PHYSICAL_DIMENSIONS: OK");

// Test 15: Each profile has required properties
for (const t of all) {
  for (const key of ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"]) {
    const p = t.profiles[key];
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") {
      throw new Error(t.bankName + " missing profile " + key);
    }
  }
}
console.log("TEST_15_PROFILES_COMPLETE: OK");

// Test 16: DIRECT_FEED_MODES constant
console.log("TEST_16_DIRECT_FEED_MODES:", JSON.stringify(DIRECT_FEED_MODES));
if (!Array.isArray(DIRECT_FEED_MODES)) throw new Error("DIRECT_FEED_MODES should be an array");
if (DIRECT_FEED_MODES.length !== 2) throw new Error("DIRECT_FEED_MODES should have 2 entries");
if (!DIRECT_FEED_MODES.includes("custom_short") || !DIRECT_FEED_MODES.includes("custom_long")) {
  throw new Error("DIRECT_FEED_MODES missing expected keys");
}
console.log("TEST_16_DIRECT_FEED_MODES: OK");

// Test 17: A4_CARRIER_MODES constant
console.log("TEST_17_A4_CARRIER_MODES:", JSON.stringify(A4_CARRIER_MODES));
if (!Array.isArray(A4_CARRIER_MODES)) throw new Error("A4_CARRIER_MODES should be an array");
if (A4_CARRIER_MODES.length !== 2) throw new Error("A4_CARRIER_MODES should have 2 entries");
if (!A4_CARRIER_MODES.includes("a4_vertical") || !A4_CARRIER_MODES.includes("a4_horizontal")) {
  throw new Error("A4_CARRIER_MODES missing expected keys");
}
console.log("TEST_17_A4_CARRIER_MODES: OK");

// Test 18: isDirectFeed helper
if (!isDirectFeed("custom_short")) throw new Error("custom_short should be direct feed");
if (!isDirectFeed("custom_long")) throw new Error("custom_long should be direct feed");
if (isDirectFeed("a4_vertical")) throw new Error("a4_vertical should NOT be direct feed");
if (isDirectFeed("a4_horizontal")) throw new Error("a4_horizontal should NOT be direct feed");
console.log("TEST_18_IS_DIRECT_FEED: OK");

// Test 19: isA4Carrier helper
if (isA4Carrier("custom_short")) throw new Error("custom_short should NOT be A4 carrier");
if (isA4Carrier("custom_long")) throw new Error("custom_long should NOT be A4 carrier");
if (!isA4Carrier("a4_vertical")) throw new Error("a4_vertical should be A4 carrier");
if (!isA4Carrier("a4_horizontal")) throw new Error("a4_horizontal should be A4 carrier");
console.log("TEST_19_IS_A4_CARRIER: OK");

// Test 20: Direct Feed profiles use cheque dimensions, not A4
for (const t of all) {
  const dfShort = t.profiles.custom_short;
  const dfLong = t.profiles.custom_long;
  // Direct feed: pageWidth/pageHeight should match or relate to cheque size
  // custom_short rotates 90° so page dimensions swap relative to cheque
  // custom_long keeps same orientation
  if (dfShort.rotate !== 90) throw new Error(t.bankName + " custom_short should rotate 90");
  if (dfLong.rotate !== 0) throw new Error(t.bankName + " custom_long should rotate 0");
  // Page sizes for direct feed should be close to standard A4 (since we inject actual @page size at print time)
  // but the x/y offsets should place cheque within bounds
  if (dfShort.x < 0 || dfShort.y < 0) throw new Error(t.bankName + " custom_short has negative offset");
  if (dfLong.x < 0 || dfLong.y < 0) throw new Error(t.bankName + " custom_long has negative offset");
}
console.log("TEST_20_DIRECT_FEED_PROFILES: OK");

// Test 21: A4 Carrier profiles position cheque on A4 sheet
for (const t of all) {
  const a4v = t.profiles.a4_vertical;
  const a4h = t.profiles.a4_horizontal;
  // Portrait: A4 is 210×297, cheque should be centered-ish horizontally
  if (a4v.pageWidth !== 210) throw new Error(t.bankName + " a4_vertical pageWidth should be 210");
  if (a4v.pageHeight !== 297) throw new Error(t.bankName + " a4_vertical pageHeight should be 297");
  // Landscape: A4 is 297×210
  if (a4h.pageWidth !== 297) throw new Error(t.bankName + " a4_horizontal pageWidth should be 297");
  if (a4h.pageHeight !== 210) throw new Error(t.bankName + " a4_horizontal pageHeight should be 210");
  // Cheque position should be within A4 bounds
  if (a4v.x < 0 || a4v.y < 0) throw new Error(t.bankName + " a4_vertical has negative offset");
  if (a4h.x < 0 || a4h.y < 0) throw new Error(t.bankName + " a4_horizontal has negative offset");
}
console.log("TEST_21_A4_CARRIER_PROFILES: OK");

// Test 22: All templates have all four profiles
for (const t of all) {
  for (const key of ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"]) {
    const p = t.profiles[key];
    if (!p) throw new Error(t.bankName + " missing profile: " + key);
    if (typeof p.x !== "number" || typeof p.y !== "number") {
      throw new Error(t.bankName + " profile " + key + " missing numeric x/y");
    }
    if (typeof p.pageWidth !== "number" || typeof p.pageHeight !== "number") {
      throw new Error(t.bankName + " profile " + key + " missing numeric pageWidth/pageHeight");
    }
    if (p.rotate !== 0 && p.rotate !== 90) {
      throw new Error(t.bankName + " profile " + key + " has invalid rotate: " + p.rotate);
    }
  }
}
console.log("TEST_22_ALL_PROFILES_VALID: OK");

// Test 23: A4 Carrier portrait — cheque fits within A4 bounds (210×297 mm)
for (const t of all) {
  const a4v = t.profiles.a4_vertical;
  const rightEdge = a4v.x + t.widthMm;
  const bottomEdge = a4v.y + t.heightMm;
  if (rightEdge > a4v.pageWidth) throw new Error(t.bankName + " a4_vertical: cheque overflows right edge (" + rightEdge.toFixed(2) + " > " + a4v.pageWidth + ")");
  if (bottomEdge > a4v.pageHeight) throw new Error(t.bankName + " a4_vertical: cheque overflows bottom edge (" + bottomEdge.toFixed(2) + " > " + a4v.pageHeight + ")");
}
console.log("TEST_23_A4_VERTICAL_NO_OVERFLOW: OK");

// Test 24: A4 Carrier landscape — cheque fits within A4 bounds (297×210 mm)
for (const t of all) {
  const a4h = t.profiles.a4_horizontal;
  const rightEdge = a4h.x + t.widthMm;
  const bottomEdge = a4h.y + t.heightMm;
  if (rightEdge > a4h.pageWidth) throw new Error(t.bankName + " a4_horizontal: cheque overflows right edge (" + rightEdge.toFixed(2) + " > " + a4h.pageWidth + ")");
  if (bottomEdge > a4h.pageHeight) throw new Error(t.bankName + " a4_horizontal: cheque overflows bottom edge (" + bottomEdge.toFixed(2) + " > " + a4h.pageHeight + ")");
}
console.log("TEST_24_A4_HORIZONTAL_NO_OVERFLOW: OK");

console.log("\n=== ALL 24 TESTS PASSED ===");
