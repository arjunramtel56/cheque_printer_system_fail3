/**
 * Server-side source of truth for subscription pricing.
 *
 * The marketing copy in siteConfig.pricing shows introductory first-month
 * offers (NPR 39 / NPR 59). The amounts actually charged and stored on
 * Payment records come from the Plan table (this module), so a tampered
 * client can never pay less than the configured price.
 *
 * Duration pricing model:
 *   - first month: introductory offer (introPrice)
 *   - 3 / 6 / 12 months: regular monthly price x months, as configured below
 *
 * Regular monthly prices live here (single source). When the business
 * changes pricing, update PLAN_PRICING and the seed script together.
 */

export const PLAN_PRICING = {
  standard: {
    /** Introductory first-month offer (matches marketing "NPR 39"). */
    introPrice: 39,
    /** Regular per-month price used for 3/6/12-month durations. */
    monthlyPrice: 99,
  },
  business: {
    introPrice: 59,
    monthlyPrice: 149,
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
  // 1 month = introductory offer; longer durations use the regular monthly rate.
  return durationMonths <= 1 ? pricing.introPrice : pricing.monthlyPrice * durationMonths;
}

/** Is this plan one of the paid plans handled by the manual Fonepay flow? */
export function isPaidPlan(planName: string): planName is PaidPlanName {
  return planName in PLAN_PRICING;
}
