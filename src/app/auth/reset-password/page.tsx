"use client";

import { useState } from "react";
import Link from "next/link";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not reset password.");
      } else {
        setSuccess("Password reset successful. Redirecting to sign in...");
        setTimeout(() => window.location.href = "/auth/login", 2000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="panel" style={{ maxWidth: 420, width: "100%", margin: 0 }}>
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
          <ThemeToggle />
          <LanguageToggle />
        </div>

        <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Reset Password</h2>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="reset-password">New Password</label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={submitting}
              style={{ fontFamily: "monospace" }}
            />
          </div>

          <div className="field">
            <label htmlFor="reset-confirm">Confirm Password</label>
            <input
              id="reset-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={submitting}
              style={{ fontFamily: "monospace" }}
            />
          </div>

          {error && <p className="error-state" role="alert">{error}</p>}
          {success && <p className="success-state" role="status">{success}</p>}

          <div className="form-actions">
            <button type="submit" className="button" disabled={submitting}>
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>

        <p style={{ marginTop: 16, fontSize: "0.85rem", textAlign: "center" }}>
          <Link href="/auth/login" className="text-button">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
