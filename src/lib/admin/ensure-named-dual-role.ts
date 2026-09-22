import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";

/** Account the product owner asked to grant manager and owner access. */
export const NAMED_DUAL_ROLE_EMAIL = "maccesar.inc@gmail.com";

const ACCOUNT_SELECT =
  "id, role, manager_access_enabled, manager_access_granted_at, manager_access_revoked_at, owner_portal_enabled";

export type NamedDualRoleRow = {
  id: string;
  role: string | null;
  manager_access_enabled: boolean | null;
  manager_access_granted_at: string | null;
  manager_access_revoked_at: string | null;
  owner_portal_enabled?: boolean | null;
};

export type NamedDualRoleResult = {
  ok: boolean;
  found: boolean;
  updated: boolean;
  role: string | null;
  managerAccessEnabled: boolean | null;
  ownerPortalEnabled: boolean | null;
  vehicleCount: number | null;
  needsOwnerPortalColumn: boolean;
  message: string;
};

export function namedDualRolePatch(row: NamedDualRoleRow, nowIso: string) {
  return {
    role: "manager" as const,
    manager_access_enabled: true,
    manager_access_granted_at: row.manager_access_granted_at ?? nowIso,
    manager_access_revoked_at: null,
    owner_portal_enabled: true,
  };
}

export function namedDualRoleAlreadyApplied(row: NamedDualRoleRow): boolean {
  return (
    row.role === "manager" &&
    row.manager_access_enabled !== false &&
    row.manager_access_revoked_at == null &&
    row.owner_portal_enabled === true
  );
}

type QueryError = { code?: string; message?: string } | null;

type QueryResult<T> = { data: T; error: QueryError; count?: number | null };

/**
 * Minimal query surface so the grant can be tested without a live database.
 * Matches the supabase-js chain used below.
 */
export type DualRoleDb = {
  from(table: string): {
    select(columns: string, options?: { count?: "exact"; head?: boolean }): {
      ilike(column: string, value: string): {
        limit(n: number): PromiseLike<QueryResult<NamedDualRoleRow[] | null>>;
      };
      eq(column: string, value: string): PromiseLike<QueryResult<null>>;
    };
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<QueryResult<null>>;
    };
  };
};

function resultBase(partial: Partial<NamedDualRoleResult>): NamedDualRoleResult {
  return {
    ok: false,
    found: false,
    updated: false,
    role: null,
    managerAccessEnabled: null,
    ownerPortalEnabled: null,
    vehicleCount: null,
    needsOwnerPortalColumn: false,
    message: "",
    ...partial,
  };
}

async function countVehicles(db: DualRoleDb, ownerId: string): Promise<number | null> {
  const { count, error } = await db
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);
  if (error) return null;
  return count ?? 0;
}

/**
 * Grant manager panel access and owner portal access to the named account.
 * Idempotent. Does not create an account that does not already exist.
 */
export async function ensureNamedDualRole(
  db: DualRoleDb,
  email: string = NAMED_DUAL_ROLE_EMAIL,
  now: Date = new Date()
): Promise<NamedDualRoleResult> {
  const loaded = await db.from("customers").select(ACCOUNT_SELECT).ilike("email", email).limit(2);

  if (loaded.error) {
    if (isMissingColumnError(loaded.error)) {
      return resultBase({
        needsOwnerPortalColumn: true,
        message: "owner_portal_enabled column is missing on customers",
      });
    }
    return resultBase({ message: "Failed to load account" });
  }

  const rows = loaded.data ?? [];
  if (rows.length === 0) {
    return resultBase({ message: "No customer with that email" });
  }
  if (rows.length > 1) {
    return resultBase({ found: true, message: "More than one customer matches that email" });
  }

  const row = rows[0];
  const vehicleCount = await countVehicles(db, row.id);

  if (namedDualRoleAlreadyApplied(row)) {
    return resultBase({
      ok: true,
      found: true,
      updated: false,
      role: row.role,
      managerAccessEnabled: row.manager_access_enabled,
      ownerPortalEnabled: row.owner_portal_enabled ?? null,
      vehicleCount,
      message: "Already a manager with owner portal access",
    });
  }

  const patch = namedDualRolePatch(row, now.toISOString());
  const updated = await db.from("customers").update(patch).eq("id", row.id);
  if (updated.error) {
    if (isMissingColumnError(updated.error)) {
      return resultBase({
        found: true,
        needsOwnerPortalColumn: true,
        role: row.role,
        managerAccessEnabled: row.manager_access_enabled,
        ownerPortalEnabled: row.owner_portal_enabled ?? null,
        vehicleCount,
        message: "owner_portal_enabled column is missing on customers",
      });
    }
    return resultBase({
      found: true,
      role: row.role,
      managerAccessEnabled: row.manager_access_enabled,
      ownerPortalEnabled: row.owner_portal_enabled ?? null,
      vehicleCount,
      message: "Failed to update account",
    });
  }

  return resultBase({
    ok: true,
    found: true,
    updated: true,
    role: "manager",
    managerAccessEnabled: true,
    ownerPortalEnabled: true,
    vehicleCount,
    message: "Manager and owner access granted",
  });
}

/** Adapter so route handlers can pass the service client. */
export function asDualRoleDb(client: SupabaseClient): DualRoleDb {
  return client as unknown as DualRoleDb;
}
