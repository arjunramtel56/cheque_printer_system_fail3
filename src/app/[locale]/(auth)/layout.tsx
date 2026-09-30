import { siteConfig } from "@/lib/config";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

/**
 * Minimal professional authentication layout.
 *
 * Auth pages (login, register, forgot/reset password) intentionally do NOT
 * render the full public landing-page navigation — duplicated headers and
 * competing links have no place in an authentication flow. Each page's card
 * still carries the product logo; this shell adds only:
 *  - a slim brand bar: "back to site" link top-left, theme/language controls top-right
 *  - the centered page content
 *  - a one-line footer
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">{children}</main>

      <footer className="pb-6 text-center text-xs text-muted-foreground">
        {siteConfig.company}
      </footer>
    </div>
  );
}
