import { getServiceSupabase } from "@/lib/db/supabase";
import { getVehicleDisplayName } from "@/lib/types";
import { parseTuroEmail, storedTuroLocation } from "@/lib/utils/turo-email-parser";
import { pickTuroCancellationMatch } from "@/lib/utils/turo-cancellation-match";
import {
  CANCELLED_REASON_PREFIX,
  TURO_BLOCKED_SOURCE,
  isBlockedDateCancelled,
} from "@/lib/utils/blocked-dates";

export type TuroTripRow = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  cancelled_at?: string | null;
  location?: string | null;
  created_at: string;
};

export type SyncCancellationsResult = {
  hasCancelledAt: boolean;
  processed: number;
  matched: number;
  marked: number;
  deleted: number;
  skipped: number;
  errors: string[];
  actions: Array<{
    tripId: string;
    vehicleName: string;
    start_date: string;
    end_date: string;
    action: "marked" | "deleted" | "skipped";
    detail: string;
  }>;
};

const TURO_PAGE_SIZE = 1000;
const TURO_SELECT_FULL =
  "id, vehicle_id, start_date, end_date, reason, location, cancelled_at, created_at, source";
const TURO_SELECT_MINIMAL = "id, vehicle_id, start_date, end_date, reason, created_at, source";

/** Direct lookup — avoids Supabase 1000-row cap on bulk fetches. */
export async function fetchTuroTripById(
  supabase: ReturnType<typeof getServiceSupabase>,
  id: string
): Promise<{ row: TuroTripRow | null; hasCancelledAt: boolean }> {
  const full = await supabase
    .from("blocked_dates")
    .select(TURO_SELECT_FULL)
    .eq("id", id)
    .eq("source", TURO_BLOCKED_SOURCE)
    .maybeSingle();

  if (!full.error) {
    return { row: (full.data as TuroTripRow | null) ?? null, hasCancelledAt: true };
  }

  const minimal = await supabase
    .from("blocked_dates")
    .select(TURO_SELECT_MINIMAL)
    .eq("id", id)
    .eq("source", TURO_BLOCKED_SOURCE)
    .maybeSingle();

  if (minimal.error) throw new Error(minimal.error.message);
  return { row: (minimal.data as TuroTripRow | null) ?? null, hasCancelledAt: false };
}

async function fetchPaginatedTuroRows(
  supabase: ReturnType<typeof getServiceSupabase>,
  opts: { activeOnly?: boolean; cancelledOnly?: boolean; includePrefixCancelled?: boolean } = {}
): Promise<{ rows: TuroTripRow[]; hasCancelledAt: boolean }> {
  let hasCancelledAt = true;
  const rows: TuroTripRow[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("blocked_dates")
      .select(TURO_SELECT_FULL)
      .eq("source", TURO_BLOCKED_SOURCE)
      .order("start_date", { ascending: false })
      .range(offset, offset + TURO_PAGE_SIZE - 1);

    if (opts.activeOnly) query = query.is("cancelled_at", null);
    if (opts.cancelledOnly) query = query.not("cancelled_at", "is", null);

    const page = await query;

    if (page.error) {
      if (!hasCancelledAt || offset > 0) throw new Error(page.error.message);
      hasCancelledAt = false;

      let fallbackQuery = supabase
        .from("blocked_dates")
        .select(TURO_SELECT_MINIMAL)
        .eq("source", TURO_BLOCKED_SOURCE)
        .order("start_date", { ascending: false })
        .range(offset, offset + TURO_PAGE_SIZE - 1);

      if (opts.activeOnly) fallbackQuery = fallbackQuery.is("cancelled_at", null);
      if (opts.cancelledOnly) fallbackQuery = fallbackQuery.not("cancelled_at", "is", null);

      const fallbackPage = await fallbackQuery;
      if (fallbackPage.error) throw new Error(fallbackPage.error.message);

      const batch = (fallbackPage.data || []) as TuroTripRow[];
      rows.push(...batch);
      if (batch.length < TURO_PAGE_SIZE) break;
      offset += TURO_PAGE_SIZE;
      continue;
    }

    const batch = (page.data || []) as TuroTripRow[];
    rows.push(...batch);
    if (batch.length < TURO_PAGE_SIZE) break;
    offset += TURO_PAGE_SIZE;
  }

  if (opts.activeOnly && !opts.includePrefixCancelled) {
    return { rows: rows.filter((r) => !isBlockedDateCancelled(r)), hasCancelledAt };
  }
  return { rows, hasCancelledAt };
}

function matchTrip(
  rows: TuroTripRow[],
  vehicleId: string,
  startDate: string,
  endDate: string,
  guestName: string | null
): TuroTripRow | null {
  const overlapping = rows.filter(
    (r) =>
      !isBlockedDateCancelled(r) &&
      r.vehicle_id === vehicleId &&
      r.start_date <= endDate &&
      r.end_date >= startDate
  );
  const picked = pickTuroCancellationMatch(overlapping, startDate, endDate, guestName);
  if (!picked) return null;
  return rows.find((r) => r.id === picked.id) ?? null;
}

