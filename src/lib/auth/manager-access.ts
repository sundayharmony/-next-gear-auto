import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/auth/roles";
import { isAppRole, isManagerRole } from "@/lib/auth/roles";

/** Row shape from customers table for manager gate checks */
export type ManagerAccessRow = {
  role?: string | null;
  manager_access_enabled?: boolean | null;
};

/**
 * Managers must have panel access enabled in DB. Undefined/null treats as enabled
 * for backward compatibility (schemas before manager_access_enabled).
 * Non-manager rows: returns true (no manager gate).
 */
export function isManagerPanelAccessEnabled(row: ManagerAccessRow | null | undefined): boolean {
  if (!row?.role) return true;
  const role = row.role as AppRole;
  if (!isAppRole(role) || !isManagerRole(role)) return true;
  return row.manager_access_enabled !== false;
}

export async function fetchCustomerManagerAccessRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<ManagerAccessRow | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("role, manager_access_enabled, owner_portal_enabled")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data;
}
