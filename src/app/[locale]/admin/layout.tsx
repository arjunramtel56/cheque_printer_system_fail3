import Image from "next/image";
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
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-3 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Image
            src={siteConfig.logo}
            alt={siteConfig.company}
            width={120}
            height={32}
            className="logo-image h-6 w-auto shrink-0 sm:h-7"
            unoptimized
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-navy-700 dark:text-navy-200 sm:text-lg">
              {t("adminPanel")}
            </h1>
            <p className="hidden truncate text-sm text-muted-foreground sm:block">
              {t("welcomeHeader", { name: user.name ?? "" })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <LanguageSwitcher />
          <span className="hidden items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-950/60 dark:text-purple-200 sm:inline-flex">
            ADMIN
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar role={role} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 pb-24 sm:p-6 sm:pb-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
