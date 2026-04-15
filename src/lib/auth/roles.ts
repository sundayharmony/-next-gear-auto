export const APP_ROLES = ["admin", "manager", "customer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: AppRole): boolean {
  return role === "admin" || role === "manager";
}

export function isAdminRole(role: AppRole): boolean {
  return role === "admin";
}

export function isManagerRole(role: AppRole): boolean {
  return role === "manager";
}
