import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { siteConfig } from "@/lib/config";
import { getTranslations } from "next-intl/server";
import { getFreshAccess } from "@/lib/access";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const user = session.user as any;

  const access = user?.id ? await getFreshAccess(user.id).catch(() => null) : null;

  if (access?.blocked) {
    redirect(`/${locale}/login?error=account_${access.blocked}`);
  }

  const role = access?.role ?? (user?.role as string);
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale, namespace: "dashboard_ui" });

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-4">
          <img src={siteConfig.logo} alt={siteConfig.company} className="logo-image h-7 w-auto" />
          <div>
            <h1 className="text-lg font-semibold text-navy-700 dark:text-navy-200">
              {t("adminPanel")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("welcomeHeader", { name: user.name ?? "" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageSwitcher />
          <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-950/60 dark:text-purple-200">
            ADMIN
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar role={role} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
