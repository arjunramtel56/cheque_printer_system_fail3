// User authentication — client-side store backed by localStorage.
//
// This mirrors the hardened patterns already established in lib/admin.ts (demo
// gate semantics): SHA-256 hashing via WebCrypto, constant-time comparison,
// generic error messages, exponential-backoff lockout, minimal sessions.
//
// It is intentionally NOT server-side. The README is honest about this being a
// Phase 1 client-only engine; the auth store exists so the marketing landing
// can gate the workflow behind /auth and a signed-in user can reach /print.
// Server-side hardening (httpOnly session cookie + API routes) is a later phase.

export const AUTH_USER_KEY = "reactify-user";
export const AUTH_LOCK_KEY = "reactify-user-lockout";
export const AUTH_SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

const MAX_FAILURES_BEFORE_LOCK = 5;

export interface AuthSession {
  authenticated: boolean;
  expiresAt: number;
  email: string;
}

interface LockoutState {
  failures: number;
  lockedUntil: number;
}

export interface AuthResult {
  ok: boolean;
  retryAfterSeconds: number;
  error?: string;
}

function lockoutDurationMs(failures: number): number {
  return Math.min(2 ** failures * 1000, 5 * 60 * 1000);
}

function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

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
    const raw = window.localStorage.getItem(AUTH_LOCK_KEY);
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
  window.localStorage.setItem(AUTH_LOCK_KEY, JSON.stringify(state));
}

export function readUser(): { email: string; passwordHash: string; salt: string } | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { email: string; passwordHash: string; salt: string };
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return false;
    const session: AuthSession = JSON.parse(raw);
    if (!session.authenticated || !session.expiresAt || !session.email) return false;
    if (Date.now() > session.expiresAt) {
      window.localStorage.removeItem(AUTH_USER_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function currentUserEmail(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    return session.email ?? null;
  } catch {
    return null;
  }
}

export function logout(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.localStorage.removeItem(AUTH_LOCK_KEY);
}

export async function register(email: string, password: string): Promise<AuthResult> {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ok: false, retryAfterSeconds: 0, error: "Sign-up is unavailable." };
  }

  if (!email || !email.includes("@") || password.length < 8) {
    return { ok: false, retryAfterSeconds: 0, error: "Please enter a valid email and a password of at least 8 characters." };
  }

  if (readUser()) {
    return { ok: false, retryAfterSeconds: 0, error: "An account for this email already exists." };
  }

  const salt = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
  const passwordHash = await sha256Hex(password + salt);

  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ email, passwordHash, salt }));
  return { ok: true, retryAfterSeconds: 0 };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ok: false, retryAfterSeconds: 0, error: "Sign-in is unavailable." };
  }

  const lock = readLockout();
  const now = Date.now();
  if (lock.lockedUntil > now) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((lock.lockedUntil - now) / 1000),
      error: "Too many failed attempts. Try again later.",
    };
  }

  const stored = readUser();
  const expectedHash = stored ? stored.passwordHash : "";
  const salt = stored ? stored.salt : "";
  const providedHash = await sha256Hex(password + salt);

  // Always run the comparison so timing does not leak whether the account exists.
  const ok = constantTimeEqual(expectedHash, providedHash) && !!stored && stored.email === email;

  if (!ok) {
    const failures = lock.failures + 1;
    const next: LockoutState = {
      failures,
      lockedUntil: failures >= MAX_FAILURES_BEFORE_LOCK ? now + lockoutDurationMs(failures) : 0,
    };
    writeLockout(next);
    return {
      ok: false,
      retryAfterSeconds: next.lockedUntil ? Math.ceil(lockoutDurationMs(failures) / 1000) : 0,
      error: "Sign-in failed. Check your email and password.",
    };
  }

  writeLockout({ failures: 0, lockedUntil: 0 });
  const session: AuthSession = {
    authenticated: true,
    expiresAt: now + AUTH_SESSION_TTL_MS,
    email: stored.email,
  };
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session));
  return { ok: true, retryAfterSeconds: 0 };
}
