/**
 * Trial and account-access decisions.
 *
 * This module is imported by the edge middleware and by server components, so
 * it is deliberately dependency-free: no Prisma, no Node built-ins, no I/O.
 *
 * Auth.js seals the claims below into the session cookie at sign-in and only
 * re-runs the `jwt` callback on sign-in, so anything derived from them is
 * frozen for the whole session (30 days by default). A sealed boolean such as
 * "trialExpired" therefore keeps saying whatever was true at login time.
 *
 * Every decision here works from a *timestamp* evaluated at request time
 * instead, so a lapsed trial, a suspended account or a revoked admin role is
 * noticed on the next request rather than at the next sign-in.
 */

/** Reasons an account is refused entry, as returned by {@link isAccountBlocked}. */
export type AccessDenial = "suspended" | "expired";

export interface AccessClaims {
  role?: string | null;
  status?: string | null;
  /**
   * Trial end as sealed into the token. A string when it came out of a JWT,
   * a Date when it came straight from the database.
   */
  trialExpiresAt?: string | Date | null;
  /**
   * Claim written by tokens minted before trialExpiresAt existed. Only used
   * when no usable timestamp is present, so live sessions survive the upgrade.
   */
  legacyTrialExpired?: boolean | null;
}

export interface AccessDecision {
  /** Non-null when the account itself must be kept out entirely. */
  blocked: AccessDenial | null;
  /** True when a trial user's trial has run out. */
  trialExpired: boolean;
}

/**
 * Statuses that must never reach the panel or the API.
 *
 * PENDING_VERIFICATION and ACTIVE are allowed through: email verification is
 * not enforced as a hard gate anywhere in this app.
 */
export function isAccountBlocked(status?: string | null): AccessDenial | null {
  if (status === "SUSPENDED") return "suspended";
  if (status === "EXPIRED") return "expired";
  return null;
}

/**
 * True when a trial user's trial has run out.
 *
 * Only TRIAL_USER is subject to the clock: a paying USER keeps access even when
 * a stale trialExpires is still sitting on the row, so approving a payment
 * cannot lock a customer out.
 */
export function isTrialExpired(claims: AccessClaims, now: Date | number = Date.now()): boolean {
  if (claims.role !== "TRIAL_USER") return false;

  const expiresAt = toTime(claims.trialExpiresAt);
  if (expiresAt !== null) return expiresAt <= toMs(now);

  // No usable timestamp — either the account has no trial clock at all, or the
  // token predates trialExpiresAt. Fall back to the sealed boolean.
  return claims.legacyTrialExpired === true;
}

/** Combines both refusals into one answer. */
export function evaluateAccess(
  claims: AccessClaims,
  now: Date | number = Date.now()
): AccessDecision {
  return {
    blocked: isAccountBlocked(claims.status),
    trialExpired: isTrialExpired(claims, now),
  };
}

function toMs(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value;
}

function toTime(value: string | Date | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
