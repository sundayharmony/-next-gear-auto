import { getVehicleDisplayName } from "@/lib/types";
import { resolveTuroTripRevenue } from "@/lib/utils/turo-blocked-date";
import { TURO_BLOCKED_SOURCE } from "@/lib/utils/blocked-dates";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";
import type { StaffRole } from "@/lib/admin/vehicle-details-queries";
import {
  canManageBooking,
  canViewBookingFinancials,
} from "@/lib/bookings/financial-access";
import {
  bookingIntersectsRange,
  bookingIsCurrentlyOccupying,
} from "@/lib/utils/recurring-booking";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";

/** Service-role Supabase client — typed loosely so real Postgrest builders are accepted. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceSupabase = any;

export type OccupancyKind = "booking" | "turo";

export type OccupancyStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

export interface OccupancyEntry {
  id: string;
  kind: OccupancyKind;
  vehicle_id: string;
  vehicleName: string;
  customer_name: string;
  /** Present for booking rows — used for admin list search */
  customer_email?: string;
  pickup_date: string;
  return_date: string;
  pickup_time: string | null;
  return_time: string | null;
  status: OccupancyStatus;
  total_price: number | null;
  deposit: number | null;
  earnings: number | null;
  origin_channel: "public_checkout" | "admin_panel" | "manager_panel" | "turo" | null;
  source: "booking" | "turo-email";
  canViewPricing: boolean;
  canManage: boolean;
  reason?: string | null;
  is_extension?: boolean;
  created_at: string;
  location?: string | null;
  /** Present for Turo rows — underlying blocked_dates id */
  blocked_date_id?: string;
}

export interface VehicleOccupancyQuery {
  status?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  limit?: number;
}

export function todayYmdUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Deterministic Turo pseudo-status from calendar dates (UTC YYYY-MM-DD). */
export function deriveTuroOccupancyStatus(
  startDate: string,
  endDate: string,
  today: string = todayYmdUtc(),
  cancelledAt?: string | null
): OccupancyStatus {
  if (cancelledAt) return "cancelled";
  if (endDate < today) return "completed";
  if (startDate <= today && endDate >= today) return "active";
  return "confirmed";
}

function overlapsRange(
  start: string,
  end: string,
  from: string | null | undefined,
  to: string | null | undefined
): boolean {
  if (from && end < from) return false;
  if (to && start > to) return false;
  return true;
}

function mapBookingRow(
  b: Record<string, unknown>,
  role: StaffRole,
  userId: string
): OccupancyEntry {
  const v = b.vehicles as { year?: number; make?: string; model?: string } | null;
  const canViewPricing = canViewBookingFinancials(role, b);
  const total = canViewPricing ? (Number(b.total_price ?? 0) || 0) : null;
  const dep = canViewPricing ? (Number(b.deposit ?? 0) || 0) : null;
  return {
    id: String(b.id),
    kind: "booking",
    vehicle_id: String(b.vehicle_id),
    vehicleName: v ? getVehicleDisplayName(v) : "Unknown Vehicle",
    customer_name: String(b.customer_name || "Guest"),
    customer_email: (b.customer_email as string | undefined) || undefined,
    pickup_date: String(b.pickup_date),
    return_date: String(b.return_date),
    pickup_time: (b.pickup_time as string | null) ?? null,
    return_time: (b.return_time as string | null) ?? null,
    status: (String(b.status || "pending") as OccupancyStatus) || "pending",
    total_price: total,
    deposit: dep,
    earnings: null,
    origin_channel: (b.origin_channel as OccupancyEntry["origin_channel"]) ?? null,
    source: "booking",
    canViewPricing,
    canManage: canManageBooking(role, b, userId),
    created_at: String(b.created_at || ""),
  };
}

