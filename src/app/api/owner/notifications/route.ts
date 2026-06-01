import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyOwner } from "@/lib/owner/owner-check";
import type { OwnerNotification } from "@/lib/types";
import { logger } from "@/lib/utils/logger";

/** GET /api/owner/notifications → the owner's notifications (newest first). */
export async function GET(req: NextRequest) {
  const auth = await verifyOwner(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("owner_notifications")
      .select("id, type, title, message, booking_id, vehicle_id, is_read, created_at")
      .eq("owner_id", auth.ownerId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      logger.error("Owner notifications GET error:", error);
      return NextResponse.json({ success: false, message: "Failed to load notifications" }, { status: 500 });
    }

    const notifications: OwnerNotification[] = (data || []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      bookingId: n.booking_id,
      vehicleId: n.vehicle_id,
      isRead: !!n.is_read,
      createdAt: n.created_at,
    }));
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json(
      { success: true, data: notifications, unreadCount },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Owner notifications GET error:", err);
    return NextResponse.json({ success: false, message: "Failed to load notifications" }, { status: 500 });
  }
}

/**
 * PATCH /api/owner/notifications
 * Body: { id } to mark one read, or { all: true } to mark all read.
 */
export async function PATCH(req: NextRequest) {
  const auth = await verifyOwner(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const body = await req.json();

    if (body.all === true) {
      const { error } = await supabase
        .from("owner_notifications")
        .update({ is_read: true })
        .eq("owner_id", auth.ownerId)
        .eq("is_read", false);
      if (error) {
        return NextResponse.json({ success: false, message: "Failed to update" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
    }

    // Scope the update to the owner so one owner can't touch another's rows.
    const { error } = await supabase
      .from("owner_notifications")
      .update({ is_read: true })
      .eq("id", body.id)
      .eq("owner_id", auth.ownerId);
    if (error) {
      return NextResponse.json({ success: false, message: "Failed to update" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Owner notifications PATCH error:", err);
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
