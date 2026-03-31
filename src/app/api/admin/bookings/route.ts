import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";

// GET: List all bookings for admin (with vehicle names)
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const vehicleId = searchParams.get("vehicle_id");

    // Single query with vehicle JOIN — eliminates the second DB round-trip
    let query = supabase
      .from("bookings")
      .select("*, vehicles(year, make, model), pickup_location_id, pickup_location_name, return_location_id, return_location_name, location_surcharge")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);
    const offset = (Math.max(1, page) - 1) * limit;

    const { data: bookings, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      logger.error("Admin bookings fetch error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    const enriched = (bookings || []).map((b) => {
      const v = b.vehicles as unknown as { year: number; make: string; model: string } | null;
      const { vehicles: _v, ...rest } = b;
      return {
        ...rest,
        vehicleName: v ? getVehicleDisplayName(v) : "Unknown Vehicle",
        customerName: b.customer_name || "Guest",
      };
    });

    return NextResponse.json({ data: enriched, success: true }, {
      headers: {
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
