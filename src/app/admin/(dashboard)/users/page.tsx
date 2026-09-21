"use client";

import Link from "next/link";
import { Trash2, UserCheck } from "lucide-react";

const users = [
  {
    id: "usr_001",
    fullName: "Ram Bahadur Karki",
    email: "ram.karki@example.com",
    role: "user",
    createdAt: "2026-09-21",
  },
  {
    id: "usr_002",
    fullName: "Sita Kumari Shrestha",
    email: "sita.shrestha@example.com",
    role: "user",
    createdAt: "2026-09-20",
  },
  {
    id: "usr_003",
    fullName: "Krishna Prasad",
    email: "krishna.prasad@example.com",
    role: "admin",
    createdAt: "2026-09-18",
  },
];

export default function AdminUsersPage() {
  return (
    <div style={{ display: "grid", gap: 20, maxWidth: "1000px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "1.12rem", color: "var(--text-primary)" }}>Users</h2>
        <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-muted)" }}>
          {users.length} registered users.
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Name
              </th>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Email
              </th>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Role
              </th>
              <th style={{ textAlign: "left", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Created
              </th>
              <th style={{ textAlign: "right", padding: 8, color: "var(--text-secondary)", fontSize: "0.74rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: 8, fontSize: "0.85rem" }}>{user.fullName}</td>
                <td style={{ padding: 8, fontSize: "0.82rem", color: "var(--text-muted)" }}>{user.email}</td>
                <td style={{ padding: 8, fontSize: "0.8rem" }}>
                  {user.role === "admin" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <UserCheck size={14} /> admin
                    </span>
                  ) : (
                    user.role
                  )}
                </td>
                <td style={{ padding: 8, fontSize: "0.78rem", color: "var(--text-muted)" }}>{user.createdAt}</td>
                <td style={{ padding: 8, textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-button"
                    style={{ fontSize: "0.76rem", marginRight: 8 }}
                  >
                    Edit
                  </Link>
                  <button type="button" className="text-button" style={{ fontSize: "0.76rem", color: "var(--danger)" }} title={`Delete ${user.email}`}>
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
