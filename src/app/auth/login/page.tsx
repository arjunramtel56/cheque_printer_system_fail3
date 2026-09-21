"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { login, isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/print");
    }
  }, [router]);

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
      const result = await login(email.trim(), password);
      if (result.ok) {
        router.replace("/print");
        return;
      }
      setError(result.error ?? "Sign-in failed.");
      setRetryAfter(result.retryAfterSeconds);
    } catch {
      setError("Sign-in failed. Check your email and password.");
    } finally {
      setSubmitting(false);
      setPassword("");
    }
  }

  const locked = retryAfter > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="panel" style={{ maxWidth: 420, width: "100%", margin: 0 }}>
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
          <ThemeToggle />
          <LanguageToggle />
        </div>

        <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Sign in to your account</h2>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={locked || submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="user-password">Password</label>
            <input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={locked || submitting}
              style={{ fontFamily: "monospace" }}
            />
          </div>

          {locked && (
            <p className="error-state" role="alert">
              Too many failed attempts. Try again in {retryAfter}s.
            </p>
          )}
          {error && !locked && <p className="error-state" role="alert">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="button" disabled={locked || submitting}>
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </div>
        </form>

        <p style={{ marginTop: 16, fontSize: "0.85rem", textAlign: "center" }}>
          Don't have an account?{" "}
          <Link href="/auth/register" className="text-button">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

