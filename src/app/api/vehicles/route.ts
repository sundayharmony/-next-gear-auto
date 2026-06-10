import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { mapPublicVehicleRow, PUBLIC_VEHICLE_SELECT } from "@/lib/vehicles/public-vehicle-fields";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
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

    if (!error && data && data.length > 0) {
      const vehicles = data.map((v) => mapPublicVehicleRow(v as Record<string, unknown>));
      return NextResponse.json(
        { success: true, data: vehicles },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
      );
    }

    if (error) {
      logger.error("Vehicles fetch error:", error);
      return NextResponse.json(
        { data: [], success: false, message: "Failed to fetch vehicles" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: [], success: true });
  } catch (error) {
    logger.error("Vehicles API error:", error);
    return NextResponse.json(
      { data: [], success: false, message: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}
