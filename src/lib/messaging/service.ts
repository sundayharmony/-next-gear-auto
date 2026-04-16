import { logger } from "@/lib/utils/logger";

export type StaffRole = "admin" | "manager";

export interface StaffIdentity {
  id: string;
  role: StaffRole;
  name: string;
  email: string;
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
