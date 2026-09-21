"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Settings,
  LogOut,
  WalletCards,
  Printer,
  UserCircle,
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
    key: "bankTemplates",
    href: "/dashboard/banks",
    icon: WalletCards,
  },
  {
    key: "printSettings",
    href: "/dashboard/settings",
    icon: Printer,
  },
  {
    key: "userSettings",
    href: "/dashboard/profile",
    icon: UserCircle,
  },
];

const menuLabels: Record<string, { en: string; ne: string }> = {
  dashboard: { en: "1. Dashboard", ne: "ड्यासबोर्ड" },
  createCheque: { en: "2. Create Cheque", ne: "चेक बनाउनुहोस्" },
  chequeHistory: { en: "3. Cheque History", ne: "चेक इतिहास" },
  bankTemplates: { en: "4. Bank Templates", ne: "बैंक टेम्प्लेट" },
  printSettings: { en: "5. Print Settings", ne: "प्रिन्ट सेटिङ" },
  userSettings: { en: "6. User Settings", ne: "प्रयोगकर्ता सेटिङ" },
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
