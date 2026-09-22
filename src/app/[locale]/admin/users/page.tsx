"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Shield, Eye, EyeOff, Trash2 } from "lucide-react";

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
      alert("Failed to update user");
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
      alert("Failed to update user");
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error) {
      alert("Failed to delete user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Users</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Plan</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
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
                            ? "bg-green-100 text-green-700"
                            : user.status === "SUSPENDED"
                            ? "bg-red-100 text-red-700"
                            : user.status === "EXPIRED"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.subscription ? (
                        <span className="text-sm">
                          {user.subscription.plan.name}
                          {user.subscription.isActive ? " (Active)" : " (Inactive)"}
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
                            title="Suspend user"
                          >
                            <EyeOff size={16} />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateUserStatus(user.id, "ACTIVE")}
                            title="Activate user"
                          >
                            <Eye size={16} />
                          </Button>
                        )}
                        {user.role !== "SUPER_ADMIN" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            title="Delete user"
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
