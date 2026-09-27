import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { siteConfig } from "@/lib/config";
import { getTranslations } from "next-intl/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/en/login");
  }

  const user = session.user as any;
  const t = await getTranslations("dashboard_ui");

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

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
                <h1 className="text-lg font-semibold">
                  {isAdmin ? t("adminPanel") : t("dashboard")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("welcomeHeader", { name: user.name ?? "" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {user.role === "TRIAL_USER" ? t("trialBadge") : user.role}
              </span>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
