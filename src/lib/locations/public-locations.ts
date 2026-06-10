import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import type { BookingLocation } from "@/app/booking/booking-constants";

/** Server-side fetch for booking flow (SSR/RSC). Mirrors GET /api/locations. */
export async function fetchPublicLocations(): Promise<BookingLocation[]> {
  const supabase = getServiceSupabase();

  try {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, address, city, state, zip, surcharge, is_default, lat, lng")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("name");

    if (error) {
      logger.error("Public locations fetch error:", error);
      return [];
    }

    return (data || []).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      address: String(row.address ?? ""),
      city: String(row.city ?? ""),
      state: String(row.state ?? ""),
      zip: String(row.zip ?? ""),
      lat: row.lat != null ? Number(row.lat) : undefined,
      lng: row.lng != null ? Number(row.lng) : undefined,
      surcharge: Number(row.surcharge ?? 0),
      is_default: Boolean(row.is_default),
    }));
  } catch (err) {
    logger.error("Public locations fetch error:", err);
    return [];
  }
}
