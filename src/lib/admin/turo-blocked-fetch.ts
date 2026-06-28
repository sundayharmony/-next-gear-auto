import { getTuroDriverFromReason } from "@/lib/utils/turo-blocked-date";
import { TURO_BLOCKED_SOURCE, isBlockedDateCancelled } from "@/lib/utils/blocked-dates";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceSupabase = any;

const TURO_OCCUPANCY_SELECT =
  "id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason, is_extension, cancelled_at, created_at";

const TURO_OCCUPANCY_SELECT_MINIMAL =
  "id, vehicle_id, start_date, end_date, source, reason, created_at";

export function dedupeActiveTuroRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    if (isBlockedDateCancelled(row as { cancelled_at?: string | null; reason?: string | null })) {
      continue;
    }
    const guest = getTuroDriverFromReason(row.reason as string | null)?.toLowerCase() || "";
    const key = `${row.vehicle_id}|${row.start_date}|${row.end_date}|${guest}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const existingCreated = String(existing.created_at || "");
    const rowCreated = String(row.created_at || "");
    if (rowCreated > existingCreated) {
      byKey.set(key, row);
    }
  }

  return [...byKey.values()];
}

export interface FetchActiveTuroBlocksOpts {
  from?: string | null;
  to?: string | null;
  vehicleId?: string;
  /** Manager portal: hide trips that already ended. */
  minEndDate?: string | null;
}

/** Load non-cancelled Turo rows for occupancy merge (calendar, bookings list). */
export async function fetchActiveTuroBlockedRows(
  supabase: ServiceSupabase,
  opts: FetchActiveTuroBlocksOpts = {}
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("blocked_dates")
    .select(TURO_OCCUPANCY_SELECT)
    .eq("source", TURO_BLOCKED_SOURCE)
    .is("cancelled_at", null)
    .order("start_date", { ascending: false });

  if (opts.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
  if (opts.minEndDate) query = query.gte("end_date", opts.minEndDate);
  if (opts.from) query = query.gte("end_date", opts.from);
  if (opts.to) query = query.lte("start_date", opts.to);

  let { data, error } = await query;

  if (error && isMissingColumnError(error)) {
    let fb = supabase
      .from("blocked_dates")
      .select(TURO_OCCUPANCY_SELECT_MINIMAL)
      .eq("source", TURO_BLOCKED_SOURCE)
      .order("start_date", { ascending: false });

    if (opts.vehicleId) fb = fb.eq("vehicle_id", opts.vehicleId);
    if (opts.from) fb = fb.gte("end_date", opts.from);
    if (opts.to) fb = fb.lte("start_date", opts.to);

    const fallback = await fb;
    data = (fallback.data || []).map((r: Record<string, unknown>) => ({
      ...r,
      pickup_time: null,
      return_time: null,
      earnings: null,
      is_extension: false,
      location: null,
      cancelled_at: null,
    }));
    error = fallback.error;
  }

  if (error || !data) return [];
  return dedupeActiveTuroRows(data as Record<string, unknown>[]);
}
