import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import type { Vehicle, VehicleCategory } from "@/lib/types";

const SELECT_CLAUSE =
  "id, year, make, model, category, daily_rate, images, is_available, features, specs, mileage, license_plate, maintenance_status, color, vin, description";

function mapVehicleRow(v: Record<string, unknown>): Vehicle {
  return {
    id: String(v.id),
    year: Number(v.year) || 2024,
    make: String(v.make || ""),
    model: String(v.model || ""),
    category: (String(v.category || "sedan") as VehicleCategory),
    images: (v.images as string[]) || [],
    specs: (v.specs as Vehicle["specs"]) || { passengers: 0, luggage: 0, mpg: 0 },
    dailyRate: Number(v.daily_rate ?? 0),
    features: (v.features as string[]) || [],
    isAvailable: Boolean(v.is_available),
    description: String(v.description || ""),
    color: String(v.color || ""),
    mileage: Number(v.mileage ?? 0),
    licensePlate: String(v.license_plate || ""),
    vin: String(v.vin || ""),
    maintenanceStatus: (String(v.maintenance_status || "good") as Vehicle["maintenanceStatus"]),
  };
}

/** Server-side fetch for public fleet pages (SSR/RSC). Mirrors GET /api/vehicles. */
export async function fetchPublicVehicles(category?: string | null): Promise<Vehicle[]> {
  const supabase = getServiceSupabase();

  try {
    let query = supabase
      .from("vehicles")
      .select(SELECT_CLAUSE)
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .limit(100);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    let { data, error } = await query;

    if (!error && (!data || data.length === 0)) {
      let fallbackQuery = supabase
        .from("vehicles")
        .select(SELECT_CLAUSE)
        .eq("is_available", true)
        .order("make", { ascending: true })
        .order("model", { ascending: true })
        .limit(100);

      if (category && category !== "all") {
        fallbackQuery = fallbackQuery.eq("category", category);
      }

      const fallbackResult = await fallbackQuery;
      if (!fallbackResult.error && fallbackResult.data) {
        data = fallbackResult.data;
        error = null;
      }
    }

    if (error) {
      logger.error("Public vehicles fetch error:", error);
      return [];
    }

    return (data || []).map((row) => mapVehicleRow(row as Record<string, unknown>));
  } catch (err) {
    logger.error("Public vehicles fetch error:", err);
    return [];
  }
}
