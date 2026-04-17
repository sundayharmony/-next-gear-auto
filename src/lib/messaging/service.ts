import { logger } from "@/lib/utils/logger";

export type StaffRole = "admin" | "manager";

export interface StaffIdentity {
  id: string;
  role: StaffRole;
  name: string;
  email: string;
}

/** Lexicographic pair key for DM uniqueness (matches Postgres text `min`/`max` on user ids). */
export function orderedDmPair(userIdA: string, userIdB: string): [string, string] {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

export function staffIdentityKey(role: StaffRole, userId: string): string {
  return `${role}:${userId}`;
}

export function formatStaffDisplayName(identity: StaffIdentity): string {
  const n = (identity.name || "").trim();
  if (n) return n;
  const e = (identity.email || "").trim();
  if (e) return e;
  return identity.id;
}

/** Batch-load staff directory rows for titling (one query per role bucket). */
export async function batchResolveStaffIdentities(
  supabase: any,
  members: Array<{ userId: string; role: StaffRole }>
): Promise<Map<string, StaffIdentity>> {
  const byKey = new Map<string, StaffIdentity>();
  const seen = new Set<string>();
  const unique: Array<{ userId: string; role: StaffRole }> = [];
  for (const m of members) {
    const k = staffIdentityKey(m.role, m.userId);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(m);
  }
  const adminIds = [...new Set(unique.filter((p) => p.role === "admin").map((p) => p.userId))];
  const managerIds = [...new Set(unique.filter((p) => p.role === "manager").map((p) => p.userId))];

  if (adminIds.length > 0) {
    const { data, error } = await supabase.from("admins").select("id, name, email").in("id", adminIds);
    if (error) {
      logger.error("batchResolveStaffIdentities admins", error);
    } else {
      for (const row of data || []) {
        const id = row.id as string;
        byKey.set(staffIdentityKey("admin", id), {
          id,
          role: "admin",
          name: row.name || "Admin",
          email: row.email || "",
        });
      }
    }
  }

  if (managerIds.length > 0) {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, email, role")
      .in("id", managerIds)
      .eq("role", "manager");
    if (error) {
      logger.error("batchResolveStaffIdentities managers", error);
    } else {
      for (const row of data || []) {
        const id = row.id as string;
        byKey.set(staffIdentityKey("manager", id), {
          id,
          role: "manager",
          name: row.name || "Manager",
          email: row.email || "",
        });
      }
    }
  }

  return byKey;
}

export interface ThreadMemberRow {
  thread_id: string;
  user_id: string;
  role: StaffRole;
  status: "active" | "left" | "removed";
  last_read_at: string | null;
  muted: boolean;
}

export function normalizeMessageBody(raw: unknown, maxLen = 4000): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;
  if (normalized.length > maxLen) return null;
  return normalized;
}

export function normalizeThreadTitle(raw: unknown, maxLen = 120): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.trim();
  if (!title || title.length > maxLen) return null;
  return title;
}

export async function resolveStaffIdentity(
  supabase: any,
  userId: string,
  role: StaffRole
): Promise<StaffIdentity | null> {
  if (role === "admin") {
    const { data, error } = await supabase
      .from("admins")
      .select("id, name, email")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      role,
      name: data.name || "Admin",
      email: data.email || "",
    };
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, role")
    .eq("id", userId)
    .eq("role", "manager")
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    role,
    name: data.name || "Manager",
    email: data.email || "",
  };
}

export async function requireActiveMembership(
  supabase: any,
  threadId: string,
  userId: string
): Promise<ThreadMemberRow | null> {
  const { data, error } = await supabase
    .from("message_thread_members")
    .select("thread_id, user_id, role, status, last_read_at, muted")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    logger.error("Membership check failed", error);
    return null;
  }
  return data || null;
}

export function nextBackoffMinutes(attempts: number): number {
  if (attempts <= 1) return 1;
  if (attempts <= 2) return 3;
  if (attempts <= 3) return 10;
  return 30;
}
