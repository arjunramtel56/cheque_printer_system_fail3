"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Search, Eye, EyeOff, Trash2, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/providers/toast-provider";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  company?: string;
  createdAt: string;
  subscription?: {
    plan: { name: string; chequeLimit: number };
    endDate: string;
    isActive: boolean;
  } | null;
}

type SortField = "name" | "email" | "createdAt";
type SortDir = "asc" | "desc";

export default function AdminUsersPage() {
  const t = useTranslations("admin_users");
  const locale = useLocale() as "en" | "ne";
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUsers() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(locale === "ne" ? "प्रयोगकर्ता लोड गर्न सकिएन।" : "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateUserStatus(userId: string, newStatus: string) {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const verb =
      newStatus === "SUSPENDED"
        ? locale === "ne"
          ? `के तपाईं ${target.name} लाई निलम्बन गर्न चाहनुहुन्छ?`
          : `Suspend ${target.name}?`
        : locale === "ne"
          ? `के तपाईं ${target.name} लाई पुनः सक्रिय गर्न चाहनुहुन्छ?`
          : `Re-activate ${target.name}?`;
    if (!window.confirm(verb)) return;

    setBusyId(userId);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, status: newStatus }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "failed");
      setUsers((prev) => prev.map((u) => (u.id === data.id ? { ...u, ...data } : u)));
      showToast(
        newStatus === "SUSPENDED"
          ? locale === "ne"
            ? "खाता निलम्बित भयो।"
            : "Account suspended."
          : locale === "ne"
            ? "खाता सक्रिय भयो।"
            : "Account activated.",
        "success"
      );
    } catch (err: any) {
      showToast(err?.message || t("updateError"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(userId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusyId(userId);
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "failed");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(locale === "ne" ? "प्रयोगकर्ता मेटियो।" : "User deleted.", "success");
    } catch (err: any) {
      showToast(err?.message || t("deleteError"), "error");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.company ?? "").toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "createdAt") {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
      return String(a[sortField]).localeCompare(String(b[sortField])) * dir;
    });
    return list;
  }, [users, search, roleFilter, statusFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const roleOptions = ["USER", "TRIAL_USER", "ADMIN", "SUPER_ADMIN"];
  const statusOptions = ["ACTIVE", "SUSPENDED", "EXPIRED"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? "mr-2 animate-spin" : "mr-2"} />
          {locale === "ne" ? "रिफ्रेस" : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label htmlFor="userSearch">{locale === "ne" ? "खोज्नुहोस्" : "Search"}</Label>
              <div className="relative mt-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="userSearch"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={locale === "ne" ? "नाम/इमेल/कम्पनी…" : "Name, email or company…"}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="roleFilter">{t("role")}</Label>
              <select
                id="roleFilter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{locale === "ne" ? "सबै" : "All"}</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="statusFilter">{t("status")}</Label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{locale === "ne" ? "सबै" : "All"}</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end text-sm text-muted-foreground">
              {filtered.length} / {users.length}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("allUsers")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              {locale === "ne" ? "लोड हुँदै…" : "Loading…"}
            </div>
          ) : loadError ? (
            <div className="py-12 text-center">
              <p className="text-destructive">{loadError}</p>
              <Button variant="outline" className="mt-3" onClick={fetchUsers}>
                {locale === "ne" ? "फेरि प्रयास" : "Retry"}
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">
                {locale === "ne" ? "कुनै प्रयोगकर्ता भेटिएन।" : "No users match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-medium"
                      onClick={() => toggleSort("name")}
                    >
                      {t("name")}
                      {sortField === "name" && (sortDir === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-medium"
                      onClick={() => toggleSort("email")}
                    >
                      {t("email")}
                      {sortField === "email" && (sortDir === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">{t("role")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("status")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("plan")}</th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-medium"
                      onClick={() => toggleSort("createdAt")}
                    >
                      {locale === "ne" ? "दर्ता मिति" : "Registered"}
                      {sortField === "createdAt" && (sortDir === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th className="px-4 py-3 text-center font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="px-4 py-3 font-medium">
                        {user.name}
                        {user.company && (
                          <p className="text-xs text-muted-foreground">{user.company}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200"
                              : user.role === "ADMIN"
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200"
                                : user.role === "TRIAL_USER"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                            user.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200"
                              : user.status === "SUSPENDED"
                                ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200"
                                : user.status === "EXPIRED"
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.subscription ? (
                          <span className="text-sm">
                            {user.subscription.plan.name}
                            {user.subscription.isActive
                              ? ` (${t("active")})`
                              : ` (${t("inactive")})`}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString(
                          locale === "ne" ? "ne-NP" : "en-GB",
                          { year: "numeric", month: "short", day: "numeric" }
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {user.status === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === user.id}
                              onClick={() => updateUserStatus(user.id, "SUSPENDED")}
                              title={t("suspendUser")}
                            >
                              <EyeOff size={16} />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === user.id}
                              onClick={() => updateUserStatus(user.id, "ACTIVE")}
                              title={t("activateUser")}
                            >
                              <Eye size={16} />
                            </Button>
                          )}
                          {user.role !== "SUPER_ADMIN" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === user.id}
                              onClick={() => handleDelete(user.id)}
                              title={t("deleteUser")}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
