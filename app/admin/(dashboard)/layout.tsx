"use client";

// ---------------------------------------------------------------------------
// Gate + chrome for the protected admin area.
//
// This layout lives in the (dashboard) route group, so it applies to
// /admin, /admin/banks, /admin/templates(/\*) and /admin/calibration - but NOT
// to /admin/login. That separation is the point: when the gate lived at
// app/admin/layout.tsx it also wrapped the login page, returned null while
// unauthenticated, and made the whole admin panel unreachable (the sign-in
// form could never render). See tests/admin-access.test.mjs.
//
// Authentication is a client-side demo gate (see lib/admin.ts). It is not
// security - the README says so plainly, and server-side authorization is
// scheduled for the hardening phase.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAdminAuthenticated, adminLogout } from "@/lib/admin";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

const LOGIN_ROUTE = "/admin/login";

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
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // The gate checks isAdminAuthenticated() and redirects signed-out visitors
    // to the sign-in route (router.replace(LOGIN_ROUTE)).
    const ok = isAdminAuthenticated();
    setAuthed(ok);
    setChecked(true);
    if (!ok) router.replace(LOGIN_ROUTE);
  }, [router]);

  // Never render an empty screen: the checking and unauthenticated states are
  // both visible, so a broken gate can never look like a blank page again.
  if (!checked || !authed) {
    return (
      <div className="panel" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-muted)" }}>
          {checked ? "Signed out - redirecting to sign-in..." : "Loading admin..."}
        </span>
      </div>
    );
  }

  return (
    <div className="no-print">
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/admin" style={{ fontWeight: 800, color: "var(--brand-blue)", textDecoration: "none", fontSize: "1.1rem" }}>
            Admin Panel
          </Link>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>|</span>
          <h1 style={{ fontSize: "1.12rem", margin: 0, color: "var(--text-primary)" }}>{sectionTitle(pathname)}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
          <LanguageToggle />
          <button
            type="button"
            className="button secondary small"
            onClick={() => {
              adminLogout();
              setAuthed(false);
              router.replace(LOGIN_ROUTE);
            }}
            style={{ fontSize: "0.85rem" }}
          >
            Sign Out
          </button>
        </div>
      </div>
      <nav style={{ marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
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
