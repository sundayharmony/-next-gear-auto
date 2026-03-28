import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const supabase = getServiceSupabase();

  try {
    let query = supabase
      .from("vehicles")
      .select("id, year, make, model, category, daily_rate, images, is_available, features, specs, mileage, license_plate, maintenance_status, color, vin, description")
      .eq("is_published", true)
      .order("created_at", { ascending: true });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    let { data, error } = await query;

    // Fallback: if is_published filter fails (column may not exist yet), retry without it
    if (error || !data || data.length === 0) {
      let fallbackQuery = supabase
        .from("vehicles")
        .select("id, year, make, model, category, daily_rate, images, is_available, features, specs, mileage, license_plate, maintenance_status, color, vin, description")
        .order("created_at", { ascending: true });

      if (category && category !== "all") {
        fallbackQuery = fallbackQuery.eq("category", category);
      }

      const fallbackResult = await fallbackQuery;
      if (!fallbackResult.error && fallbackResult.data) {
        data = fallbackResult.data;
        error = null;
      }
    }

    if (!error && data && data.length > 0) {
      const vehicles = data.map((v) => ({
        id: v.id,
        year: v.year || 2024,
        make: v.make || "",
        model: v.model || "",
        category: v.category,
        images: v.images || [],
        specs: v.specs || {},
        dailyRate: v.daily_rate,
        features: v.features || [],
        isAvailable: v.is_available,
        description: v.description || "",
        color: v.color || "",
        mileage: v.mileage ?? 0,
        licensePlate: v.license_plate || "",
        vin: v.vin || "",
        maintenanceStatus: v.maintenance_status || "good",
      }));
      return NextResponse.json(
        { data: vehicles, success: true },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }
  } catch (error) {
    logger.error("Vehicles API error:", error);
  }

  // Return empty array if no vehicles found or error
  return NextResponse.json({ data: [], success: true });
}
