import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { computeOwnerFinanceSummary } from "@/lib/owner/owner-metrics";
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
  financingLifetime: number;
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
  const summary = computeOwnerFinanceSummary(bookings, vehicles);

  return {
    id: o.id,
    name: o.name,
    email: o.email,
    phone: o.phone || "",
    createdAt: o.created_at,
    accountActivated: Boolean(o.password_hash),
    vehicleCount: vehicles.length,
    vehicles,
    lifetimeRevenue: summary.lifetimeRevenue,
    lifetimePayouts: summary.lifetimePayouts,
    pendingPayouts: summary.pendingPayouts,
    financingLifetime: summary.financingLifetime,
    recentBookings: bookings.slice(0, limit),
  };
}