async function matchVehicle(
  supabase: ReturnType<typeof getServiceSupabase>,
  parsed: ReturnType<typeof parseTuroEmail>,
  emailText: string
) {
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, year, make, model")
    .order("year", { ascending: false });

  if (!vehicles?.length) return null;

  const desc = (parsed.vehicleDescription || "").toLowerCase();
  const fullText = emailText.toLowerCase();
  let matched: (typeof vehicles)[number] | null = null;
  let matchScore = 0;

  for (const v of vehicles) {
    let score = 0;
    const make = (v.make || "").toLowerCase();
    const model = (v.model || "").toLowerCase();
    const year = String(v.year || "");
    if (desc) {
      if (make && desc.includes(make)) score += 4;
      if (model && desc.includes(model)) score += 5;
      if (year && desc.includes(year)) score += 3;
    }
    if (make && fullText.includes(make)) score += 2;
    if (model && fullText.includes(model)) score += 3;
    if (year && fullText.includes(year)) score += 1;
    if (score > matchScore) {
      matchScore = score;
      matched = v;
    }
  }
  return matchScore >= 4 ? matched : null;
}

async function ensureVehicleNames(
  supabase: ReturnType<typeof getServiceSupabase>,
  vehicleNameById: Map<string, string>,
  vehicleIds: string[]
) {
  const missing = vehicleIds.filter((id) => !vehicleNameById.has(id));
  if (!missing.length) return;

  const { data: vs } = await supabase.from("vehicles").select("id, year, make, model").in("id", missing);
  for (const v of vs || []) {
    vehicleNameById.set(v.id, getVehicleDisplayName(v));
  }
}

export async function markTuroBlockedDateCancelled(
  supabase: ReturnType<typeof getServiceSupabase>,
  row: Pick<TuroTripRow, "id" | "reason">,
  opts?: { when?: string; deleteRow?: boolean; hasCancelledAt?: boolean }
): Promise<"marked" | "deleted"> {
  const when = opts?.when ?? new Date().toISOString();
  const deleteRow = opts?.deleteRow ?? false;
  let hasCancelledAt = opts?.hasCancelledAt;
  if (hasCancelledAt === undefined) {
    const probe = await supabase.from("blocked_dates").select("cancelled_at").limit(1);
    hasCancelledAt = !probe.error;
  }
  return markTripCancelled(supabase, row as TuroTripRow, hasCancelledAt, when, deleteRow);
}

async function markTripCancelled(
  supabase: ReturnType<typeof getServiceSupabase>,
  row: TuroTripRow,
  hasCancelledAt: boolean,
  when: string,
  deleteRow: boolean
): Promise<"marked" | "deleted"> {
  if (deleteRow) {
    const { error } = await supabase.from("blocked_dates").delete().eq("id", row.id);
    if (error) throw new Error(error.message);
    return "deleted";
  }

  if (hasCancelledAt) {
    const { error } = await supabase
      .from("blocked_dates")
      .update({ cancelled_at: when })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return "marked";
  }

  const reason = row.reason?.trimStart().startsWith(CANCELLED_REASON_PREFIX)
    ? row.reason
    : `${CANCELLED_REASON_PREFIX} ${when} — ${row.reason || "Turo trip"}`;
  const { error } = await supabase.from("blocked_dates").update({ reason }).eq("id", row.id);
  if (error) throw new Error(error.message);
  return "marked";
}

