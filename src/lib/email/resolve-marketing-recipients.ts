import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidEmailFormat } from "@/lib/utils/validation";

const PAGE_SIZE = 200;

function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !isValidEmailFormat(trimmed)) return null;
  return trimmed;
}

export function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of emails) {
    const normalized = normalizeEmail(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export async function fetchAllClientEmails(supabase: SupabaseClient): Promise<string[]> {
  const emails: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("customers")
      .select("email, role")
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const role = (row.role as string | null) || "customer";
      if (role === "admin" || role === "manager") continue;
      if (row.email) emails.push(row.email);
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return dedupeEmails(emails);
}

export async function fetchEmailsByCustomerIds(
  supabase: SupabaseClient,
  customerIds: string[],
): Promise<string[]> {
  if (customerIds.length === 0) return [];

  const emails: string[] = [];
  const chunkSize = 100;

  for (let i = 0; i < customerIds.length; i += chunkSize) {
    const chunk = customerIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("customers")
      .select("email, role")
      .in("id", chunk);

    if (error) throw error;

    for (const row of data || []) {
      const role = (row.role as string | null) || "customer";
      if (role === "admin" || role === "manager") continue;
      if (row.email) emails.push(row.email);
    }
  }

  return dedupeEmails(emails);
}
