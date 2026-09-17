"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdminAuthenticated, adminLogout } from "@/lib/admin";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = "Admin" }: AdminLayoutProps) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const check = () => {
      const ok = isAdminAuthenticated();
      setAuthed(ok);
      setLoading(false);
      if (!ok) {
        router.push("/admin/login");
      }
    };
    check();
  }, [router]);

  if (loading) {
    return (
      <div className="panel" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-muted)" }}>Loading admin…</span>
      </div>
    );
  }

  if (!authed) {
    return null;
  }

  return (
    <div className="no-print">
      <div className="panel" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/admin" style={{ fontWeight: 800, color: "var(--brand-blue)", textDecoration: "none" }}>Admin</Link>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>|</span>
          <h1 style={{ fontSize: "1.12rem", margin: 0 }}>{title}</h1>
        </div>
        <button type="button" className="button secondary small" onClick={adminLogout} style={{ fontSize: "0.85rem" }}>
          Sign Out
        </button>
      </div>
      <nav style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Link href="/admin" className="text-button">Dashboard</Link>
        <Link href="/admin/templates" className="text-button">Bank Templates</Link>
      </nav>
      {children}
    </div>
  );
}
