import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import vehiclesJson from "@/data/vehicles.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const supabase = getServiceSupabase();

  try {
    let query = supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: true });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

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
        mileage: v.mileage || 0,
        licensePlate: v.license_plate || "",
        vin: v.vin || "",
        maintenanceStatus: v.maintenance_status || "good",
      }));
      return NextResponse.json({ data: vehicles, success: true });
    }
  } catch {
    // Fall through to JSON
  }

  // Fallback to static JSON
  let filtered = vehiclesJson;
  if (category && category !== "all") {
    filtered = vehiclesJson.filter((v) => v.category === category);
  }

  return NextResponse.json({ data: filtered, success: true });
}
