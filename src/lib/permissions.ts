export type Role = "user" | "admin" | "superadmin";

export interface Permission {
  action: string;
  resource: string;
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [
    { action: "read", resource: "cheque" },
    { action: "create", resource: "cheque" },
    { action: "update", resource: "cheque" },
    { action: "delete", resource: "cheque" },
  ],
  admin: [
    { action: "read", resource: "cheque" },
    { action: "create", resource: "cheque" },
    { action: "update", resource: "cheque" },
    { action: "delete", resource: "cheque" },
    { action: "read", resource: "user" },
    { action: "update", resource: "user" },
    { action: "read", resource: "template" },
    { action: "update", resource: "template" },
    { action: "read", resource: "bank" },
    { action: "update", resource: "bank" },
  ],
  superadmin: [
    { action: "read", resource: "cheque" },
    { action: "create", resource: "cheque" },
    { action: "update", resource: "cheque" },
    { action: "delete", resource: "cheque" },
    { action: "read", resource: "user" },
    { action: "create", resource: "user" },
    { action: "update", resource: "user" },
    { action: "delete", resource: "user" },
    { action: "read", resource: "template" },
    { action: "create", resource: "template" },
    { action: "update", resource: "template" },
    { action: "delete", resource: "template" },
    { action: "read", resource: "bank" },
    { action: "create", resource: "bank" },
    { action: "update", resource: "bank" },
    { action: "delete", resource: "bank" },
    { action: "read", resource: "settings" },
    { action: "update", resource: "settings" },
  ],
};

export function hasPermission(role: Role, action: string, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.some((p) => p.action === action && p.resource === resource);
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