function normalizeBlockedRow(row: Record<string, unknown>): {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  earnings: number | string | null;
  reason: string | null;
  is_extension: boolean;
  created_at: string;
  location: string | null;
  cancelled_at: string | null;
} {
  return {
    id: String(row.id),
    vehicle_id: String(row.vehicle_id),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    pickup_time: (row.pickup_time as string | null) ?? null,
    return_time: (row.return_time as string | null) ?? null,
    earnings: (row.earnings as number | string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
    is_extension: Boolean(row.is_extension),
    created_at: String(row.created_at || ""),
    location: (row.location as string | null) ?? null,
    cancelled_at: (row.cancelled_at as string | null) ?? null,
  };
}

function mapTuroBlock(
  row: Record<string, unknown>,
  vehicleName: string,
  role: StaffRole,
  _userId: string
): OccupancyEntry {
  const n = normalizeBlockedRow(row);
  const revenue = resolveTuroTripRevenue({ earnings: n.earnings, reason: n.reason });
  const canViewPricing = role === "admin";
  const status = deriveTuroOccupancyStatus(n.start_date, n.end_date, todayYmdUtc(), n.cancelled_at);
  const turoTripName = `${vehicleName || "Unknown Vehicle"} on TURO`;
  return {
    id: `turo:${n.id}`,
    kind: "turo",
    vehicle_id: n.vehicle_id,
    vehicleName,
    customer_name: turoTripName,
    customer_email: undefined,
    pickup_date: n.start_date,
    return_date: n.end_date,
    pickup_time: n.pickup_time,
    return_time: n.return_time,
    status,
    total_price: canViewPricing && revenue > 0 ? revenue : null,
    deposit: null,
    earnings: canViewPricing && revenue > 0 ? revenue : null,
    origin_channel: "turo",
    source: "turo-email",
    canViewPricing,
    canManage: role === "admin",
    reason: n.reason,
    is_extension: n.is_extension,
    created_at: n.created_at,
    location: n.location,
    blocked_date_id: n.id,
  };
}

async function fetchTuroBlocksForVehicle(
  supabase: ServiceSupabase,
  vehicleId: string,
  role: StaffRole,
  query: VehicleOccupancyQuery
): Promise<Record<string, unknown>[]> {
  const fullSelect =
    "id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason, is_extension, cancelled_at, created_at";
  const minimalSelect = "id, vehicle_id, start_date, end_date, source, reason, created_at";

  let dbQuery = supabase.from("blocked_dates").select(fullSelect).eq("vehicle_id", vehicleId).eq("source", TURO_BLOCKED_SOURCE);

  if (role === "manager") {
    dbQuery = dbQuery.gte("end_date", todayYmdUtc());
  }
  if (query.from) {
    dbQuery = dbQuery.gte("end_date", query.from);
  }
  if (query.to) {
    dbQuery = dbQuery.lte("start_date", query.to);
  }

  let { data, error } = await dbQuery.order("start_date", { ascending: false }).limit(2000);

  if (error && isMissingColumnError(error)) {
    const fb = await supabase
      .from("blocked_dates")
      .select(minimalSelect)
      .eq("vehicle_id", vehicleId)
      .eq("source", TURO_BLOCKED_SOURCE)
      .order("start_date", { ascending: false })
      .limit(2000);
    data = (fb.data || []).map((r: Record<string, unknown>) => ({
      ...r,
      pickup_time: null,
      return_time: null,
      earnings: null,
      is_extension: false,
      location: null,
      cancelled_at: null,
    }));
    error = fb.error;
  }

  if (error) return [];
  return (data || []) as Record<string, unknown>[];
}

async function fetchBookingsForVehicleMerge(
  supabase: ServiceSupabase,
  vehicleId: string,
  role: StaffRole,
  query: VehicleOccupancyQuery
): Promise<Record<string, unknown>[]> {
  let dbQuery = supabase
    .from("bookings")
    .select("*, vehicles(year, make, model)")
    .eq("vehicle_id", vehicleId)
    .order("pickup_date", { ascending: false });

  if (role === "manager") {
    dbQuery = dbQuery.not("status", "in", "(cancelled,completed)");
  }
  if (query.to) dbQuery = dbQuery.lte("pickup_date", query.to);

  const { data, error } = await dbQuery.limit(2000);
  if (error) return [];
  const today = formatYyyyMmDdLocal(new Date());
  const rangeStart = query.from || "1970-01-01";
  const rangeEnd = query.to || "9999-12-31";

  return ((data || []) as Record<string, unknown>[]).filter((b) => {
    const row = {
      pickup_date: String(b.pickup_date),
      return_date: String(b.return_date),
      admin_notes: (b.admin_notes as string | null) ?? null,
      status: String(b.status || ""),
    };
    if (role === "manager" && !bookingIsCurrentlyOccupying(row, today)) {
      return false;
    }
    if (query.from || query.to) {
      return bookingIntersectsRange(row, rangeStart, rangeEnd, today);
    }
    return true;
  });
}

function statusMatchesFilter(entry: OccupancyEntry, status: string | null): boolean {
  if (!status || status === "all") return true;
  return entry.status === status;
}

function sortOccupancy(a: OccupancyEntry, b: OccupancyEntry): number {
  const pa = a.pickup_date;
  const pb = b.pickup_date;
  if (pa !== pb) return pa < pb ? 1 : -1;
  const ca = a.created_at || "";
  const cb = b.created_at || "";
  return ca < cb ? 1 : ca > cb ? -1 : 0;
}

export async function fetchVehicleOccupancy(
  supabase: ServiceSupabase,
  vehicleId: string,
  role: StaffRole,
  userId: string,
  query: VehicleOccupancyQuery
): Promise<{ data: OccupancyEntry[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 25));
  const status = query.status && query.status !== "all" ? query.status : null;

  const [bookingRows, turoRows] = await Promise.all([
    fetchBookingsForVehicleMerge(supabase, vehicleId, role, query),
    fetchTuroBlocksForVehicle(supabase, vehicleId, role, query),
  ]);

  let turoVehicleName = "Unknown Vehicle";
  if (turoRows.length > 0) {
    const { data: vrow } = await supabase
      .from("vehicles")
      .select("year, make, model")
      .eq("id", vehicleId)
      .maybeSingle();
    if (vrow) turoVehicleName = getVehicleDisplayName(vrow as { year?: number; make?: string; model?: string });
  }

  const merged: OccupancyEntry[] = [];

  for (const b of bookingRows) {
    const entry = mapBookingRow(b, role, userId);
    if (!statusMatchesFilter(entry, status)) continue;
    merged.push(entry);
  }

  for (const row of turoRows) {
    const n = normalizeBlockedRow(row);
    if (!overlapsRange(n.start_date, n.end_date, query.from, query.to)) continue;
    const entry = mapTuroBlock(row, turoVehicleName, role, userId);
    if (!statusMatchesFilter(entry, status)) continue;
    merged.push(entry);
  }

  merged.sort(sortOccupancy);
  const total = merged.length;
  const offset = (page - 1) * limit;
  const pageRows = merged.slice(offset, offset + limit);
  return { data: pageRows, total, page, limit };
}

