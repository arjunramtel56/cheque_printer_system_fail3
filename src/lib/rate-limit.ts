/**
 * Minimal in-memory rate limiting for sensitive auth endpoints.
 * (Mirrors the existing pattern used by /api/agent. Sufficient for
 * single-instance deployments; swap for a shared store if you scale out.)
 */

interface RateEntry {
  count: number;
  start: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __authRateLimit: Record<string, RateEntry> | undefined;
}

/**
 * Returns true when the action should be blocked.
 * @param key    unique bucket, e.g. `login:192.168.1.1`
 * @param limit  max actions per window
 * @param windowMs window length in milliseconds
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  if (!globalThis.__authRateLimit) {
    globalThis.__authRateLimit = {};
  }
  const store = globalThis.__authRateLimit;
  const now = Date.now();
  const entry = store[key];

  if (entry && now - entry.start < windowMs) {
    entry.count += 1;
    return entry.count > limit;
  }

  store[key] = { count: 1, start: now };
  return false;
}

/** Best-effort client IP for bucketing (behind proxies use x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
