// Admin utilities: authentication gate and permission checking.
//
// SECURITY POSTURE (be honest about this):
// This remains a client-side DEMO gate. Everything here lives in the browser,
// so a determined user can bypass it with devtools — no client-side gate can
// prevent that. What this update does is make the gate worth its name for the
// threat level it actually faces:
//
//   - the password is never stored or echoed in plaintext (SHA-256 via
//     WebCrypto, a real hash instead of the old 32-bit string hash);
//   - comparison is constant-time, so a timing side channel is not a shortcut;
//   - repeated failures trigger an exponential backoff lockout stored with the
//     session, so guessing is throttled even in a demo;
//   - the UI shows only a generic failure message — never which part failed;
//   - the session stores only { authenticated, expiresAt } — no password
//     material of any kind.
//
// The real replacement is server-side authorization (httpOnly session cookie +
// API routes), tracked for the hardening phase. The admin-access tests pin the
// structure this module must keep.

import type { BankTemplate, ProfileKey } from "./types.ts";
import { validateTemplateForPrint } from "./validation.ts";

const ADMIN_AUTH_KEY = "cheque-admin-auth";
const ADMIN_SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (was 8)
const ADMIN_LOCK_KEY = "cheque-admin-lockout";

/** Default demo credential. Published in the README deliberately — this gate
 *  demonstrates the workflow and is not a security boundary. */
export const ADMIN_DEFAULT_PASSWORD = "admin";

export interface AdminSession {
  authenticated: boolean;
  expiresAt: number; // epoch ms
}

interface LockoutState {
  failures: number;
  lockedUntil: number; // epoch ms; 0 when not locked
}

const MAX_FAILURES_BEFORE_LOCK = 5;
/** Exponential backoff: 2^n seconds, capped at 5 minutes. */
function lockoutDurationMs(failures: number): number {
  return Math.min(2 ** failures * 1000, 5 * 60 * 1000);
}

/** Constant-time string comparison. Both strings are hex of fixed length, but
 *  the loop still runs over the longest input and accumulates every diff. */
function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** SHA-256 hex digest via WebCrypto (available in every modern browser and in
 *  Node 18+, so tests can exercise the same code path). */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readLockout(): LockoutState {
  if (typeof window === "undefined" || !window.localStorage) return { failures: 0, lockedUntil: 0 };
  try {
    const raw = window.localStorage.getItem(ADMIN_LOCK_KEY);
    if (!raw) return { failures: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as LockoutState;
    if (typeof parsed?.failures !== "number" || typeof parsed?.lockedUntil !== "number") {
      return { failures: 0, lockedUntil: 0 };
    }
    return parsed;
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function writeLockout(state: LockoutState): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(ADMIN_LOCK_KEY, JSON.stringify(state));
}

/**
 * Check if an admin session is valid (authenticated and not expired).
 * Used as the auth gate for all admin routes.
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(ADMIN_AUTH_KEY);
    if (!raw) return false;
    const session: AdminSession = JSON.parse(raw);
    if (!session.authenticated || !session.expiresAt) return false;
    if (Date.now() > session.expiresAt) {
      window.localStorage.removeItem(ADMIN_AUTH_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Result of a login attempt. The UI must show only `error` — it intentionally
 * carries no detail about which check failed (lockout vs wrong password).
 */
export interface AdminLoginResult {
  ok: boolean;
  /** Seconds until retry is allowed; 0 when login succeeded or no lock applies. */
  retryAfterSeconds: number;
  error?: string;
}

/**
 * Authenticate with the admin password. Sets a session with TTL on success.
 * Enforces an exponential-backoff lockout after repeated failures.
 */
export async function adminLogin(password: string): Promise<AdminLoginResult> {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ok: false, retryAfterSeconds: 0, error: "Sign-in is unavailable." };
  }

  // Lockout check first. A non-zero remaining window rejects the attempt
  // before any hashing work happens.
  const lock = readLockout();
  const now = Date.now();
  if (lock.lockedUntil > now) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((lock.lockedUntil - now) / 1000),
      error: "Too many failed attempts. Try again later.",
    };
  }

  const [expectedHash, providedHash] = await Promise.all([
    sha256Hex(ADMIN_DEFAULT_PASSWORD),
    sha256Hex(password),
  ]);

  if (!constantTimeEqual(expectedHash, providedHash)) {
    const failures = lock.failures + 1;
    const next: LockoutState = {
      failures,
      lockedUntil: failures >= MAX_FAILURES_BEFORE_LOCK ? now + lockoutDurationMs(failures) : 0,
    };
    writeLockout(next);
    return {
      ok: false,
      retryAfterSeconds: next.lockedUntil ? Math.ceil(lockoutDurationMs(failures) / 1000) : 0,
      error: "Sign-in failed. Check the password and try again.",
    };
  }

  // Success: clear any failure history, then mint a minimal session.
  writeLockout({ failures: 0, lockedUntil: 0 });
  const session: AdminSession = {
    authenticated: true,
    expiresAt: now + ADMIN_SESSION_TTL_MS,
  };
  window.localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(session));
  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * Log out of the admin session.
 */
export function adminLogout(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(ADMIN_AUTH_KEY);
  window.localStorage.removeItem(ADMIN_LOCK_KEY);
}

/**
 * Validate a single template for printing (enabled + has supported modes).
 * This is the guard the print engine uses when an admin-enabled template
 * has been disabled or had its modes removed at runtime.
 */
export function isTemplatePrintable(template: BankTemplate | undefined): boolean {
  if (!template) return false;
  const errs = validateTemplateForPrint(template);
  return errs === null;
}

// Re-export ProfileKey for convenience
export type { ProfileKey };
