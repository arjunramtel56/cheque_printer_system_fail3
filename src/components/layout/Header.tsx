"use client";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  locale?: string;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="font-medium text-foreground">Welcome, {user?.name || "User"}</div>
      {user?.email && <div className="text-sm text-muted-foreground">{user.email}</div>}
    </header>
  );
}

export default Header;
