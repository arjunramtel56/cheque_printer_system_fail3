// ---------------------------------------------------------------------------
// Printer profile management for A4 overlay calibration.
//
// Wraps the session-isolated encrypted storage from lib/security/session.ts.
// Each user's printer calibration (offsetX, offsetY, printer type) is:
//   1. Generated fresh per browser session (cleared on browser restart)
//   2. Encrypted with AES-256 using the session ID as the key
//   3. Stored in localStorage under a session-prefixed key
//   4. Automatically purged after 24 hours
//
// This prevents cross-user data leakage on shared cybercafe computers,
// which is the #1 threat model for Nepal's shared-PC environment.
// ---------------------------------------------------------------------------

import {
  saveEncryptedCalibration,
  loadEncryptedCalibration,
  getOrCreateSessionId,
  validateSession,
} from "@/lib/security/session";

export interface PrinterProfile {
  /** X offset in mm to compensate for printer unprintable margins. */
  offsetX: number;
  /** Y offset in mm to compensate for printer unprintable margins. */
  offsetY: number;
  /** The printer type ("inkjet" or "laser") — determines default margins. */
  printerType: "inkjet" | "laser";
  /** Whether the user calibrated with a physical test print. */
  calibrated: boolean;
  /** ISO timestamp when the profile was last updated. */
  updatedAt: string;
}

export type { getOrCreateSessionId };

/**
 * Calibration range for A4 overlay offsets.
 * Same ±25mm range as the main cheque calibration system.
 */
export const PRINTER_OFFSET_MIN_MM = -25;
export const PRINTER_OFFSET_MAX_MM = 25;

/**
 * Save a printer profile for the current session, encrypted with the
 * session ID. The profile is stored per (bankKey, printMode) to match
 * the calibration model used elsewhere.
 *
 * @param bankKey    The bank identifier (e.g. "siddhartha").
 * @param printMode  The print mode (e.g. "a4_vertical").
 * @param profile    The printer profile to store.
 */
export function savePrinterProfile(
  bankKey: string,
  printMode: string,
  profile: Omit<PrinterProfile, "updatedAt">,
): void {
  if (typeof window === "undefined") return;

  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  const now = new Date().toISOString();
  const fullProfile: PrinterProfile = { ...profile, updatedAt: now };

  // Validate the profile before storing.
  if (
    !Number.isFinite(fullProfile.offsetX) ||
    !Number.isFinite(fullProfile.offsetY) ||
    fullProfile.offsetX < PRINTER_OFFSET_MIN_MM ||
    fullProfile.offsetX > PRINTER_OFFSET_MAX_MM ||
    fullProfile.offsetY < PRINTER_OFFSET_MIN_MM ||
    fullProfile.offsetY > PRINTER_OFFSET_MAX_MM
  ) {
    return; // Don't store invalid profiles
  }

  try {
    saveEncryptedCalibration(bankKey, printMode, {
      x: fullProfile.offsetX,
      y: fullProfile.offsetY,
    });

    // Also store the printer type and calibration flag as separate encrypted entries.
    // We encode them into the x/y calibration fields' "extended" data by using
    // a companion key. The session module stores {x, y} — we extend with a
    // marker in the bankKey namespace.
    const extendedKey = `printerProfile:${bankKey}:${printMode}`;
    const sessionDataStr = localStorage.getItem(`chequePrint_session_${sessionId}`);
    if (sessionDataStr) {
      const sessionData = JSON.parse(sessionDataStr);
      const calibrations = JSON.parse(sessionData.calibrations ?? "{}");

      // Store the full profile encrypted alongside the calibration.
      // We reuse the encryption with a compound value encoded into x/y.
      // For simplicity, store printerType and calibrated flag in a separate
      // encrypted blob keyed by a suffix.
      const CryptoJS = require("crypto-js");
      calibrations[extendedKey] = CryptoJS.AES.encrypt(
        JSON.stringify({
          printerType: fullProfile.printerType,
          calibrated: fullProfile.calibrated,
          updatedAt: fullProfile.updatedAt,
        }),
        sessionId,
      ).toString();

      sessionData.calibrations = JSON.stringify(calibrations);
      localStorage.setItem(`chequePrint_session_${sessionId}`, JSON.stringify(sessionData));
    }
  } catch {
    // Failed to store profile — ignore silently. The user will need to
    // recalibrate on next visit, which is the safe failure mode.
  }
}

