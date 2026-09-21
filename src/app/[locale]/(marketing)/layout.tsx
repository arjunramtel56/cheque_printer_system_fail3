import Link from "next/link";
import { siteConfig } from "@/lib/config";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/en" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">RCPS</span>
            <span className="hidden text-sm font-medium sm:inline-block">
              {siteConfig.name}
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {siteConfig.navItems.map((item) => (
              <Link
                key={item.href}
                href={`/en${item.href}`}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="ml-2 flex items-center gap-2">
              <Link
                href="/en/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                Login
              </Link>
              <Link
                href="/en/register"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <p className="text-sm font-medium">{siteConfig.name}</p>
              <p className="text-xs text-muted-foreground">
                {siteConfig.company}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {siteConfig.company}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
