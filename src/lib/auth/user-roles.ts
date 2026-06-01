import type { Customer } from "@/lib/types";
import { isAppRole, type AppRole } from "@/lib/auth/roles";

/** Effective roles for a logged-in customer (JWT/session payload). */
export function getUserRoles(user: Pick<Customer, "role" | "roles"> | null | undefined): AppRole[] {
  if (!user) return [];
  if (user.roles?.length) {
    return user.roles.filter(isAppRole);
  }
  return isAppRole(user.role) ? [user.role] : [];
}

export function userHasRole(
  user: Pick<Customer, "role" | "roles"> | null | undefined,
  role: AppRole,
): boolean {
  return getUserRoles(user).includes(role);
}
