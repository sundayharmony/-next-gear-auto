import { getServiceSupabase } from "@/lib/db/supabase";
import { getVehicleDisplayName } from "@/lib/types";
import type {
  OwnerBooking,
  OwnerVehicle,
  PayoutStatus,
} from "@/lib/types";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import {
  clampPercentage,
  computePayoutBreakdown,
  deriveOwnerStatus,
  rentalDays,
  DEFAULT_OWNER_PERCENTAGE,
} from "@/lib/owner/finance";

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
}

/**
 * Load an owner's vehicles, bookings and payout records, and assemble the
 * enriched `OwnerBooking[]` (with payout breakdowns) used across the portal.
 * One round-trip set per request; safe for owners with many vehicles.
 */
export async function loadOwnerDataset(ownerId: string): Promise<OwnerDataset> {
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
    return { vehicles, vehicleMap, bookings: [] };
  }

  const [{ data: bookingRows }, { data: payoutRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, vehicle_id, customer_name, pickup_date, return_date, total_price, deposit, status, payment_method, created_at")
      .in("vehicle_id", vehicleIds)
      .order("pickup_date", { ascending: false })
      .limit(2000),
    supabase
      .from("owner_payouts")
      .select("booking_id, status, payout_date, other_expenses")
      .eq("owner_id", ownerId),
  ]);

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
      ...breakdown,
    };
  });

  return { vehicles, vehicleMap, bookings };
}