/**
 * Load a printer profile for the current session.
 *
 * @param bankKey    The bank identifier.
 * @param printMode  The print mode.
 * @returns          The stored profile, or null if none exists.
 */
export function loadPrinterProfile(
  bankKey: string,
  printMode: string,
): PrinterProfile | null {
  if (typeof window === "undefined") return null;

  const sessionId = getOrCreateSessionId();
  if (!sessionId) return null;

  // Check if session is still valid.
  if (!validateSession(sessionId)) {
    return null;
  }

  try {
    // Load the encrypted calibration (x/y offsets).
    const cal = loadEncryptedCalibration(bankKey, printMode);
    if (!cal) return null;

    // Load the extended profile data (printerType, calibrated, updatedAt).
    const extendedKey = `printerProfile:${bankKey}:${printMode}`;
    const sessionDataStr = localStorage.getItem(`chequePrint_session_${sessionId}`);
    if (!sessionDataStr) return null;

    const sessionData = JSON.parse(sessionDataStr);
    const calibrations = JSON.parse(sessionData.calibrations ?? "{}");
    const encrypted = calibrations[extendedKey];
    if (!encrypted) return null;

    const CryptoJS = require("crypto-js");
    const decrypted = CryptoJS.AES.decrypt(encrypted, sessionId).toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;

    const extended = JSON.parse(decrypted) as {
      printerType: "inkjet" | "laser";
      calibrated: boolean;
      updatedAt: string;
    };

    return {
      offsetX: cal.x,
      offsetY: cal.y,
      printerType: extended.printerType ?? "inkjet",
      calibrated: extended.calibrated ?? false,
      updatedAt: extended.updatedAt ?? "",
    };
  } catch {
    // Decryption failed or data corrupt — return null.
    return null;
  }
}

/**
 * Delete a printer profile for the current session.
 */
export function deletePrinterProfile(bankKey: string, printMode: string): void {
  if (typeof window === "undefined") return;

  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  try {
    const sessionDataStr = localStorage.getItem(`chequePrint_session_${sessionId}`);
    if (!sessionDataStr) return;

    const sessionData = JSON.parse(sessionDataStr);
    const calibrations = JSON.parse(sessionData.calibrations ?? "{}");

    delete calibrations[`${bankKey}:${printMode}`];
    delete calibrations[`printerProfile:${bankKey}:${printMode}`];

    sessionData.calibrations = JSON.stringify(calibrations);
    localStorage.setItem(`chequePrint_session_${sessionId}`, JSON.stringify(sessionData));
  } catch {
    // Ignore
  }
}

/**
 * Clear all printer profiles for the current session.
 */
export function clearAllPrinterProfiles(): void {
  if (typeof window === "undefined") return;

  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  try {
    const sessionDataStr = localStorage.getItem(`chequePrint_session_${sessionId}`);
    if (!sessionDataStr) return;

    const sessionData = JSON.parse(sessionDataStr);
    const calibrations: Record<string, string> = JSON.parse(sessionData.calibrations ?? "{}");

    // Remove all printerProfile entries but keep calibration entries.
    for (const key of Object.keys(calibrations)) {
      if (key.startsWith("printerProfile:")) {
        delete calibrations[key];
      }
    }

    sessionData.calibrations = JSON.stringify(calibrations);
    localStorage.setItem(`chequePrint_session_${sessionId}`, JSON.stringify(sessionData));
  } catch {
    // Ignore
  }
}
