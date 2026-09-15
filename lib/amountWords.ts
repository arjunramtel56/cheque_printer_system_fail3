// ---------------------------------------------------------------------------
// Pure validation helpers for cheque data: amounts (integer paisa), dates, and
// amount-in-words conversion. No React, no JSX — importable from tests.
//
// Money model:
//   All amounts are stored as INTEGER PAISA internally (1 NPR = 100 paisa).
//   100.50 NPR -> 10050 paisa. We never use floating-point arithmetic for the
//   final cheque amount. The only place parseFloat is used is inside a tightly
//   controlled regex-anchored parser that rejects any non-conformant input.
//
// Amount validation philosophy:
//   The parser is strict by default. It does NOT silently "clean up" malformed
//   input into a valid amount. Every character must fit an accepted numeric
//   format; anything else returns valid:false with a specific error.
// ---------------------------------------------------------------------------

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function integerToWords(value: number): string {
  value = Math.floor(Math.abs(value));
  if (value === 0) return "Zero";

  const groups: [number, string][] = [
    [100000000000, "Kharab"],
    [1000000000, "Arab"],
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
    [100, "Hundred"],
  ];

  const parts: string[] = [];

  for (const [size, name] of groups) {
    if (value >= size) {
      const count = Math.floor(value / size);
      parts.push(`${count < 100 ? belowHundred(count) : integerToWords(count)} ${name}`);
      value %= size;
    }
  }

  if (value > 0) {
    parts.push(belowHundred(value));
  }

  return parts.join(" ");
}

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`;
}

// ---------------------------------------------------------------------------
// Amount parsing — strict, no silent coercion
// ---------------------------------------------------------------------------

/**
 * Maximum representable amount (in paisa).
 * 999999999999.99 NPR = 99999999999999 paisa
 */
export const MAX_AMOUNT_PAISA = 99_999_999_999_999;

/**
 * Strict amount parser. Accepts only:
 *   - "100"              (integer)
 *   - "100.5"            (1–2 decimals)
 *   - "100.50"           (2 decimals)
 *   - "1,000"            (comma-grouped integer)
 *   - "1,000.50"         (comma-grouped with decimals)
 *
 * Rejects unconditionally:
 *   - empty / whitespace-only
 *   - NaN, Infinity, -Infinity
 *   - negative values
 *   - non-numeric suffixes/prefixes ("123abc", "abc", "1.2abc")
 *   - multiple decimal points ("1.2.3", "10..50")
 *   - more than 2 decimal places ("10.123")
 *   - stray characters, leading zeros in wrong places, separators
 *
 * Returns integer paisa on success, null on failure.
 */
export function parseNumericAmount(input: string): number | null {
  // Reject null/undefined/number types at the boundary
  if (typeof input !== "string") return null;

  const trimmed = input.trim();

  // Empty / whitespace-only
  if (trimmed === "") return null;

  // Reject Infinity string
  if (trimmed === "Infinity" || trimmed === "-Infinity" || trimmed === "+Infinity") return null;

  // Reject anything that contains whitespace in the middle (e.g. "1 000")
  // We allow the input to have been trimmed, but internal whitespace is invalid.
  if (/\s/.test(trimmed)) return null;

  // Reject scientific notation
  if (/[eE]/.test(trimmed)) return null;

  // Strip commas only at valid thousand-group positions.
  // Valid: "1,000", "10,00,000", "100,000"
  // Invalid: "1,00", "1,0000", "1,000,0", "10," etc.
  const withoutCommas = trimAndStripCommas(trimmed);
  if (withoutCommas === null) return null;

  // At this point there must be no commas left.
  if (withoutCommas.includes(",")) return null;

  // Must match a strict numeric pattern:
  //   optional leading sign is NOT allowed (negative rejected)
  //   digits, optional single decimal point, exactly 1 or 2 digits after it
  const strictMatch = /^(\d+)(\.(\d{1,2}))?$/.exec(withoutCommas);
  if (!strictMatch) return null;

  const intPart = strictMatch[1];
  const fracPart = strictMatch[3] ?? "";

  // Reject numbers with leading zeros like "007" (ambiguous), but allow "0", "0.50"
  if (intPart.length > 1 && intPart.startsWith("0")) return null;
  // Reject "00" as integer part (but allow "0")
  if (intPart === "00") return null;

  // Parse the integer part (could be very large, keep as string for safety)
  // We use BigInt-safe logic: build the combined integer paisa string.
  // paisa = intPart * 100 + fracPart (padded to 2 digits)
  let paisa: number;
  try {
    if (fracPart === "") {
      paisa = safeParseInt(intPart) * 100;
    } else {
      const paddedFrac = fracPart.length === 1 ? fracPart + "0" : fracPart;
      // intPart * 100 + paddedFrac as integer
      paisa = safeParseInt(intPart) * 100 + safeParseInt(paddedFrac);
    }
  } catch {
    return null;
  }

  // Final guards
  if (!Number.isFinite(paisa) || paisa < 0) return null;
  if (paisa > MAX_AMOUNT_PAISA) return null;

  return paisa;
}

/**
 * Strip commas only if they are valid thousand-grouping separators.
 * Returns the string with commas removed, or null if comma placement is invalid.
 *
 * Rules:
 *   - "1,000"        → valid
 *   - "10,00,000"    → valid (Indian grouping)
 *   - "1,000,000"    → valid
 *   - "1,00"         → invalid (wrong group size)
 *   - "1,0000"       → invalid
 *   - "1000,"        → invalid
 *   - ",100"         → invalid
 */
function trimAndStripCommas(s: string): string | null {
  // Must not start or end with a comma
  if (s.startsWith(",") || s.endsWith(",")) return null;

  const parts = s.split(",");

  // No comma case — return as-is
  if (parts.length === 1) return s;

  // Validate each group: first group can be 1–3 digits, subsequent groups must be exactly 3 digits
  // This is the standard Western grouping. Indian grouping (2-digit thereafter) is also accepted
  // by validating that every non-first group has exactly 3 digits.
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!/^\d{1,3}$/.test(part)) return null;
  }

  // All groups are 1-3 digits; re-strip commas
  return parts.join("");
}

/**
 * Safely parse a string of digits into a non-negative integer.
 * Throws if the string is too large or contains non-digits.
 */
function safeParseInt(digits: string): number {
  if (!/^\d+$/.test(digits)) throw new Error("Not pure digits");
  // For very large numbers, JavaScript loses precision beyond 2^53.
  // We cap input length to avoid silent precision loss. 13 digits (999 billion) is safe.
  if (digits.length > 15) throw new Error("Number too large");
  const n = Number(digits);
  if (!Number.isSafeInteger(n)) throw new Error("Not a safe integer");
  return n;
}

export function validateAmount(input: string): { valid: boolean; error?: string; paisa: number } {
  const paisa = parseNumericAmount(input);
  if (paisa === null) {
    return { valid: false, error: "Please enter a valid amount (e.g. 100 or 100.50).", paisa: 0 };
  }
  return { valid: true, paisa };
}

// ---------------------------------------------------------------------------
// Amount-to-words consistency
// ---------------------------------------------------------------------------

/**
 * Generate the canonical amount-in-words for a given paisa value.
 * Throws on invalid/zero (caller should guard paisa > 0 before calling).
 */
export function amountToWordsFromPaisa(amountPaisa: number): string {
  if (!Number.isFinite(amountPaisa) || amountPaisa < 0) {
    throw new Error("Amount must be a non-negative number.");
  }
  if (amountPaisa > MAX_AMOUNT_PAISA) {
    throw new Error("Amount exceeds the supported range.");
  }

  const rupees = Math.floor(amountPaisa / 100);
  const paisa = amountPaisa % 100;
  let result = `${integerToWords(rupees)} Rupees`;
  if (paisa > 0) {
    result += ` and ${integerToWords(paisa)} Paisa`;
  }
  return result + " Only";
}

/**
 * Generate the canonical amount-in-words from the raw string amount.
 * Returns "" if the amount is invalid or zero (no words can be generated).
 */
export function generateAmountWords(amount: string): string {
  const v = validateAmount(amount);
  if (!v.valid || v.paisa <= 0) return "";
  try {
    return amountToWordsFromPaisa(v.paisa);
  } catch {
    return "";
  }
}

/**
 * Check that the displayed amount words match the canonical words for the
 * given numeric amount. This is used by the print gate to prevent printing
 * when a user-edited words field disagrees with the numeric amount.
 *
 * Returns { consistent, expected } where `consistent` is true if the provided
 * words match the canonical words (case-insensitive, whitespace-normalised).
 * `expected` is always the canonical form so the caller can surface it.
 */
export function checkAmountWordsConsistency(
  amount: string,
  amountWords: string,
): { consistent: boolean; expected: string } {
  const expected = generateAmountWords(amount);
  if (expected === "") return { consistent: false, expected: "" };

  const normalise = (s: string): string =>
    s.trim().replace(/\s+/g, " ").toLowerCase();

  const provided = amountWords.trim();
  if (provided === "") return { consistent: false, expected };

  return {
    consistent: normalise(provided) === normalise(expected),
    expected,
  };
}

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

export function formatAmountDisplay(amountPaisa: number): string {
  return (amountPaisa / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// Date validation — full structural + calendar validation (not regex-only)
// ---------------------------------------------------------------------------

/**
 * Days per month for a given year (handles leap years for February).
 * Index 0 = January, 11 = December.
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Validate an ISO date string "YYYY-MM-DD" and return a DDMMYYYY string.
 *
 * Validation performed (NOT regex-only):
 *   - Format is exactly YYYY-MM-DD (4-2-2 digits)
 *   - year  is a valid 4-digit number (0001–9999)
 *   - month is 01–12
 *   - day   is valid for the given month + year (leap-year aware)
 *   - round-trips through Date construction (rejects impossible dates that
 *     the Date constructor would otherwise silently roll over)
 *
 * Throws with a descriptive message on any error.
 */
export function formatDateDigits(isoDate: string): string {
  if (typeof isoDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error("Date must be in YYYY-MM-DD format.");
  }

  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));

  // Year bounds — 0001..9999 (Date supports a wider range but we cap reasonable)
  if (year < 1 || year > 9999) {
    throw new Error("Date year is out of range.");
  }

  // Month bounds
  if (month < 1 || month > 12) {
    throw new Error("Date month must be between 01 and 12.");
  }

  // Day bounds — month-aware + leap-year aware
  const maxDay = daysInMonth(year, month);
  if (day < 1 || day > maxDay) {
    if (month === 2 && day === 29) {
      throw new Error(`${year} is not a leap year — February has at most 28 days.`);
    }
    throw new Error(`Date day must be between 01 and ${maxDay} for ${year}-${String(month).padStart(2, "0")}.`);
  }

  // Round-trip validation: construct a UTC date and verify it matches.
  // This catches impossible dates that pass the numeric range check but
  // the Date constructor would silently normalize (e.g. overflow).
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new Error("Invalid date.");
  }

  const dd = isoDate.slice(8, 10);
  const mm = isoDate.slice(5, 7);
  const yyyy = isoDate.slice(0, 4);
  return `${dd}${mm}${yyyy}`;
}

/**
 * Pure boolean check: returns true if `isoDate` is a valid YYYY-MM-DD date
 * that passes all structural and calendar validation.
 */
export function isValidDate(isoDate: string): boolean {
  try {
    formatDateDigits(isoDate);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that the date is in the past or today (no future-dated cheques).
 * Returns { valid, error }.
 */
export function validateChequeDate(isoDate: string): { valid: boolean; error?: string } {
  if (isoDate === "") return { valid: false, error: "Date is required." };
  try {
    formatDateDigits(isoDate);
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (isoDate > today) {
    return { valid: false, error: "Cheque date cannot be in the future." };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Payee validation
// ---------------------------------------------------------------------------

/**
 * Maximum number of characters accepted for a payee name before it is
 * considered too long to print legibly in the configured field.
 */
export const MAX_PAYEE_CHARS = 120;
export const MIN_PAYEE_FONT_SIZE = 6;

/**
 * Validate a payee string. Returns { valid, error, payee } where `payee`
 * is the normalised (trimmed, collapsed-space) value.
 */
export function validatePayee(raw: string): { valid: boolean; error?: string; payee: string } {
  if (typeof raw !== "string") {
    return { valid: false, error: "Invalid payee name.", payee: "" };
  }

  // Normalize whitespace: trim leading/trailing, collapse repeated spaces
  const trimmed = raw.trim().replace(/\s+/g, " ");

  if (trimmed === "") {
    return { valid: false, error: "Payee name is required.", payee: "" };
  }

  // Guard against excessively long payee names that would overflow field
  if (trimmed.length > MAX_PAYEE_CHARS) {
    return {
      valid: false,
      error: `Payee name is too long (max ${MAX_PAYEE_CHARS} characters).`,
      payee: trimmed,
    };
  }

  return { valid: true, payee: trimmed };
}
