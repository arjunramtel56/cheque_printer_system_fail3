"use client";

import { useState } from "react";
import Link from "next/link";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not send reset link.");
      } else {
        setSubmitted(true);
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

        {submitted ? (
          <>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Reset Link Sent</h2>
            <p style={{ marginBottom: 16, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
              If an account exists for <strong>{email}</strong>, a password reset link has been sent to that address.
              Please check your inbox (and spam folder).
            </p>
            <Link href="/auth/login" className="text-button">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Forgot Password</h2>
            <p style={{ marginBottom: 16, fontSize: "0.84rem", color: "var(--text-secondary)" }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={submitting}
                />
              </div>

              {error && <p className="error-state" role="alert">{error}</p>}

              <div className="form-actions">
                <button type="submit" className="button" disabled={submitting}>
                  {submitting ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>

            <p style={{ marginTop: 16, fontSize: "0.85rem", textAlign: "center" }}>
              Remember your password?{" "}
              <Link href="/auth/login" className="text-button">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
