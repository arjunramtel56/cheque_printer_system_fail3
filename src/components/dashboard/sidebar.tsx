"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const menuItems = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "createCheque",
    href: "/dashboard/cheques/new",
    icon: FilePlus2,
  },
  {
    key: "chequeHistory",
    href: "/dashboard/cheques",
    icon: FileText,
  },
  {
    key: "settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

const menuLabels: Record<string, { en: string; ne: string }> = {
  dashboard: { en: "Dashboard", ne: "ड्यासबोर्ड" },
  createCheque: { en: "New Cheque", ne: "नयाँ चेक" },
  chequeHistory: { en: "History", ne: "इतिहास" },
  settings: { en: "Settings", ne: "सेटिङ" },
};

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useUserRole();

  return (
    <aside
      className="hidden min-h-screen w-[230px] flex-col lg:flex"
      style={{
        background: "var(--nav)",
        color: "var(--nav-text)",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          fontSize: "20px",
          fontWeight: "bold",
          marginBottom: 35,
          color: "#fff",
        }}
      >
        ChequePrint
      </div>

      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const label = menuLabels[item.key];

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: isActive ? "#fff" : "var(--nav-text-dim)",
                textDecoration: "none",
                padding: "13px 14px",
                borderRadius: 8,
                marginBottom: 8,
                fontSize: "14px",
                fontWeight: isActive ? 600 : 400,
                background: isActive ? "var(--brand-blue)" : "transparent",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              <Icon size={18} />
              <span>
                <span className="block">{label.en}</span>
                <span
                  style={{
                    fontSize: "11px",
                    opacity: 0.7,
                  }}
                >
                  {label.ne}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12 }}>
        <button
          type="button"
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            color: "#f87171",
            background: "none",
            border: "none",
            padding: "13px 14px",
            borderRadius: 8,
            fontSize: "14px",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
