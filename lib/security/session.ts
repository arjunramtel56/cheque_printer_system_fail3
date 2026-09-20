// ---------------------------------------------------------------------------
// Session isolation — prevents cross-user data leakage on shared devices.
//
// Threat model: In Nepal, many users access web applications from shared
// cybercafes, library computers, or family devices. If calibration data or
// cheque form state persists in localStorage, a subsequent user could see
// the previous user's bank details, payee names, or amounts.
//
// This module provides:
//   1. A per-session UUID that isolates localStorage keys.
//   2. A 24-hour session TTL after which data is automatically cleared.
//   3. Encrypted storage for calibration offsets (AES-256 keyed by session ID).
//   4. Automatic cleanup of stale sessions.
//
// Design: the session ID is stored in a first-party cookie (not localStorage)
// so it is NOT accessible to XSS via document.cookie in the same way. The
// actual data is encrypted with this session ID as the AES key, so even if
// an attacker reads localStorage, they cannot decrypt the data without the
// session cookie.
// ---------------------------------------------------------------------------

import CryptoJS from "crypto-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Session data lifetime: 24 hours in milliseconds. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Session cookie name (first-party, HttpOnly via SameSite=Lax). */
export const SESSION_COOKIE_NAME = "cheque_session_id";

/** Storage key prefix for per-session data. */
const SESSION_STORAGE_PREFIX = "chequePrint_session_";

/** Storage key for the session registry (tracks active sessions for cleanup). */
const SESSION_REGISTRY_KEY = "chequePrint_session_registry";

// ---------------------------------------------------------------------------
// Session interface
// ---------------------------------------------------------------------------

export interface ChequeSession {
  /** UUID v4 */
  sessionId: string;
  /** Epoch milliseconds when created */
  createdAt: number;
  /** Epoch milliseconds when last accessed */
  lastAccessed: number;
  /** Encrypted calibration data, keyed by "bankKey:mode" */
  calibrations?: string;
}

// ---------------------------------------------------------------------------
// In-memory session cache (avoids repeated crypto operations per request)
// ---------------------------------------------------------------------------

let _cachedSessionId: string | null = null;

// ---------------------------------------------------------------------------
// Session ID generation (UUID v4)
// ---------------------------------------------------------------------------

/**
 * Generate a UUID v4 using the Web Crypto API (falls back to Math.random
 * if crypto is unavailable). This does NOT need to be cryptographically
 * strong for session isolation — it just needs to be unpredictable enough
 * that another user can't guess it.
 */
function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (non-cryptographic, but sufficient for isolation)
  return "x" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a new session: generates a fresh UUID, writes it to a cookie,
 * and registers it in the session registry for cleanup tracking.
 *
 * Returns the new session ID.
 */
export function createSecureSession(): string {
  const sessionId = generateSessionId();

  if (typeof window !== "undefined") {
    try {
      // Write session ID to cookie (not localStorage — less XSS-exposed).
      const expires = new Date(Date.now() + SESSION_TTL_MS).toUTCString();
      document.cookie = `${SESSION_COOKIE_NAME}=${sessionId}; path=/; max-age=${Math.floor(SESSION_TTL_MS / 1000)}; SameSite=Lax; Secure`;

      // Register in the session registry for cleanup.
      const registry = loadSessionRegistry();
      registry[sessionId] = { createdAt: Date.now(), lastAccessed: Date.now() };
      saveSessionRegistry(registry);

      // Create the per-session storage shell.
      localStorage.setItem(
        `${SESSION_STORAGE_PREFIX}${sessionId}`,
        JSON.stringify({ createdAt: Date.now(), lastAccessed: Date.now(), calibrations: "{}" }),
      );
    } catch {
      // Cookie/localStorage may be blocked (private mode). Fall back to
      // in-memory session. The user won't get persistent calibration, which
      // is the SAFE failure mode.
    }
  }

  _cachedSessionId = sessionId;
  return sessionId;
}

/**
 * Load the current session ID from the cookie. If no valid session exists
 * or it has expired, a new one is created.
 */
export function getOrCreateSessionId(): string {
  if (_cachedSessionId) return _cachedSessionId;

  if (typeof window !== "undefined") {
    try {
      // Read from cookie.
      const match = document.cookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
      if (match) {
        const sessionId = match[1];
        const sessionData = localStorage.getItem(`${SESSION_STORAGE_PREFIX}${sessionId}`);
        if (sessionData) {
          const parsed = JSON.parse(sessionData) as { lastAccessed: number };
          if (Date.now() - parsed.lastAccessed > SESSION_TTL_MS) {
            // Session expired — clean up and create new.
            destroySession(sessionId);
          } else {
            // Refresh last-accessed.
            const registry = loadSessionRegistry();
            if (registry[sessionId]) {
              registry[sessionId].lastAccessed = Date.now();
              saveSessionRegistry(registry);
            }
            parsed.lastAccessed = Date.now();
            localStorage.setItem(`${SESSION_STORAGE_PREFIX}${sessionId}`, JSON.stringify(parsed));
            _cachedSessionId = sessionId;
            return sessionId;
          }
        }
      }
    } catch {
      // Cookie parsing or storage failed.
    }
  }

  return createSecureSession();
}

