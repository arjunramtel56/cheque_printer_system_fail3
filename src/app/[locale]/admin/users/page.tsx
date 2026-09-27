"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Shield, Eye, EyeOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  };
}

export default function AdminUsersPage() {
  const t = useTranslations("admin_users");
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });

      if (!res.ok) throw new Error("Failed to update user");
      const updated = await res.json();
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
    } catch (error) {
      console.error("Error updating user:", error);
      showToast(t("updateError"), "error");
    }
  }

  async function updateUserStatus(userId: string, newStatus: string) {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update user");
      const updated = await res.json();
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
    } catch (error) {
      console.error("Error updating user:", error);
      showToast(t("updateError"), "error");
    }
  }

  async function handleDelete(userId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;

    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error) {
      showToast(t("deleteError"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("allUsers")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("email")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("role")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("plan")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.role}</td>
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
                          {user.subscription.isActive ? ` (${t("active")})` : ` (${t("inactive")})`}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {user.status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateUserStatus(user.id, "SUSPENDED")}
                            title={t("suspendUser")}
                          >
                            <EyeOff size={16} />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
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
        </CardContent>
      </Card>
    </div>
  );
}
