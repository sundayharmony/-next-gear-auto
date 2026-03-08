import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";

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

    // #region agent log
    fetch("http://127.0.0.1:7294/ingest/53c91875-0450-4365-9e2e-62372b8ba563",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"27d820"},body:JSON.stringify({sessionId:"27d820",runId:"baseline",hypothesisId:"H3",location:"src/app/api/vehicles/route.ts:22",message:"vehicles query result",data:{category,error:error?.message||null,rowCount:data?.length||0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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
      return NextResponse.json({ data: vehicles, success: true });
    }
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7294/ingest/53c91875-0450-4365-9e2e-62372b8ba563",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"27d820"},body:JSON.stringify({sessionId:"27d820",runId:"baseline",hypothesisId:"H3",location:"src/app/api/vehicles/route.ts:45",message:"vehicles route exception",data:{category,error:error instanceof Error ? error.message : "unknown"},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.error("Vehicles API error:", error);
  }

  // Return empty array if no vehicles found or error
  return NextResponse.json({ data: [], success: true });
}
