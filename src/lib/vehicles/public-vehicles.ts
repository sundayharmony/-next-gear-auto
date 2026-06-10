import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import {
  mapPublicVehicleRow,
  PUBLIC_VEHICLE_SELECT,
  type PublicVehicleJson,
} from "@/lib/vehicles/public-vehicle-fields";

export { mapPublicVehicleRow, PUBLIC_VEHICLE_SELECT, type PublicVehicleJson };

/** Server-side fetch for public fleet pages (SSR/RSC). Mirrors GET /api/vehicles. */
export async function fetchPublicVehicles(category?: string | null): Promise<PublicVehicleJson[]> {
  const supabase = getServiceSupabase();

  try {
    let query = supabase
      .from("vehicles")
      .select(PUBLIC_VEHICLE_SELECT)
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
        .select(PUBLIC_VEHICLE_SELECT)
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

    return (data || []).map((row) => mapPublicVehicleRow(row as Record<string, unknown>));
  } catch (err) {
    logger.error("Public vehicles fetch error:", err);
    return [];
  }
}
