import { getServiceSupabase } from "@/lib/db/supabase";
import { getVehicleDisplayName } from "@/lib/types";
import type {
  OwnerBlockedDate,
  OwnerBooking,
  OwnerVehicle,
  PayoutStatus,
} from "@/lib/types";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import {
  clampPercentage,
  computePayoutBreakdown,
  deriveOwnerStatus,
  isOwnerActiveBooking,
  isOwnerVisibleBooking,
  rentalDays,
  DEFAULT_OWNER_PERCENTAGE,
} from "@/lib/owner/finance";
import { getTuroDriverFromReason, resolveTuroTripRevenue } from "@/lib/utils/turo-blocked-date";
import {
  filterActiveTuroTrips,
  filterManualBlockedDates,
  isActiveCalendarBlock,
  TURO_BLOCKED_SOURCE,
} from "@/lib/utils/blocked-dates";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";
import { logger } from "@/lib/utils/logger";

interface VehicleRow {
  id: string;
  year: number;
  make: string;
  model: string;
  category: string;
  images: string[] | null;
  daily_rate: number | null;
  is_available: boolean | null;
  owner_percentage: number | null;
}

export interface OwnerDataset {
  vehicles: OwnerVehicle[];
  vehicleMap: Map<string, VehicleRow>;
  bookings: OwnerBooking[];
  blockedDates: OwnerBlockedDate[];
}

export interface LoadOwnerDatasetOptions {
  /**
   * When true (owner portal), hide staff/private bookings created before today.
   * Admin views should pass false to retain full history.
   */
  ownerPortalOnly?: boolean;
}

/**
 * Load an owner's vehicles, bookings and payout records, and assemble the
 * enriched `OwnerBooking[]` (with payout breakdowns) used across the portal.
 * One round-trip set per request; safe for owners with many vehicles.
 */
