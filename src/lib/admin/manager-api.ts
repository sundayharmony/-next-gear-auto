/** DB fields for manager list/detail (includes password_hash for server-side mapping only). */
export const MANAGER_DB_SELECT =
  "id, name, email, phone, role, manager_access_enabled, manager_access_granted_at, manager_access_revoked_at, owner_portal_enabled, created_at, password_hash";

export interface ManagerPublic {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  manager_access_enabled: boolean;
  manager_access_granted_at: string | null;
  manager_access_revoked_at: string | null;
  owner_portal_enabled?: boolean | null;
  created_at?: string;
  /** True once the manager has set a password and can sign in. */
  account_activated: boolean;
  /** True when this manager also has owner portal access. */
  has_owner_access: boolean;
}

type ManagerDbRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  manager_access_enabled: boolean;
  manager_access_granted_at: string | null;
  manager_access_revoked_at: string | null;
  owner_portal_enabled?: boolean | null;
  created_at?: string;
  password_hash?: string | null;
};

export function toManagerPublic(row: ManagerDbRow): ManagerPublic {
  const { password_hash, owner_portal_enabled, ...rest } = row;
  return {
    ...rest,
    owner_portal_enabled,
    account_activated: Boolean(password_hash),
    has_owner_access: owner_portal_enabled === true,
  };
}

export function toManagerPublicList(rows: ManagerDbRow[] | null | undefined): ManagerPublic[] {
  return (rows || []).map(toManagerPublic);
}
