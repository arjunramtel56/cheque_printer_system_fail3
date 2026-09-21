"use client";

import Link from "next/link";
import { ChevronLeft, CreditCard } from "lucide-react";

export default function PlansPage() {
  return (
    <div style={{ display: "grid", gap: 20, maxWidth: "1000px" }}>
      <div>
        <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-muted)", textDecoration: "none", fontSize: "0.88rem", marginBottom: 8 }}>
          <ChevronLeft size={16} />
          Back to Admin
        </Link>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "1.12rem", color: "var(--text-primary)" }}>Plans</h2>
        <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-muted)" }}>
          Manage subscription plans and pricing.
        </p>
      </div>

      <div className="card" style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
        <CreditCard size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Subscription Plans</p>
        <p style={{ fontSize: "0.85rem" }}>Configure plans and pricing for users.</p>
      </div>
    </div>
  );
}
