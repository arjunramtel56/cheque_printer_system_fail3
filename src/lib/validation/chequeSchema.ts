// ---------------------------------------------------------------------------
// Strict Zod-based validation schema for the cheque print form.
//
// This is the API-level / print-gate validator. It is consumed by:
//   - src/lib/validation/chequeSchema.ts (the Zod schema, this file)
//   - components/Workspace.tsx (printReadiness + handlePrint gate)
//   - app/api/generate-overlay/route.ts (PDF overlay endpoint, if added)
//
// Security invariants enforced here:
//   1. Payee name is capped and regex-restricted (no injection, no emoji).
//   2. Amount is parsed to integer paisa — never a float — via the strict
//      parser in lib/amountWords.ts.
//   3. Amount-in-words MUST be explicitly provided by the user and MUST match
//      the canonical conversion of the numeric amount (case-insensitive,
//      whitespace-normalised). There is no auto-apply path.
//   4. Date is validated structurally (YYYY-MM-DD) and calendar-correct
//      (leap-year aware), and must not be in the future.
//   5. Bank key must resolve to a known, enabled bank with an active template.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { validateAmount, validateChequeDate, checkAmountWordsConsistencyLocalized } from "../../lib/amountWords.ts";
import { isBankEnabled } from "../../lib/catalogue.ts";
import { getAllActiveTemplates } from "../../lib/templates.ts";

// ---------------------------------------------------------------------------
// Locale enum
// ---------------------------------------------------------------------------

export const LOCALE_VALUES = ["en", "ne"] as const;
export type Locale = (typeof LOCALE_VALUES)[number];

// ---------------------------------------------------------------------------
// Regex constants
// ---------------------------------------------------------------------------

/**
 * Payee name: Devanagari, Latin letters, digits, spaces and a small set of
 * punctuation that is safe for printing on a cheque. Emoji and pictographic
 * characters are rejected. This matches the validatePayee() rules in
 * lib/amountWords.ts but is expressed as a Zod-native regex so the schema
 * is self-documenting at the type layer.
 */
const PAYEE_REGEX = /^[\u0900-\u097F\s.a-zA-Z0-9'\-+#&,.()]+$/;

// ---------------------------------------------------------------------------
// Refined validators — wrap the pure functions from lib/amountWords.ts
// ---------------------------------------------------------------------------

/**
 * A Zod refinement that rejects amounts whose string form parses to paisa
 * that differs from the provided amount-in-words. This is the core
 * amount-in-words gate: the user MUST manually verify, and the gate will
 * not pass unless they match.
 */
function amountWordsMatch(ref: { amount: string; amountInWords: string; locale: Locale }) {
  const amountValid = validateAmount(ref.amount);
  if (!amountValid.valid || amountValid.paisa === 0) {
    return false;
  }
  const result = checkAmountWordsConsistencyLocalized(ref.amount, ref.amountInWords, ref.locale);
  return result.consistent;
}

// ---------------------------------------------------------------------------
// The full schema
// ---------------------------------------------------------------------------

export const chequeFormSchema = z.object({
  payee: z
    .string()
    .min(1, "Payee name is required.")
    .max(40, "Payee name is too long (max 40 characters).")
    .regex(PAYEE_REGEX, "Payee name contains invalid characters."),
  dateAd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
    .refine((d) => validateChequeDate(d).valid, {
      message: "Date is invalid or in the future.",
    }),
  amount: z
    .string()
    .refine((a) => {
      const v = validateAmount(a);
      return v.valid && v.paisa > 0;
    }, "Enter a valid cheque amount greater than zero."),
  amountInWords: z
    .string()
    .min(5, "Amount in words is too short.")
    .max(100, "Amount in words is too long."),
  lang: z.enum(LOCALE_VALUES, { errorMap: () => ({ message: "Unsupported language." }) }),
  bankKey: z
    .string()
    .min(1, "Bank selection is required.")
    .refine((k) => {
      const bank = isBankEnabled(k);
      return bank;
    }, { message: "Selected bank is not enabled for cheque printing." }),
  templateId: z
    .string()
    .min(1, "Cheque template is required.")
    .refine((t) => {
      const templates = getAllActiveTemplates();
      return templates.some((template) => template.id === t);
    }, { message: "Selected template is not available." }),
  accountPayee: z.boolean().default(true),
  printMode: z.enum(["custom_short", "custom_long", "a4_vertical", "a4_horizontal"], {
    errorMap: () => ({ message: "Invalid print mode." }),
  }),
  calibrationX: z
    .number()
    .min(-25, "X calibration must be between -25 and 25 mm.")
    .max(25, "X calibration must be between -25 and 25 mm."),
  calibrationY: z
    .number()
    .min(-25, "Y calibration must be between -25 and 25 mm.")
    .max(25, "Y calibration must be between -25 and 25 mm."),
}).refine(
  amountWordsMatch,
  {
    path: ["amountInWords"],
    message:
      "Amount in words does not match the numerical amount. " +
      "Please correct the amount-in-words field — it must be verified manually.",
  },
);

// ---------------------------------------------------------------------------
// Inferenced types
// ---------------------------------------------------------------------------

export type ChequeFormInput = z.input<typeof chequeFormSchema>;
export type ChequeFormOutput = z.output<typeof chequeFormSchema>;

// ---------------------------------------------------------------------------
// Runtime helper: validate and return either the parsed data or a concise
// error. This wraps zod's verbose error format into a single user-facing
// string suitable for the print gate.
// ---------------------------------------------------------------------------

export interface SchemaResult {
  success: boolean;
  data?: ChequeFormOutput;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export function validateChequeForm(input: unknown): SchemaResult {
  const result = chequeFormSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
      fieldErrors[path] = issue.message;
    }
    const firstError = result.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError, fieldErrors };
  }
  return { success: true, data: result.data };
}
