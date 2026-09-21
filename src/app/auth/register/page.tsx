"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { register, isAuthenticated } from "@/lib/auth";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/print");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      const result = await register(email.trim(), password, fullName.trim() || undefined);
      if (result.ok) {
        setSuccess("Registration successful. Redirecting to sign in...");
        setTimeout(() => router.replace("/auth/login"), 2000);
        return;
      }
      setError(result.error ?? "Registration failed.");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="panel" style={{ maxWidth: 420, width: "100%", margin: 0 }}>
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
          <ThemeToggle />
          <LanguageToggle />
        </div>

        <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Create your account</h2>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="Your full name"
              required
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              disabled={submitting}
              style={{ fontFamily: "monospace" }}
            />
            <small>At least 8 characters.</small>
          </div>

          <div className="field">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Repeat your password"
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
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </div>
        </form>

        <p style={{ marginTop: 16, fontSize: "0.85rem", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/auth/login" className="text-button">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
