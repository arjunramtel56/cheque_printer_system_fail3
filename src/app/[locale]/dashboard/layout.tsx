import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { siteConfig } from "@/lib/config";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getFreshAccess } from "@/lib/access";

export default async function DashboardLayout({
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

  if (access?.trialExpired) {
    const pathname = headers().get("x-pathname") ?? "";
    const subscriptionPath = `/${locale}/dashboard/subscription`;

    if (!pathname.startsWith(subscriptionPath)) {
      redirect(`${subscriptionPath}?error=trial_expired`);
    }
  }

  const role = access?.role ?? (user?.role as string);
  const t = await getTranslations({ locale, namespace: "dashboard_ui" });

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const getRoleBadge = () => {
    switch (role) {
      case "TRIAL_USER":
        return {
          label: t("trialBadge"),
          className: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
        };
      case "SUPER_ADMIN":
        return {
          label: "SUPER ADMIN",
          className: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200",
        };
      case "ADMIN":
        return {
          label: "ADMIN",
          className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200",
        };
      default:
        return {
          label: t("paidBadge"),
          className: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200",
        };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-4">
          <img src={siteConfig.logo} alt={siteConfig.company} className="logo-image h-7 w-auto" />
          <div>
            <h1 className="text-lg font-semibold text-navy-700 dark:text-navy-200">
              {isAdmin ? t("adminPanel") : t("dashboard")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("welcomeHeader", { name: user.name ?? "" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageSwitcher />
          <span
            className={
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium " +
              roleBadge.className
            }
          >
            {roleBadge.label}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar role={user.role} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
