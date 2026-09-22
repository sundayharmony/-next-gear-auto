import type { SupabaseClient } from "@supabase/supabase-js";
import { hasOwnerPortalAccess } from "@/lib/auth/customer-capabilities";
import { isAppRole, isManagerRole, isOwnerRole, type AppRole } from "@/lib/auth/roles";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";

export const DUAL_ROLE_MIGRATION_HINT =
  "Manager + owner dual access requires a database update. In Supabase SQL Editor, run supabase-dual-role-capabilities.sql, then try again.";

type CustomerRow = {
  id: string;
  role: string;
  owner_portal_enabled?: boolean | null;
};

export type GrantOwnerPortalResult =
  | { ok: true; alreadyHadAccess: boolean; dualRole: boolean }
  | { ok: false; message: string; status: number };

/**
 * Grant owner portal access to an existing customer or manager.
 * Managers keep their manager role and gain owner access via owner_portal_enabled.
 */
export async function grantOwnerPortalAccess(
  supabase: SupabaseClient,
  customerId: string
): Promise<GrantOwnerPortalResult> {
  const { data: existing, error: loadError } = await supabase
    .from("customers")
    .select("id, role, owner_portal_enabled")
    .eq("id", customerId)
    .maybeSingle();

  if (loadError) {
    if (isMissingColumnError(loadError)) {
      return { ok: false, message: DUAL_ROLE_MIGRATION_HINT, status: 400 };
    }
    return { ok: false, message: "Failed to load account", status: 500 };
  }

  if (!existing) {
    return { ok: false, message: "Account not found", status: 404 };
  }

  const row = existing as CustomerRow;
  const role = isAppRole(row.role) ? row.role : ("customer" as AppRole);
  if (hasOwnerPortalAccess(row)) {
    return { ok: true, alreadyHadAccess: true, dualRole: isManagerRole(role) };
  }

  const updates: Record<string, unknown> = { owner_portal_enabled: true };
  if (!isManagerRole(role) && !isOwnerRole(role)) {
    updates.role = "owner";
  }

  const { error } = await supabase.from("customers").update(updates).eq("id", customerId);
  if (error) {
    if (isMissingColumnError(error)) {
      return { ok: false, message: DUAL_ROLE_MIGRATION_HINT, status: 400 };
    }
    return { ok: false, message: "Failed to grant owner access", status: 500 };
  }

  return { ok: true, alreadyHadAccess: false, dualRole: isManagerRole(role) };
}

export function grantOwnerPortalSuccessMessage(result: {
  alreadyHadAccess: boolean;
  dualRole: boolean;
}): string {
  if (result.alreadyHadAccess) {
    return result.dualRole
      ? "This manager already has owner portal access."
      : "This account already has owner portal access.";
  }
  return result.dualRole
    ? "Owner access granted. This manager can use both the manager and owner panels."
    : "Owner access granted.";
}
