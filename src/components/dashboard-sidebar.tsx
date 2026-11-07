"use client";
import Image from "next/image";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import {
  LayoutDashboard,
  Printer,
  FileText,
  LayoutTemplate,
  Clock,
  Users,
  Settings,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  BarChart3,
  Bot,
  User,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Printer,
  FileText,
  LayoutTemplate,
  Clock,
  Users,
  Settings,
  CreditCard,
  Building2,
  BarChart3,
  Bot,
  User,
};

interface DashboardSidebarProps {
  role: string;
}

export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const locale = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems =
    role === "ADMIN" || role === "SUPER_ADMIN"
      ? siteConfig.adminNavItems
      : siteConfig.dashboardNavItems;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1 overflow-y-auto p-2">
      {navItems.map((item) => {
        const Icon = iconMap[item.icon] || LayoutDashboard;
        const href = `/${locale}${item.href}`;
        const isActive = pathname === href;
        return (
          <Link
            key={item.href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              collapsed && !onNavigate && "justify-center px-2"
            )}
            title={collapsed && !onNavigate ? t(item.labelKey) : undefined}
          >
            <Icon size={18} className={cn(isActive ? "" : "text-navy-400")} />
            {(!collapsed || onNavigate) && <span>{t(item.labelKey)}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const logout = (onNavigate?: () => void) => {
    onNavigate?.();
    signOut({ callbackUrl: `/${locale}/login` });
  };

  return (
    <>
      <aside
        className={cn(
          "hidden h-full flex-col border-r bg-card transition-all duration-300 md:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!collapsed && (
            <Image
              src={siteConfig.logo}
              alt={siteConfig.company}
              width={120}
              height={32}
              className="logo-image h-8 w-auto"
              unoptimized
            />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {renderNav()}

        <div className="border-t p-2">
          <button
            onClick={() => logout()}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? t("logout") : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>{t("logout")}</span>}
          </button>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        aria-controls="dashboard-mobile-nav"
      >
        <Menu size={22} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          id="dashboard-mobile-nav"
        >
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            tabIndex={-1}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <Image
                src={siteConfig.logo}
                alt={siteConfig.company}
                width={120}
                height={32}
                className="logo-image h-8 w-auto"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            {renderNav(() => setMobileOpen(false))}

            <div className="border-t p-2">
              <button
                onClick={() => logout(() => setMobileOpen(false))}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <LogOut size={18} />
                <span>{t("logout")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
