import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/admin/blocked-dates?vehicleId=...
 * List blocked dates, optionally filtered by vehicle.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");

    let query = supabase
      .from("blocked_dates")
      .select("*")
      .gte("end_date", new Date().toISOString().split("T")[0])
      .order("start_date", { ascending: true });

    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("Blocked dates GET error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] }, {
      headers: {
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (err) {
    logger.error("Blocked dates GET error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch blocked dates" }, { status: 500 });
  }
}

/**
 * POST /api/admin/blocked-dates
 * Create a new blocked date range.
 * Body: { vehicleId, startDate, endDate, source?, reason? }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { vehicleId, startDate, endDate, source, reason } = body;

    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "vehicleId, startDate, and endDate are required" }, { status: 400 });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json({ success: false, error: "Dates must be YYYY-MM-DD format" }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json({ success: false, error: "End date must be on or after start date" }, { status: 400 });
    }

    // Validate source
    const validSources = ["manual", "turo-email"];
    const safeSource = validSources.includes(source) ? source : "manual";

    // Verify vehicle exists
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .maybeSingle();

    if (!vehicle) {
      return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 });
    }

    // Check for overlapping blocked dates
    const { data: existing } = await supabase
      .from("blocked_dates")
      .select("id, start_date, end_date")
      .eq("vehicle_id", vehicleId)
      .lte("start_date", endDate)
      .gte("end_date", startDate);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Overlapping blocked dates already exist (${existing[0].start_date} to ${existing[0].end_date})` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("blocked_dates")
      .insert({
        vehicle_id: vehicleId,
        start_date: startDate,
        end_date: endDate,
        source: safeSource,
        reason: reason || null,
      })
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Blocked dates POST error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    logger.error("Blocked dates POST error:", err);
    return NextResponse.json({ success: false, error: "Failed to create blocked date" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/blocked-dates?id=...
 * Remove a blocked date range.
 */
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "id param is required" }, { status: 400 });
    }

    const { data: deleted, error } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      logger.error("Blocked dates DELETE error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ success: false, error: "Blocked date not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Blocked date removed" });
  } catch (err) {
    logger.error("Blocked dates DELETE error:", err);
    return NextResponse.json({ success: false, error: "Failed to delete blocked date" }, { status: 500 });
  }
}