export async function loadOwnerDataset(
  ownerId: string,
  options?: LoadOwnerDatasetOptions
): Promise<OwnerDataset> {
  const supabase = getServiceSupabase();

  const { data: vehicleRows } = await supabase
    .from("vehicles")
    .select("id, year, make, model, category, images, daily_rate, is_available, owner_percentage")
    .eq("owner_id", ownerId);

  const vehicleList = (vehicleRows || []) as VehicleRow[];
  const vehicleMap = new Map<string, VehicleRow>(vehicleList.map((v) => [v.id, v]));
  const vehicleIds = vehicleList.map((v) => v.id);

  const vehicles: OwnerVehicle[] = vehicleList.map((v) => ({
    id: v.id,
    year: v.year || 0,
    make: v.make || "",
    model: v.model || "",
    category: v.category || "",
    image: Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : null,
    dailyRate: v.daily_rate ?? 0,
    ownerPercentage: clampPercentage(v.owner_percentage ?? DEFAULT_OWNER_PERCENTAGE),
    isAvailable: v.is_available !== false,
  }));

  if (vehicleIds.length === 0) {
    return { vehicles, vehicleMap, bookings: [], blockedDates: [] };
  }

  const [{ data: bookingRows }, { data: payoutRows }, { data: blockedRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, vehicle_id, customer_name, pickup_date, return_date, total_price, deposit, status, payment_method, created_at, origin_channel"
      )
      .in("vehicle_id", vehicleIds)
      .order("pickup_date", { ascending: false })
      .limit(2000),
    supabase
      .from("owner_payouts")
      .select("booking_id, status, payout_date, other_expenses")
      .eq("owner_id", ownerId),
    supabase
      .from("blocked_dates")
      .select("id, vehicle_id, start_date, end_date, reason, source, owner_id, cancelled_at")
      .in("vehicle_id", vehicleIds)
      .order("start_date", { ascending: true }),
  ]);

  const blockedDates: OwnerBlockedDate[] = filterManualBlockedDates(blockedRows || [])
    .filter(isActiveCalendarBlock)
    .map((b) => ({
    id: b.id as string,
    vehicleId: b.vehicle_id as string,
    startDate: b.start_date as string,
    endDate: b.end_date as string,
    reason: (b.reason as string | null) ?? null,
    source: (b.source as string) || "manual",
    removable: b.source === "owner" && b.owner_id === ownerId,
  }));

  const payoutMap = new Map<
    string,
    { status: PayoutStatus; payout_date: string | null; other_expenses: number }
  >();
  for (const p of payoutRows || []) {
    if (p.booking_id) {
      payoutMap.set(p.booking_id as string, {
        status: (p.status as PayoutStatus) || "pending",
        payout_date: (p.payout_date as string) || null,
        other_expenses: Number(p.other_expenses) || 0,
      });
    }
  }

  const today = formatYyyyMmDdLocal(new Date());

  const bookings: OwnerBooking[] = (bookingRows || []).map((b) => {
    const vehicle = vehicleMap.get(b.vehicle_id as string);
    const ownerPercentage = clampPercentage(
      vehicle?.owner_percentage ?? DEFAULT_OWNER_PERCENTAGE
    );
    const payout = payoutMap.get(b.id as string);
    const status = deriveOwnerStatus(b.status, b.pickup_date, b.return_date, today);
    const gross = status === "cancelled" ? 0 : Number(b.total_price) || 0;
    const breakdown = computePayoutBreakdown({
      grossRevenue: gross,
      ownerPercentage,
      otherExpenses: payout?.other_expenses ?? 0,
      paymentMethod: (b.payment_method as string) || null,
    });

    return {
      id: b.id,
      kind: "booking",
      vehicleId: b.vehicle_id,
      vehicleName: vehicle ? getVehicleDisplayName(vehicle) : "Vehicle",
      customerName: b.customer_name || "Guest",
      pickupDate: b.pickup_date,
      returnDate: b.return_date,
      rentalDays: rentalDays(b.pickup_date, b.return_date),
      status,
      rawStatus: b.status,
      payoutStatus: payout?.status ?? "pending",
      payoutDate: payout?.payout_date ?? null,
      createdAt: b.created_at,
      originChannel: (b.origin_channel as OwnerBooking["originChannel"]) ?? undefined,
      ...breakdown,
    };
  });

  let visibleBookings = bookings;
  if (options?.ownerPortalOnly) {
    visibleBookings = bookings.filter((b) =>
      isOwnerVisibleBooking(
        {
          kind: b.kind,
          origin_channel: b.originChannel,
          createdAt: b.createdAt,
        },
        today
      )
    );
  }

  const turoBlocks = filterActiveTuroTrips(await fetchOwnerTuroBlocks(supabase, vehicleIds));
  for (const row of turoBlocks) {
    const vehicleId = String(row.vehicle_id);
    const vehicle = vehicleMap.get(vehicleId);
    const ownerPercentage = clampPercentage(
      vehicle?.owner_percentage ?? DEFAULT_OWNER_PERCENTAGE
    );
    const pickupDate = String(row.start_date);
    const returnDate = String(row.end_date);
    const status = deriveOwnerStatus("confirmed", pickupDate, returnDate, today);
    const gross = resolveTuroTripRevenue({
      earnings: row.earnings as number | string | null,
      reason: (row.reason as string | null) ?? null,
    });
    const breakdown = computePayoutBreakdown({
      grossRevenue: gross,
      ownerPercentage,
      processingFees: 0,
      otherExpenses: 0,
      paymentMethod: "cash",
    });
    const driver =
      getTuroDriverFromReason((row.reason as string | null) ?? null) || "Turo guest";

    visibleBookings.push({
      id: `turo:${String(row.id)}`,
      kind: "turo",
      vehicleId,
      vehicleName: vehicle ? getVehicleDisplayName(vehicle) : "Vehicle",
      customerName: driver,
      pickupDate,
      returnDate,
      rentalDays: rentalDays(pickupDate, returnDate),
      status,
      rawStatus: "turo",
      payoutStatus: "pending",
      payoutDate: null,
      createdAt: String(row.created_at || ""),
      ...breakdown,
    });
  }

  if (options?.ownerPortalOnly) {
    visibleBookings = visibleBookings.filter(isOwnerActiveBooking);
  }

  visibleBookings.sort((a, b) => {
    if (a.pickupDate !== b.pickupDate) return a.pickupDate < b.pickupDate ? 1 : -1;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  return { vehicles, vehicleMap, bookings: visibleBookings, blockedDates };
}

async function fetchOwnerTuroBlocks(
  supabase: ReturnType<typeof getServiceSupabase>,
  vehicleIds: string[]
): Promise<Record<string, unknown>[]> {
  const fullSelect =
    "id, vehicle_id, start_date, end_date, earnings, reason, cancelled_at, created_at, source";
  const minimalSelect = "id, vehicle_id, start_date, end_date, source, reason, created_at";

  let { data, error } = await supabase
    .from("blocked_dates")
    .select(fullSelect)
    .in("vehicle_id", vehicleIds)
    .eq("source", TURO_BLOCKED_SOURCE)
    .is("cancelled_at", null)
    .order("start_date", { ascending: false })
    .limit(2000);

  if (error && isMissingColumnError(error)) {
    const fb = await supabase
      .from("blocked_dates")
      .select(minimalSelect)
      .in("vehicle_id", vehicleIds)
      .eq("source", TURO_BLOCKED_SOURCE)
      .order("start_date", { ascending: false })
      .limit(2000);
    data = (fb.data || []).map((r) => ({
      ...(r as Record<string, unknown>),
      earnings: null,
      cancelled_at: null,
    })) as typeof data;
    error = fb.error;
  }

  if (error) {
    logger.error("Owner Turo blocks query failed", error);
    return [];
  }
  return (data || []) as Record<string, unknown>[];
}
