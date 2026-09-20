"use client";

// ---------------------------------------------------------------------------
// Gate + chrome for the protected admin area.
//
// This layout lives in the (dashboard) route group, so it applies to
// /admin, /admin/banks, /admin/templates(/*) and /admin/calibration - but NOT
// to /admin/login. That separation is the point: when the gate lived at
// app/admin/layout.tsx it also wrapped the login page, returned null while
// unauthenticated, and made the whole admin panel unreachable (the sign-in
// form could never render). See tests/admin-access.test.mjs.
//
// Authentication is a client-side demo gate (see lib/admin.ts). It is not
// security - the README says so plainly, and server-side authorization is
// scheduled for the hardening phase.
// ---------------------------------------------------------------------------

import { usePathname } from "next/navigation";
import { useAuthGate } from "@/hooks/useAdminAuth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

const SECTION_TITLES: { href: string; title: string }[] = [
  { href: "/admin/banks", title: "Banks" },
  { href: "/admin/templates", title: "Cheque Templates" },
  { href: "/admin/calibration", title: "Calibration" },
  { href: "/admin", title: "Dashboard" },
];

/** Longest matching section wins, so /admin/templates/[id] reads "Cheque Templates". */
function sectionTitle(pathname: string): string {
  const match = SECTION_TITLES.filter((s) => pathname === s.href || pathname.startsWith(`${s.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match?.title ?? "Admin";
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { authed, loading, logout } = useAuthGate();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="panel" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-muted)" }}>
          {authed ? "Signed out - redirecting to sign-in..." : "Loading admin..."}
        </span>
      </div>
    );
  }

  return (
    <div className="no-print">
      <div className="panel" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/admin" style={{ fontWeight: 800, color: "var(--brand-blue)", textDecoration: "none" }}>Admin</Link>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>|</span>
          <h1 style={{ fontSize: "1.12rem", margin: 0 }}>{sectionTitle(pathname)}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
          <LanguageToggle />
          <button
            type="button"
            className="button secondary small"
            onClick={logout}
            style={{ fontSize: "0.85rem" }}
          >
            Sign Out
          </button>
        </div>
      </div>
      <nav style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/admin" className="text-button">Dashboard</Link>
        <Link href="/admin/banks" className="text-button">Banks</Link>
        <Link href="/admin/templates" className="text-button">Cheque Templates</Link>
        <Link href="/admin/calibration" className="text-button">Calibration</Link>
        <Link href="/banks" className="text-button">Public catalogue</Link>
      </nav>
      {children}
    </div>
  );
}