export async function syncTuroCancellations(opts: {
  emails?: string[];
  tripIds?: string[];
  deleteRows?: boolean;
  purgeAlreadyCancelled?: boolean;
}): Promise<SyncCancellationsResult> {
  const supabase = getServiceSupabase();
  const when = new Date().toISOString();
  const deleteRows = opts.deleteRows ?? false;
  const result: SyncCancellationsResult = {
    hasCancelledAt: false,
    processed: 0,
    matched: 0,
    marked: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
    actions: [],
  };

  const vehicleNameById = new Map<string, string>();
  const colProbe = await supabase.from("blocked_dates").select("cancelled_at").limit(1);
  const hasCancelledAt = !colProbe.error;
  result.hasCancelledAt = hasCancelledAt;

  let active: TuroTripRow[] = [];

  if (opts.purgeAlreadyCancelled) {
    const [{ rows: cancelledRows }, { rows: nullCancelledRows }] = await Promise.all([
      fetchPaginatedTuroRows(supabase, { cancelledOnly: true }),
      fetchPaginatedTuroRows(supabase, { activeOnly: true, includePrefixCancelled: true }),
    ]);
    const prefixOnlyCancelled = nullCancelledRows.filter(isBlockedDateCancelled);
    const purgeRows = [...cancelledRows, ...prefixOnlyCancelled];

    for (const row of purgeRows) {
      result.processed++;
      if (!deleteRows) {
        result.skipped++;
        continue;
      }
      try {
        await supabase.from("blocked_dates").delete().eq("id", row.id);
        result.deleted++;
        await ensureVehicleNames(supabase, vehicleNameById, [row.vehicle_id]);
        result.actions.push({
          tripId: row.id,
          vehicleName: vehicleNameById.get(row.vehicle_id) || row.vehicle_id,
          start_date: row.start_date,
          end_date: row.end_date,
          action: "deleted",
          detail: "Purged previously cancelled row",
        });
      } catch (e) {
        result.errors.push(`${row.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  if (opts.emails?.length) {
    const { rows } = await fetchPaginatedTuroRows(supabase, { activeOnly: true });
    active = rows;
  }

  if (opts.tripIds?.length) {
    for (const id of opts.tripIds) {
      result.processed++;
      const { row } = await fetchTuroTripById(supabase, id);
      if (!row) {
        result.skipped++;
        result.errors.push(`Trip not found: ${id}`);
        continue;
      }
      await ensureVehicleNames(supabase, vehicleNameById, [row.vehicle_id]);
      if (isBlockedDateCancelled(row)) {
        result.skipped++;
        result.actions.push({
          tripId: row.id,
          vehicleName: vehicleNameById.get(row.vehicle_id) || row.vehicle_id,
          start_date: row.start_date,
          end_date: row.end_date,
          action: "skipped",
          detail: "Already cancelled",
        });
        continue;
      }
      try {
        const action = await markTripCancelled(supabase, row, hasCancelledAt, when, deleteRows);
        if (action === "deleted") result.deleted++;
        else result.marked++;
        result.matched++;
        result.actions.push({
          tripId: row.id,
          vehicleName: vehicleNameById.get(row.vehicle_id) || row.vehicle_id,
          start_date: row.start_date,
          end_date: row.end_date,
          action,
          detail: "Cancelled by trip id",
        });
        active = active.filter((r) => r.id !== row.id);
      } catch (e) {
        result.errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  for (const emailText of opts.emails || []) {
    result.processed++;
    const parsed = parseTuroEmail(emailText);
    if (!parsed.isCancellation) {
      result.skipped++;
      continue;
    }
    if (!parsed.startDate || !parsed.endDate) {
      result.skipped++;
      result.errors.push("Cancellation email missing dates");
      continue;
    }

    const vehicle = await matchVehicle(supabase, parsed, emailText);
    if (!vehicle) {
      result.skipped++;
      result.errors.push(`No vehicle match for ${parsed.startDate}→${parsed.endDate}`);
      continue;
    }

    const trip = matchTrip(active, vehicle.id, parsed.startDate, parsed.endDate, parsed.guestName);
    if (!trip) {
      result.skipped++;
      result.errors.push(
        `No active trip for ${getVehicleDisplayName(vehicle)} ${parsed.startDate}→${parsed.endDate}`
      );
      continue;
    }

    try {
      const action = await markTripCancelled(supabase, trip, hasCancelledAt, when, deleteRows);
      if (action === "deleted") result.deleted++;
      else result.marked++;
      result.matched++;
      result.actions.push({
        tripId: trip.id,
        vehicleName: getVehicleDisplayName(vehicle),
        start_date: trip.start_date,
        end_date: trip.end_date,
        action,
        detail: parsed.guestName ? `Guest: ${parsed.guestName}` : "Cancellation email",
      });
      active = active.filter((r) => r.id !== trip.id);
    } catch (e) {
      result.errors.push(`${trip.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}

export async function listTuroCancellationStatus() {
  const supabase = getServiceSupabase();

  const [hasColProbe, cancelledCountRes, prefixCountRes, activeFetch] = await Promise.all([
    supabase.from("blocked_dates").select("cancelled_at").limit(1),
    supabase
      .from("blocked_dates")
      .select("id", { count: "exact", head: true })
      .eq("source", TURO_BLOCKED_SOURCE)
      .not("cancelled_at", "is", null),
    supabase
      .from("blocked_dates")
      .select("id", { count: "exact", head: true })
      .eq("source", TURO_BLOCKED_SOURCE)
      .is("cancelled_at", null)
      .ilike("reason", `${CANCELLED_REASON_PREFIX}%`),
    fetchPaginatedTuroRows(supabase, { activeOnly: true }),
  ]);

  const hasCancelledAt = !hasColProbe.error;
  if (cancelledCountRes.error) throw new Error(cancelledCountRes.error.message);

  const activeRows = activeFetch.rows;
  const activeCount = activeRows.length;
  const cancelledCount =
    (cancelledCountRes.count ?? 0) + (prefixCountRes.error ? 0 : prefixCountRes.count ?? 0);

  return {
    hasCancelledAt,
    total: activeCount + cancelledCount,
    active: activeCount,
    cancelled: cancelledCount,
    activeMissingLocation: activeRows.filter((r) => !storedTuroLocation(r.location)).length,
    cancelledRows: [] as TuroTripRow[],
    activeRows,
  };
}
