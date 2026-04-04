import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const supabase = getServiceSupabase();

  try {
    const selectClause = "id, year, make, model, category, daily_rate, images, is_available, features, specs, mileage, license_plate, maintenance_status, color, vin, description";

    let query = supabase
      .from("vehicles")
      .select(selectClause)
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .limit(100);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    let { data, error } = await query;

    // Fallback: if is_published filter returns empty (not on error), retry with is_available
    if (!error && (!data || data.length === 0)) {
      let fallbackQuery = supabase
        .from("vehicles")
        .select(selectClause)
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
        { success: true, data: vehicles },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
      );
    }

    // If there was an error, return it (but don't expose internal details)
    if (error) {
      logger.error("Vehicles fetch error:", error);
      return NextResponse.json(
        { data: [], success: false, message: "Failed to fetch vehicles" },
        { status: 500 }
      );
    }

    // No vehicles found
    return NextResponse.json({ data: [], success: true });
  } catch (error) {
    logger.error("Vehicles API error:", error);
    return NextResponse.json(
      { data: [], success: false, message: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}
