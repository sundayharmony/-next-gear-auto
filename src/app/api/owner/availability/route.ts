import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyOwner } from "@/lib/owner/owner-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { notifyOwner } from "@/lib/owner/notifications";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/owner/availability
 * Returns the owner's vehicles, blocked-date ranges, and confirmed booking
 * ranges so the calendar can distinguish booked / available / owner-blocked.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyOwner(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { vehicles } = await loadOwnerDataset(auth.ownerId);
    const vehicleIds = vehicles.map((v) => v.id);
    if (vehicleIds.length === 0) {
      return NextResponse.json({ success: true, data: { vehicles: [], blockedDates: [], bookedRanges: [] } });
    }

    const [{ data: blocked }, { data: bookings }] = await Promise.all([
      supabase
        .from("blocked_dates")
        .select("id, vehicle_id, start_date, end_date, reason, source, owner_id")
        .in("vehicle_id", vehicleIds)
        .order("start_date", { ascending: true }),
      supabase
        .from("bookings")
        .select("id, vehicle_id, pickup_date, return_date, status")
        .in("vehicle_id", vehicleIds)
        .not("status", "in", "(cancelled,no-show)")
        .order("pickup_date", { ascending: true }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          vehicles,
          blockedDates: (blocked || []).map((b) => ({
            id: b.id,
            vehicleId: b.vehicle_id,
            startDate: b.start_date,
            endDate: b.end_date,
            reason: b.reason,
            source: b.source,
            // Only owner-created blocks (source 'owner' + owner_id match) are removable here.
            removable: b.source === "owner" && b.owner_id === auth.ownerId,
          })),
          bookedRanges: (bookings || []).map((b) => ({
            id: b.id,
            vehicleId: b.vehicle_id,
            startDate: b.pickup_date,
            endDate: b.return_date,
            status: b.status,
          })),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Owner availability GET error:", err);
    return NextResponse.json({ success: false, message: "Failed to load availability" }, { status: 500 });
  }
}

/**
 * POST /api/owner/availability
 * Block a date range for one of the owner's vehicles. Cannot overlap an
 * existing booking or an existing block.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyOwner(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { vehicleId, startDate, endDate, reason } = body;

    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json({ success: false, message: "vehicleId, startDate, and endDate are required" }, { status: 400 });
    }
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      return NextResponse.json({ success: false, message: "Dates must be YYYY-MM-DD format" }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ success: false, message: "End date must be on or after start date" }, { status: 400 });
    }

    // Ownership check — the vehicle MUST belong to this owner.
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, year, make, model, owner_id")
      .eq("id", vehicleId)
      .maybeSingle();
    if (!vehicle || vehicle.owner_id !== auth.ownerId) {
      return NextResponse.json({ success: false, message: "You do not own this vehicle" }, { status: 403 });
    }

    // Cannot override an existing (non-cancelled) booking.
    const { data: conflictingBookings } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date")
      .eq("vehicle_id", vehicleId)
      .not("status", "in", "(cancelled,no-show)")
      .lte("pickup_date", endDate)
      .gte("return_date", startDate);
    if (conflictingBookings && conflictingBookings.length > 0) {
      return NextResponse.json(
        { success: false, message: "These dates overlap an existing booking and cannot be blocked." },
        { status: 409 }
      );
    }

    // Cannot overlap an existing block.
    const { data: conflictingBlocks } = await supabase
      .from("blocked_dates")
      .select("id, start_date, end_date")
      .eq("vehicle_id", vehicleId)
      .lte("start_date", endDate)
      .gte("end_date", startDate);
    if (conflictingBlocks && conflictingBlocks.length > 0) {
      return NextResponse.json(
        { success: false, message: `These dates overlap an existing block (${conflictingBlocks[0].start_date} to ${conflictingBlocks[0].end_date}).` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("blocked_dates")
      .insert({
        vehicle_id: vehicleId,
        start_date: startDate,
        end_date: endDate,
        source: "owner",
        owner_id: auth.ownerId,
        reason: reason ? String(reason).slice(0, 200) : "Owner blocked",
      })
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Owner availability POST error:", error);
      return NextResponse.json({ success: false, message: "Failed to block dates" }, { status: 500 });
    }

    await notifyOwner({
      ownerId: auth.ownerId,
      type: "availability_changed",
      title: "Availability updated",
      message: `You blocked ${getVehicleDisplayName(vehicle)} from ${startDate} to ${endDate}.`,
      vehicleId,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    logger.error("Owner availability POST error:", err);
    return NextResponse.json({ success: false, message: "Failed to block dates" }, { status: 500 });
  }
}

/**
 * DELETE /api/owner/availability?id=...
 * Remove an owner-created block. Admin/Turo blocks are not removable here.
 */
export async function DELETE(req: NextRequest) {
  const auth = await verifyOwner(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const id = new URL(req.url).searchParams.get("id");
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ success: false, message: "Valid id is required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("blocked_dates")
      .select("id, source, owner_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: false, message: "Block not found" }, { status: 404 });
    }
    if (existing.source !== "owner" || existing.owner_id !== auth.ownerId) {
      return NextResponse.json(
        { success: false, message: "You can only remove blocks you created." },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    if (error) {
      logger.error("Owner availability DELETE error:", error);
      return NextResponse.json({ success: false, message: "Failed to remove block" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Block removed" });
  } catch (err) {
    logger.error("Owner availability DELETE error:", err);
    return NextResponse.json({ success: false, message: "Failed to remove block" }, { status: 500 });
  }
}