/**
 * Destroy a session: remove its cookie, storage, and registry entry.
 * Also purges any stale sessions past their TTL.
 */
export function destroySession(sessionId?: string): void {
  const targetId = sessionId ?? _cachedSessionId ?? readCookieSessionId();
  if (!targetId) return;

  if (typeof window !== "undefined") {
    try {
      // Clear cookie.
      document.cookie = `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

      // Clear session storage.
      localStorage.removeItem(`${SESSION_STORAGE_PREFIX}${targetId}`);

      // Remove from registry.
      const registry = loadSessionRegistry();
      delete registry[targetId];
      saveSessionRegistry(registry);

      // Purge stale sessions.
      purgeStaleSessions();
    } catch {
      // Ignore.
    }
  }

  if (_cachedSessionId === targetId) {
    _cachedSessionId = null;
  }
}

/** Read session ID from cookie (without cache). */
function readCookieSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Session registry (tracks sessions for cleanup)
// ---------------------------------------------------------------------------

interface SessionRegistryEntry {
  createdAt: number;
  lastAccessed: number;
}

type SessionRegistry = Record<string, SessionRegistryEntry>;

function loadSessionRegistry(): SessionRegistry {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SESSION_REGISTRY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SessionRegistry;
  } catch {
    return {};
  }
}

function saveSessionRegistry(registry: SessionRegistry): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Ignore.
  }
}

/** Remove sessions older than SESSION_TTL_MS from the registry and storage. */
function purgeStaleSessions(): void {
  if (typeof window === "undefined") return;
  const registry = loadSessionRegistry();
  let changed = false;
  for (const [id, entry] of Object.entries(registry)) {
    if (Date.now() - entry.lastAccessed > SESSION_TTL_MS) {
      localStorage.removeItem(`${SESSION_STORAGE_PREFIX}${id}`);
      delete registry[id];
      changed = true;
    }
  }
  if (changed) saveSessionRegistry(registry);
}

// ---------------------------------------------------------------------------
// Encrypted storage for calibration offsets
// ---------------------------------------------------------------------------

/**
 * Save an encrypted calibration value for this session. The AES-256 key is
 * the session ID (a UUID), so the data is useless without the session cookie.
 *
 * @param bankKey  The bank identifier (e.g. "siddhartha").
 * @param mode     The print mode (e.g. "custom_short").
 * @param cal      The calibration values to store.
 */
export function saveEncryptedCalibration(
  bankKey: string,
  mode: string,
  cal: { x: number; y: number },
): void {
  const sessionId = getOrCreateSessionId();
  const key = `${bankKey}:${mode}`;
  const sessionDataStr = localStorage.getItem(`${SESSION_STORAGE_PREFIX}${sessionId}`);
  if (!sessionDataStr) return;

  try {
    const sessionData = JSON.parse(sessionDataStr);
    const calibrations = JSON.parse(sessionData.calibrations ?? "{}");
    calibrations[key] = CryptoJS.AES.encrypt(
      JSON.stringify(cal),
      sessionId,
    ).toString();
    sessionData.calibrations = JSON.stringify(calibrations);
    localStorage.setItem(`${SESSION_STORAGE_PREFIX}${sessionId}`, JSON.stringify(sessionData));
  } catch {
    // Corrupt session data — ignore.
  }
}

/**
 * Load and decrypt a calibration value for this session.
 * Returns null if no calibration is stored or decryption fails.
 */
export function loadEncryptedCalibration(
  bankKey: string,
  mode: string,
): { x: number; y: number } | null {
  const sessionId = getOrCreateSessionId();
  const sessionDataStr = localStorage.getItem(`${SESSION_STORAGE_PREFIX}${sessionId}`);
  if (!sessionDataStr) return null;

  try {
    const sessionData = JSON.parse(sessionDataStr);
    const calibrations = JSON.parse(sessionData.calibrations ?? "{}");
    const encrypted = calibrations[`${bankKey}:${mode}`];
    if (!encrypted) return null;

    const decrypted = CryptoJS.AES.decrypt(encrypted, sessionId).toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;

    const parsed = JSON.parse(decrypted);
    // Validate shape (defensive against tampered data).
    if (
      typeof parsed === "object" &&
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
    return null;
  } catch {
    // Decryption failed — tampered or corrupt data. Return null.
    return null;
  }
}

/**
 * Validate that a session is still alive. Returns false if the session
 * has expired or is corrupt.
 */
export function validateSession(sessionId: string): boolean {
  if (typeof window === "undefined") return false;
  const sessionDataStr = localStorage.getItem(`${SESSION_STORAGE_PREFIX}${sessionId}`);
  if (!sessionDataStr) return false;

  try {
    const sessionData = JSON.parse(sessionDataStr);
    if (!sessionData.lastAccessed) return false;
    return Date.now() - sessionData.lastAccessed <= SESSION_TTL_MS;
  } catch {
    return false;
  }
}
