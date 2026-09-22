import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/en/login");
  }

  const user = session.user as any;

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    redirect("/en/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar role={user.role} />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-14 items-center border-b px-6">
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {user.name}
              </p>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