/** Merge bookings + Turo trips for admin/manager list views (all vehicles). */
export async function fetchGlobalOccupancy(
  supabase: ServiceSupabase,
  role: StaffRole,
  userId: string,
  opts: {
    bookingRows: Record<string, unknown>[];
    status?: string | null;
    from?: string | null;
    to?: string | null;
  }
): Promise<OccupancyEntry[]> {
  const status = opts.status && opts.status !== "all" ? opts.status : null;
  const merged: OccupancyEntry[] = [];

  const today = formatYyyyMmDdLocal(new Date());
  const rangeStart = opts.from || "1970-01-01";
  const rangeEnd = opts.to || "9999-12-31";

  for (const b of opts.bookingRows) {
    const row = {
      pickup_date: String(b.pickup_date),
      return_date: String(b.return_date),
      admin_notes: (b.admin_notes as string | null) ?? null,
      status: String(b.status || ""),
    };
    if (role === "manager" && !bookingIsCurrentlyOccupying(row, today)) {
      continue;
    }
    if ((opts.from || opts.to) && !bookingIntersectsRange(row, rangeStart, rangeEnd, today)) {
      continue;
    }
    const entry = mapBookingRow(b, role, userId);
    if (!statusMatchesFilter(entry, status)) continue;
    merged.push(entry);
  }

  let turoQuery = supabase
    .from("blocked_dates")
    .select(
      "id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason, is_extension, cancelled_at, created_at"
    )
    .eq("source", TURO_BLOCKED_SOURCE)
    .order("start_date", { ascending: false })
    .limit(2000);

  if (role === "manager") {
    turoQuery = turoQuery.gte("end_date", todayYmdUtc());
  }
  if (opts.from) turoQuery = turoQuery.gte("end_date", opts.from);
  if (opts.to) turoQuery = turoQuery.lte("start_date", opts.to);

  let { data: turoData, error: turoErr } = await turoQuery;

  if (turoErr && isMissingColumnError(turoErr)) {
    const fb = await supabase
      .from("blocked_dates")
      .select("id, vehicle_id, start_date, end_date, source, reason, created_at")
      .eq("source", TURO_BLOCKED_SOURCE)
      .order("start_date", { ascending: false })
      .limit(2000);
    turoData = (fb.data || []).map((r: Record<string, unknown>) => ({
      ...r,
      pickup_time: null,
      return_time: null,
      earnings: null,
      is_extension: false,
      location: null,
      cancelled_at: null,
    }));
    turoErr = fb.error;
  }

  if (!turoErr && turoData && (turoData as Record<string, unknown>[]).length > 0) {
    const rows = turoData as Record<string, unknown>[];
    const ids = [...new Set(rows.map((r) => String(r.vehicle_id)))];
    const vehicleNameById = new Map<string, string>();
    if (ids.length > 0) {
      const { data: vs } = await supabase.from("vehicles").select("id, year, make, model").in("id", ids);
      for (const v of (vs || []) as Array<{ id: string; year?: number; make?: string; model?: string }>) {
        vehicleNameById.set(v.id, getVehicleDisplayName(v));
      }
    }
    for (const row of rows) {
      const vid = String(row.vehicle_id);
      const vname = vehicleNameById.get(vid) || "Unknown Vehicle";
      const n = normalizeBlockedRow(row);
      if (!overlapsRange(n.start_date, n.end_date, opts.from, opts.to)) continue;
      const entry = mapTuroBlock(row, vname, role, userId);
      if (!statusMatchesFilter(entry, status)) continue;
      merged.push(entry);
    }
  }

  merged.sort(sortOccupancy);
  return merged;
}

