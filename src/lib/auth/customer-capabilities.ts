import type { AppRole } from "@/lib/auth/roles";
import { isAppRole, isManagerRole, isOwnerRole } from "@/lib/auth/roles";
import { isManagerPanelAccessEnabled, type ManagerAccessRow } from "@/lib/auth/manager-access";

export type CustomerCapabilitiesRow = ManagerAccessRow & {
  owner_portal_enabled?: boolean | null;
};

/** Owner portal access via primary role or explicit flag (dual manager+owner). */
export function hasOwnerPortalAccess(row: CustomerCapabilitiesRow | null | undefined): boolean {
  if (!row?.role) return false;
  const role = row.role as AppRole;
  if (!isAppRole(role)) return false;
  if (isOwnerRole(role)) return true;
  return row.owner_portal_enabled === true;
}

/** Manager panel access via manager role or owner row with manager_access_enabled. */
export function hasManagerPortalAccess(row: CustomerCapabilitiesRow | null | undefined): boolean {
  if (!row?.role) return false;
  const role = row.role as AppRole;
  if (!isAppRole(role)) return false;
  if (isManagerRole(role)) return isManagerPanelAccessEnabled(row);
  if (isOwnerRole(role) && row.manager_access_enabled === true) {
    return true;
  }
  return false;
}

/** Effective portal roles for JWT and UI (union of capabilities). */
export function resolveCustomerRoles(row: CustomerCapabilitiesRow | null | undefined): AppRole[] {
  if (!row?.role || !isAppRole(row.role)) return ["customer"];

  const roles = new Set<AppRole>();
  if (hasManagerPortalAccess(row)) roles.add("manager");
  if (hasOwnerPortalAccess(row)) roles.add("owner");

  const primary = row.role as AppRole;
  if (roles.size === 0 && primary === "customer") roles.add("customer");

  return Array.from(roles);
}

/** JWT `role` field: highest-precedence portal role for backward compatibility. */
export function pickPrimaryJwtRole(roles: AppRole[]): AppRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("owner")) return "owner";
  return "customer";
}

export const CUSTOMER_CAPABILITIES_SELECT =
  "role, manager_access_enabled, owner_portal_enabled";
