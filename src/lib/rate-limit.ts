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
 * Safety bound on the rate-limit store. Buckets are keyed by client-supplied
 * IP material, so without a cap a spoofable key could grow the map
 * unboundedly (cheap memory DoS). Oldest buckets are evicted first; the
 * window logic is untouched, and a healthy deployment never reaches this
 * size because expired buckets are lazily replaced.
 */
const MAX_RATE_LIMIT_BUCKETS = 10_000;

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

  // Housekeeping only when the store actually grew large; O(n) sweep and
  // evict expired buckets, and hard-drop the oldest if still oversized.
  const keys = Object.keys(store);
  if (keys.length > MAX_RATE_LIMIT_BUCKETS) {
    for (const k of keys) {
      if (now - store[k].start >= windowMs) delete store[k];
    }
    const remaining = Object.keys(store);
    if (remaining.length > MAX_RATE_LIMIT_BUCKETS) {
      remaining
        .map((k) => ({ k, start: store[k].start }))
        .sort((a, b) => a.start - b.start)
        .slice(0, remaining.length - MAX_RATE_LIMIT_BUCKETS)
        .forEach(({ k }) => delete store[k]);
    }
  }

  return false;
}

/**
 * Best-effort client IP for rate-limit bucketing.
 *
 * `x-forwarded-for` is client-controlled at the TCP hop and can be rotated
 * freely, so the first XFF entry is only trusted when a platform or
 * configured reverse proxy is known to overwrite it:
 *   - On Vercel the platform normalises x-forwarded-for, so it is safe.
 *   - Anywhere else, opt in explicitly with TRUST_PROXY_HEADERS=true once
 *     your proxy is verified to set/overwrite the header.
 * For untrusted deployments we fall back to x-real-ip (set by most proxies)
 * and otherwise to a single shared "unknown" bucket. That is stricter than
 * before — spoofed XFF values no longer mint fresh buckets — while a
 * correctly-proxied deployment keeps per-client granularity.
 */
export function clientIp(request: Request | undefined | null): string {
  const forwarded = request?.headers.get("x-forwarded-for") ?? null;
  const trustedProxy = !!process.env.VERCEL || process.env.TRUST_PROXY_HEADERS === "true";
  if (trustedProxy && forwarded) return forwarded.split(",")[0].trim();
  return request?.headers.get("x-real-ip") ?? "unknown";
}
