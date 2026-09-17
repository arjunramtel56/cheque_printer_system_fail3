// Admin utilities: authentication gate and permission checking.
//
// This is a lightweight admin layer for the cheque template system. It provides:
// - Simple password-based auth (stored in localStorage with a session token)
// - Admin permission checking
//
// Template persistence is handled by lib/templates.ts (upsertTemplate,
// removeTemplate, initRuntimeTemplates, etc.) which both validates and
// persists to localStorage. The admin page uses those functions directly.
//
// In the full commercial system this would integrate with the server-side
// authentication and RBAC system. Here we provide a client-side equivalent
// that respects the "deny-by-default" principle: no admin actions are possible
// without a valid session.

import type { BankTemplate, ProfileKey } from "./types.ts";
import { validateTemplateForPrint } from "./validation.ts";

const ADMIN_AUTH_KEY = "cheque-admin-auth";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface AdminSession {
  authenticated: boolean;
  expiresAt: number; // epoch ms
  passwordHash: string;
}

/**
 * Generate a simple hash of the password for storage comparison.
 * This is NOT cryptographically secure — it's a lightweight obfuscation
 * to avoid storing plaintext in localStorage. The real system uses
 * server-side scrypt hashing.
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return String(hash);
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
 * Authenticate with the admin password. Sets a session with TTL.
 * Returns true on success, false on wrong password.
 */
export function adminLogin(password: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  const expectedHash = simpleHash("admin");
  const providedHash = simpleHash(password);
  if (providedHash !== expectedHash) return false;

  const session: AdminSession = {
    authenticated: true,
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
    passwordHash: providedHash,
  };
  window.localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(session));
  return true;
}

/**
 * Log out of the admin session.
 */
export function adminLogout(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(ADMIN_AUTH_KEY);
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

/**
 * Default admin credentials password (used for the login screen).
 * In the real system, the admin password is set in .env and never committed.
 * This is a demo placeholder for the client-side admin gate.
 */
export const ADMIN_DEFAULT_PASSWORD = "admin";

// Re-export ProfileKey for convenience
export type { ProfileKey };
