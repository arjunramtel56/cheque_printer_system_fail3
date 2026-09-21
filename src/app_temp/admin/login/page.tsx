"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { adminLogin, isAdminAuthenticated } from "@/lib/admin";

// ---------------------------------------------------------------------------
// Admin sign-in.
//
// Deliberately minimal and deliberately quiet:
//   - the demo password is NOT printed on this page (it is documented in the
//     README instead) — a login screen that displays its own password is a
//     noticeboard, not a gate;
//   - failure messages are generic: the response never says whether the
//     account is locked or the password was wrong;
//   - when a lockout is active, the form disables itself and counts down.
// ---------------------------------------------------------------------------

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.replace("/admin");
    }
  }, [router]);

  // Lockout countdown: tick once per second while a retry delay is active.
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => setRetryAfter((s) => (s > 1 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || retryAfter > 0) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await adminLogin(password);
      if (result.ok) {
        router.replace("/admin");
        return;
      }
      setError(result.error ?? "Sign-in failed.");
      setRetryAfter(result.retryAfterSeconds);
      setPassword("");
    } catch {
      setError("Sign-in failed. Check the password and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const locked = retryAfter > 0;

  return (
    <div className="panel" style={{ maxWidth: 420, margin: "48px auto" }}>
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
        <ThemeToggle />
        <LanguageToggle />
      </div>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>{t("adminLoginTitle")}</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="admin-password">{t("adminPasswordLabel")}</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={locked || submitting}
            style={{ fontFamily: "monospace" }}
          />
          <small style={{ marginTop: 4, display: "block", color: "var(--text-muted)" }}>
            {t("adminPasswordHelp")}
          </small>
        </div>
        {locked && (
          <p className="error-state" role="alert">
            {t("adminLocked")}{retryAfter}{t("adminRetrySuffix")}
          </p>
        )}
        {error && !locked && <p className="error-state" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="button" disabled={locked || submitting}>
            {submitting ? t("adminSigningIn") : t("adminSignIn")}
          </button>
        </div>
      </form>
    </div>
  );
}
