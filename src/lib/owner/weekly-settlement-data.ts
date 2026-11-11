import { getServiceSupabase } from "@/lib/db/supabase";
import { getVehicleDisplayName } from "@/lib/types";
import { isRevenueBooking } from "@/lib/owner/finance";
import {
  computeOwnerWeekSettlement,
  computeVehicleWeekSettlement,
  getWeekRange,
  normalizeWeekStart,
  type OwnerWeekSettlement,
  type VehicleWeekSettlement,
} from "@/lib/owner/weekly-settlement";
import { hasOwnerPortalAccess } from "@/lib/auth/customer-capabilities";
import {
  getTuroDriverFromReason,
  resolveTuroTripRevenue,
} from "@/lib/utils/turo-blocked-date";
import {
  filterActiveTuroTrips,
  TURO_BLOCKED_SOURCE,
} from "@/lib/utils/blocked-dates";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";
import { logger } from "@/lib/utils/logger";

type VehicleRow = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  owner_id: string | null;
  is_company_owned?: boolean | null;
  monthly_insurance?: number | null;
};

type TripInput = {
  id: string;
  kind: "booking" | "turo";
  customerName: string;
  pickupDate: string;
  returnDate: string;
  grossTotal: number;
};

/**
 * Load Monday–Sunday weekly settlements for all (or one) non-company owners.
 */
export async function loadWeeklyOwnerSettlements(options: {
  weekStart?: string;
  ownerId?: string;
}): Promise<{
  weekStart: string;
  weekEnd: string;
  owners: OwnerWeekSettlement[];
}> {
  const { weekStart, weekEnd } = getWeekRange(normalizeWeekStart(options.weekStart));
  const supabase = getServiceSupabase();

  const vehicles = await loadOwnedVehicles(supabase, options.ownerId);
  if (vehicles.length === 0) {
    return { weekStart, weekEnd, owners: [] };
  }

  const ownerIds = [...new Set(vehicles.map((v) => v.owner_id!).filter(Boolean))];
  const ownersById = await loadOwnersById(supabase, ownerIds);
  const vehicleIds = vehicles.map((v) => v.id);

  const [bookingTrips, turoTrips] = await Promise.all([
    loadBookingTripsForWeek(supabase, vehicleIds, weekStart, weekEnd),
    loadTuroTripsForWeek(supabase, vehicleIds, weekStart, weekEnd),
  ]);

  const tripsByVehicle = new Map<string, TripInput[]>();
  for (const trip of [...bookingTrips, ...turoTrips]) {
    const list = tripsByVehicle.get(trip.vehicleId) || [];
    list.push(trip);
    tripsByVehicle.set(trip.vehicleId, list);
  }

  const vehiclesByOwner = new Map<string, VehicleWeekSettlement[]>();
  for (const v of vehicles) {
    const ownerId = v.owner_id!;
    const vehicleName = getVehicleDisplayName(v);
    const settlement = computeVehicleWeekSettlement({
      vehicleId: v.id,
      vehicleName,
      ownerId,
      monthlyInsurance: Number(v.monthly_insurance) || 0,
      weekStart,
      weekEnd,
      trips: tripsByVehicle.get(v.id) || [],
    });
    const list = vehiclesByOwner.get(ownerId) || [];
    list.push(settlement);
    vehiclesByOwner.set(ownerId, list);
  }

  const owners: OwnerWeekSettlement[] = [];
  for (const ownerId of ownerIds) {
    const profile = ownersById.get(ownerId);
    if (!profile) continue;
    owners.push(
      computeOwnerWeekSettlement({
        ownerId,
        ownerName: profile.name,
        ownerEmail: profile.email,
        vehicles: vehiclesByOwner.get(ownerId) || [],
      }),
    );
  }

  owners.sort((a, b) => a.ownerName.localeCompare(b.ownerName));
  return { weekStart, weekEnd, owners };
}

async function loadOwnedVehicles(
  supabase: ReturnType<typeof getServiceSupabase>,
  ownerId?: string,
): Promise<VehicleRow[]> {
  const selectWithInsurance =
    "id, year, make, model, owner_id, is_company_owned, monthly_insurance";
  const selectBase = "id, year, make, model, owner_id, is_company_owned";

  let query = supabase.from("vehicles").select(selectWithInsurance).not("owner_id", "is", null);
  if (ownerId) query = query.eq("owner_id", ownerId);

  let { data, error } = await query;
  if (error && isMissingColumnError(error)) {
    let fb = supabase.from("vehicles").select(selectBase).not("owner_id", "is", null);
    if (ownerId) fb = fb.eq("owner_id", ownerId);
    const retry = await fb;
    data = (retry.data || []).map((row) => ({ ...row, monthly_insurance: 0 }));
    error = retry.error;
  }

  if (error) {
    logger.error("Weekly settlement vehicles query failed", error);
    return [];
  }

  return ((data || []) as VehicleRow[]).filter(
    (v) => v.owner_id && v.is_company_owned !== true,
  );
}

