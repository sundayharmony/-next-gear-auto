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
      .select("id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason, is_extension, original_end_date, created_at")
      .gte("end_date", new Date().toISOString().split("T")[0])
      .order("start_date", { ascending: true });

    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("Blocked dates GET error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] }, {
      headers: {
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (err) {
    logger.error("Blocked dates GET error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch blocked dates" }, { status: 500 });
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
    const { vehicleId, startDate, endDate, source, reason, pickupTime, returnTime, location, earnings } = body;

    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json({ success: false, message: "vehicleId, startDate, and endDate are required" }, { status: 400 });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json({ success: false, message: "Dates must be YYYY-MM-DD format" }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json({ success: false, message: "End date must be on or after start date" }, { status: 400 });
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
      return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
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
        { success: false, message: `Overlapping blocked dates already exist (${existing[0].start_date} to ${existing[0].end_date})` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("blocked_dates")
      .insert({
        vehicle_id: vehicleId,
        start_date: startDate,
        end_date: endDate,
        pickup_time: pickupTime ?? null,
        return_time: returnTime ?? null,
        location: location ?? null,
        earnings: earnings ?? null,
        source: safeSource,
        reason: reason ?? null,
      })
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Blocked dates POST error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    logger.error("Blocked dates POST error:", err);
    return NextResponse.json({ success: false, message: "Failed to create blocked date" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/blocked-dates
 * Update an existing blocked date range.
 * Body: { id, vehicleId?, startDate?, endDate?, reason? }
 */
export async function PUT(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { id, vehicleId, startDate, endDate, reason, pickupTime, returnTime, location, earnings, forceOverride } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ success: false, message: "Invalid id format" }, { status: 400 });
    }

    // Build update object with only provided fields
    const updates: Record<string, string | number | boolean | null> = {};

    if (startDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return NextResponse.json({ success: false, message: "startDate must be YYYY-MM-DD format" }, { status: 400 });
      }
      updates.start_date = startDate;
    }

    if (endDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return NextResponse.json({ success: false, message: "endDate must be YYYY-MM-DD format" }, { status: 400 });
      }
      updates.end_date = endDate;
    }

    if (vehicleId !== undefined) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("id", vehicleId)
        .maybeSingle();
      if (!vehicle) {
        return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
      }
      updates.vehicle_id = vehicleId;
    }

    if (reason !== undefined) {
      updates.reason = reason || null;
    }

    if (pickupTime !== undefined) {
      updates.pickup_time = pickupTime || null;
    }

    if (returnTime !== undefined) {
      updates.return_time = returnTime || null;
    }

    if (location !== undefined) {
      updates.location = location || null;
    }

    if (earnings !== undefined) {
      updates.earnings = earnings ?? null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
    }

    // Validate date ordering if both dates are being set or one is being changed
    const finalStart = updates.start_date as string | undefined;
    const finalEnd = updates.end_date as string | undefined;
    if (finalStart && finalEnd && finalEnd < finalStart) {
      return NextResponse.json({ success: false, message: "End date must be on or after start date" }, { status: 400 });
    }

    // Fetch current record (needed for overlap check and extension detection)
    const { data: current } = await supabase
      .from("blocked_dates")
      .select("vehicle_id, start_date, end_date")
      .eq("id", id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ success: false, message: "Blocked date not found" }, { status: 404 });
    }

    const checkVehicle = (updates.vehicle_id as string) || current.vehicle_id;
    const checkStart = (updates.start_date as string) || current.start_date;
    const checkEnd = (updates.end_date as string) || current.end_date;

    if (checkEnd < checkStart) {
      return NextResponse.json({ success: false, message: "End date must be on or after start date" }, { status: 400 });
    }

    // Detect if this is an extension (end date pushed later)
    if (updates.end_date && current.end_date && (updates.end_date as string) > current.end_date) {
      updates.is_extension = true;
      updates.original_end_date = current.end_date;
    }

    // Check for overlapping blocked dates (exclude self)
    if (updates.start_date || updates.end_date || updates.vehicle_id) {
      const { data: existing } = await supabase
        .from("blocked_dates")
        .select("id, start_date, end_date, reason")
        .eq("vehicle_id", checkVehicle)
        .neq("id", id)
        .lte("start_date", checkEnd)
        .gte("end_date", checkStart);

      if (existing && existing.length > 0 && !forceOverride) {
        return NextResponse.json(
          {
            success: false,
            message: `Overlapping blocked dates exist (${existing[0].start_date} to ${existing[0].end_date})`,
            overlapping: existing.map((e) => ({
              id: e.id,
              start_date: e.start_date,
              end_date: e.end_date,
              reason: e.reason,
            })),
          },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("blocked_dates")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Blocked dates PUT error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, message: "Blocked date not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("Blocked dates PUT error:", err);
    return NextResponse.json({ success: false, message: "Failed to update blocked date" }, { status: 500 });
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
      return NextResponse.json({ success: false, message: "id param is required" }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ success: false, message: "Invalid id format" }, { status: 400 });
    }

    const { data: deleted, error } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      logger.error("Blocked dates DELETE error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ success: false, message: "Blocked date not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Blocked date removed" });
  } catch (err) {
    logger.error("Blocked dates DELETE error:", err);
    return NextResponse.json({ success: false, message: "Failed to delete blocked date" }, { status: 500 });
  }
}
