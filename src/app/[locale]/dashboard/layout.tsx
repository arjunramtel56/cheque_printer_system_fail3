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
    // Keep the visitor in the locale they were browsing, not always English.
    redirect(`/${locale}/login`);
  }

  const user = session.user as any;

  // Every panel access rule is evaluated against the database on each request
  // rather than against the claims sealed into the session cookie at sign-in,
  // which freeze for the life of the session. That is what lets a suspension, a
  // promotion to a paid account, or a trial that lapses mid-session take effect
  // immediately instead of at the next login.
  //
  // A failed read is not treated as a denial: the pages render their own error
  // state, and nobody should be locked out of the panel by a database outage.
  const access = user?.id ? await getFreshAccess(user.id).catch(() => null) : null;

  if (access?.blocked) {
    redirect(`/${locale}/login?error=account_${access.blocked}`);
  }

  if (access?.trialExpired) {
    // The renewal page lives under /dashboard, so it has to be exempt from the
    // redirect it would otherwise trigger on itself — otherwise it is
    // unreachable for exactly the users who need it. Middleware forwards the
    // path because a layout is never given it.
    const pathname = headers().get("x-pathname") ?? "";
    const subscriptionPath = `/${locale}/dashboard/subscription`;

    if (!pathname.startsWith(subscriptionPath)) {
      redirect(`${subscriptionPath}?error=trial_expired`);
    }
  }

  const role = access?.role ?? (user?.role as string);
  const t = await getTranslations({ locale, namespace: "dashboard_ui" });

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

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
              <ThemeToggle />
              <LanguageSwitcher />
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {role === "TRIAL_USER" ? t("trialBadge") : role}
              </span>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