const SORTABLE_COLUMNS = new Set([
  "customer_name",
  "pickup_date",
  "return_date",
  "total_price",
  "status",
  "created_at",
]);

/** Sort merged occupancy for admin bookings list (matches /api/bookings sort keys). */
export function sortOccupancyEntries(
  entries: OccupancyEntry[],
  sortColumn: string,
  ascending: boolean
): OccupancyEntry[] {
  const col = SORTABLE_COLUMNS.has(sortColumn) ? sortColumn : "created_at";
  const dir = ascending ? 1 : -1;
  return [...entries].sort((a, b) => {
    let cmp = 0;
    if (col === "customer_name") {
      cmp = a.customer_name.localeCompare(b.customer_name, undefined, { sensitivity: "base" });
    } else if (col === "pickup_date") {
      cmp = a.pickup_date < b.pickup_date ? -1 : a.pickup_date > b.pickup_date ? 1 : 0;
    } else if (col === "return_date") {
      cmp = a.return_date < b.return_date ? -1 : a.return_date > b.return_date ? 1 : 0;
    } else if (col === "total_price") {
      const ta = a.total_price ?? -1;
      const tb = b.total_price ?? -1;
      cmp = ta - tb;
    } else if (col === "status") {
      cmp = a.status.localeCompare(b.status);
    } else {
      cmp = (a.created_at || "").localeCompare(b.created_at || "");
    }
    return cmp * dir;
  });
}

/** Convert occupancy entry to BookingRow-compatible shape for existing admin table. */
export function occupancyToBookingRowCompat(entry: OccupancyEntry): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: entry.id,
    customer_name: entry.customer_name,
    customer_email: entry.customer_email ?? "",
    vehicle_id: entry.vehicle_id,
    vehicleName: entry.vehicleName,
    pickup_date: entry.pickup_date,
    return_date: entry.return_date,
    pickup_time: entry.pickup_time ?? undefined,
    return_time: entry.return_time ?? undefined,
    total_price: entry.total_price,
    deposit: entry.deposit ?? 0,
    status: entry.status,
    created_at: entry.created_at,
    canViewPricing: entry.canViewPricing,
    canManage: entry.canManage,
    origin_channel: entry.kind === "turo" ? "turo" : entry.origin_channel,
    occupancy_kind: entry.kind,
    blocked_date_id: entry.blocked_date_id,
    customerName: entry.customer_name,
    is_overdue: false,
    turo_reason: entry.kind === "turo" ? entry.reason ?? null : undefined,
    turo_location: entry.kind === "turo" ? entry.location ?? null : undefined,
    turo_is_extension: entry.kind === "turo" ? Boolean(entry.is_extension) : undefined,
  };
  return base;
}
