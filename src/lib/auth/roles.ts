export const APP_ROLES = ["admin", "manager", "customer", "owner"] as const;

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

/** Vehicle owner (arbitrage panel) — not staff, scoped to their own vehicles. */
export function isOwnerRole(role: AppRole): boolean {
  return role === "owner";
}

type TokenRoleFields = { role?: unknown; roles?: unknown };

/** Roles encoded on the JWT (falls back to single `role` for older tokens). */
export function getTokenRoles(payload: TokenRoleFields | null | undefined): AppRole[] {
  if (!payload) return [];
  if (Array.isArray(payload.roles) && payload.roles.length > 0) {
    return payload.roles.filter(isAppRole);
  }
  return isAppRole(payload.role) ? [payload.role] : [];
}

export function tokenHasRole(payload: TokenRoleFields | null | undefined, role: AppRole): boolean {
  return getTokenRoles(payload).includes(role);
}

export function tokenHasStaffAccess(payload: TokenRoleFields | null | undefined): boolean {
  const roles = getTokenRoles(payload);
  return roles.includes("admin") || roles.includes("manager");
}

export function tokenHasOwnerAccess(payload: TokenRoleFields | null | undefined): boolean {
  return tokenHasRole(payload, "owner");
}

/** Staff role for scoped API behavior (admin wins over manager). */
export function getTokenStaffRole(
  payload: TokenRoleFields | null | undefined,
): Extract<AppRole, "admin" | "manager"> | null {
  const roles = getTokenRoles(payload);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  return null;
}

/** JWT / DB role string is staff (admin or manager). @deprecated Prefer tokenHasStaffAccess */
export function isStaffJwtRole(role: unknown): role is Extract<AppRole, "admin" | "manager"> {
  return isAppRole(role) && isStaffRole(role);
}