async function loadOwnersById(
  supabase: ReturnType<typeof getServiceSupabase>,
  ownerIds: string[],
): Promise<Map<string, { name: string; email: string }>> {
  const map = new Map<string, { name: string; email: string }>();
  if (ownerIds.length === 0) return map;

  let result = await supabase
    .from("customers")
    .select("id, name, email, role, owner_portal_enabled")
    .in("id", ownerIds);

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from("customers")
      .select("id, name, email, role")
      .in("id", ownerIds)
      .eq("role", "owner");
  }

  if (result.error) {
    logger.error("Weekly settlement owners query failed", result.error);
    return map;
  }

  for (const row of result.data || []) {
    if (!hasOwnerPortalAccess(row as { role?: string | null; owner_portal_enabled?: boolean | null })) {
      continue;
    }
    map.set(row.id as string, {
      name: String(row.name || "Owner"),
      email: String(row.email || ""),
    });
  }
  return map;
}

async function loadBookingTripsForWeek(
  supabase: ReturnType<typeof getServiceSupabase>,
  vehicleIds: string[],
  weekStart: string,
  weekEnd: string,
): Promise<Array<TripInput & { vehicleId: string }>> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, vehicle_id, customer_name, pickup_date, return_date, total_price, status")
    .in("vehicle_id", vehicleIds)
    .lte("pickup_date", weekEnd)
    .gte("return_date", weekStart)
    .limit(5000);

  if (error) {
    logger.error("Weekly settlement bookings query failed", error);
    return [];
  }

  const trips: Array<TripInput & { vehicleId: string }> = [];
  for (const row of data || []) {
    const status = String(row.status || "");
    if (!isRevenueBooking(status)) continue;
    trips.push({
      id: String(row.id),
      kind: "booking",
      vehicleId: String(row.vehicle_id),
      customerName: String(row.customer_name || "Guest"),
      pickupDate: String(row.pickup_date),
      returnDate: String(row.return_date),
      grossTotal: Number(row.total_price) || 0,
    });
  }
  return trips;
}

async function loadTuroTripsForWeek(
  supabase: ReturnType<typeof getServiceSupabase>,
  vehicleIds: string[],
  weekStart: string,
  weekEnd: string,
): Promise<Array<TripInput & { vehicleId: string }>> {
  const fullSelect =
    "id, vehicle_id, start_date, end_date, earnings, reason, cancelled_at, source";
  let { data, error } = await supabase
    .from("blocked_dates")
    .select(fullSelect)
    .in("vehicle_id", vehicleIds)
    .eq("source", TURO_BLOCKED_SOURCE)
    .is("cancelled_at", null)
    .lte("start_date", weekEnd)
    .gte("end_date", weekStart)
    .limit(5000);

  if (error && isMissingColumnError(error)) {
    const fb = await supabase
      .from("blocked_dates")
      .select("id, vehicle_id, start_date, end_date, reason, source, cancelled_at")
      .in("vehicle_id", vehicleIds)
      .eq("source", TURO_BLOCKED_SOURCE)
      .is("cancelled_at", null)
      .lte("start_date", weekEnd)
      .gte("end_date", weekStart)
      .limit(5000);
    data = fb.data;
    error = fb.error;
  }

  if (error) {
    logger.error("Weekly settlement Turo query failed", error);
    return [];
  }

  const active = filterActiveTuroTrips(data || []);
  return active.map((row) => {
    const reason = (row.reason as string | null) ?? null;
    const gross = resolveTuroTripRevenue({
      earnings: row.earnings as number | string | null | undefined,
      reason,
    });
    return {
      id: `turo:${String(row.id)}`,
      kind: "turo" as const,
      vehicleId: String(row.vehicle_id),
      customerName: getTuroDriverFromReason(reason) || "Turo guest",
      pickupDate: String(row.start_date),
      returnDate: String(row.end_date),
      grossTotal: gross,
    };
  });
}
