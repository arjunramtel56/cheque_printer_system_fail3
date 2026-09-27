import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { siteConfig } from "@/lib/config";
import { getTranslations } from "next-intl/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/en/login");
  }

  const user = session.user as any;
  const t = await getTranslations("dashboard_ui");

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar role={user.role} />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-14 items-center border-b px-6">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={siteConfig.logo}
                alt={siteConfig.company}
                className="logo-image h-7 w-auto"
              />
              <div>
                <h1 className="text-lg font-semibold">{t("adminPanel")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("welcomeHeader", { name: user.name ?? "" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-950/60 dark:text-purple-200">
                ADMIN
              </span>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
