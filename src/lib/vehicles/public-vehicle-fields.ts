import type { Vehicle, VehicleCategory } from "@/lib/types";

/** DB columns fetched for public fleet (no VIN/plate in SELECT). */
export const PUBLIC_VEHICLE_SELECT =
  "id, year, make, model, category, daily_rate, images, is_available, features, specs, mileage, maintenance_status, color, description";

/** JSON fields exposed on public fleet API and SSR — no VIN or license plate. */
export type PublicVehicleJson = Omit<Vehicle, "licensePlate" | "vin">;

export function mapPublicVehicleRow(v: Record<string, unknown>): PublicVehicleJson {
  return {
    id: String(v.id),
    year: Number(v.year) || 2024,
    make: String(v.make || ""),
    model: String(v.model || ""),
    category: String(v.category || "sedan") as VehicleCategory,
    images: (v.images as string[]) || [],
    specs: (v.specs as Vehicle["specs"]) || { passengers: 0, luggage: 0, mpg: 0 },
    dailyRate: Number(v.daily_rate ?? 0),
    features: (v.features as string[]) || [],
    isAvailable: Boolean(v.is_available),
    description: String(v.description || ""),
    color: String(v.color || ""),
    mileage: Number(v.mileage ?? 0),
    maintenanceStatus: String(v.maintenance_status || "good") as Vehicle["maintenanceStatus"],
  };
}
