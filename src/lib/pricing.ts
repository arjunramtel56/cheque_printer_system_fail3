/**
 * Server-side source of truth for subscription pricing.
 *
 * SINGLE SOURCE OF TRUTH: these are the exact amounts charged and stored on
 * Payment records. The marketing UI (landing page, /pricing, subscription
 * page) and siteConfig.pricing display the same values — when pricing
 * changes, update this module and the UI copy together.
 *
 * Duration pricing model (flat per-duration prices, matching the advertised
 * NPR amounts):
 *   standard: 1 month NPR 39 (introductory), 3 months NPR 99,
 *             6 months NPR 179, 12 months NPR 299
 *   business: 1 month NPR 59 (introductory), 3 months NPR 149,
 *             6 months NPR 269, 12 months NPR 499
 *
 * The client never sends an amount — the API recomputes it here.
 */

export const PLAN_PRICING = {
  standard: {
    /** Flat amounts by duration in months. */
    1: 39,
    3: 99,
    6: 179,
    12: 299,
  },
  business: {
    1: 59,
    3: 149,
    6: 269,
    12: 499,
  },
} as const;

export type PaidPlanName = keyof typeof PLAN_PRICING;
export const VALID_DURATIONS = [1, 3, 6, 12] as const;

/** Amount (in NPR) to charge for a plan + duration combination. */
export function getAmountDue(planName: string, durationMonths: number): number | null {
  const pricing = PLAN_PRICING[planName as PaidPlanName];
  if (!pricing) return null;
  if (!VALID_DURATIONS.includes(durationMonths as (typeof VALID_DURATIONS)[number])) {
    return null;
  }
  return pricing[durationMonths as 1 | 3 | 6 | 12] ?? null;
}

/** Is this plan one of the paid plans handled by the manual Fonepay flow? */
export function isPaidPlan(planName: string): planName is PaidPlanName {
  return planName in PLAN_PRICING;
}
