import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { isRevenueBooking } from "@/lib/owner/finance";
import type { OwnerBooking, OwnerVehicle } from "@/lib/types";

export interface EnrichedAdminOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  accountActivated: boolean;
  vehicleCount: number;
  vehicles: OwnerVehicle[];
  lifetimeRevenue: number;
  lifetimePayouts: number;
  pendingPayouts: number;
  recentBookings: OwnerBooking[];
}

interface OwnerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  password_hash?: string | null;
}

/** Load vehicles, bookings, and financial rollups for one owner account. */
export async function enrichOwnerRow(
  o: OwnerRow,
  options?: { recentBookingsLimit?: number }
): Promise<EnrichedAdminOwner> {
  const limit = options?.recentBookingsLimit ?? 15;
  const { vehicles, bookings } = await loadOwnerDataset(o.id);

  let lifetimeRevenue = 0;
  let lifetimePayouts = 0;
  let pendingPayouts = 0;
  for (const b of bookings) {
    if (b.status === "cancelled" || !isRevenueBooking(b.rawStatus)) continue;
    lifetimeRevenue += b.grossRevenue;
    if (b.payoutStatus === "paid") lifetimePayouts += b.ownerPayout;
    else if (b.status === "completed") pendingPayouts += b.ownerPayout;
  }

  return {
    id: o.id,
    name: o.name,
    email: o.email,
    phone: o.phone || "",
    createdAt: o.created_at,
    accountActivated: Boolean(o.password_hash),
    vehicleCount: vehicles.length,
    vehicles,
    lifetimeRevenue: Math.round(lifetimeRevenue * 100) / 100,
    lifetimePayouts: Math.round(lifetimePayouts * 100) / 100,
    pendingPayouts: Math.round(pendingPayouts * 100) / 100,
    recentBookings: bookings.slice(0, limit),
  };
}
