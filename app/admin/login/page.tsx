"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminLogin, ADMIN_DEFAULT_PASSWORD, isAdminAuthenticated } from "@/lib/admin";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.push("/admin");
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (adminLogin(password)) {
      router.push("/admin");
    } else {
      setError("Invalid password.");
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 420, margin: "48px auto" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Administrator Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{ fontFamily: "monospace" }}
          />
          <small style={{ marginTop: 4, display: "block", color: "var(--text-muted)" }}>
            Demo password: <code style={{ background: "var(--surface-secondary)", padding: "2px 6px", borderRadius: 4 }}>{ADMIN_DEFAULT_PASSWORD}</code>
          </small>
        </div>
        {error && <p className="error-state" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="button">Sign In</button>
        </div>
      </form>
    </div>
  );
}
