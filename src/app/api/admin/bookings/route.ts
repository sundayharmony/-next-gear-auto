import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";

// GET: List all bookings for admin (with vehicle names)
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const vehicleId = searchParams.get("vehicle_id");

    let query = supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Admin bookings fetch error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    // Fetch vehicle names for all bookings
    const vehicleIds = [
      ...new Set((bookings || []).map((b) => b.vehicle_id).filter(Boolean)),
    ];
    let vehicleMap: Record<string, string> = {};

    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, year, make, model")
        .in("id", vehicleIds);

      if (vehicles) {
        vehicleMap = Object.fromEntries(
          vehicles.map((v) => [v.id, `${v.year} ${v.make} ${v.model}`])
        );
      }
    }

    const enriched = (bookings || []).map((b) => ({
      ...b,
      vehicleName: vehicleMap[b.vehicle_id] || "Unknown",
      customerName: b.customer_name || "Guest",
    }));

    return NextResponse.json({ data: enriched, success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
