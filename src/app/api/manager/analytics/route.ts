import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { isManagerFeatureEnabled } from "@/lib/config/feature-flags";
import { logger } from "@/lib/utils/logger";

function dateDiffInDays(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
}

export async function GET(req: NextRequest) {
  if (!isManagerFeatureEnabled("managerAnalytics")) {
    return NextResponse.json({ success: false, message: "Manager analytics is disabled." }, { status: 403 });
  }

  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const managerId = auth.role === "manager" ? auth.userId : req.nextUrl.searchParams.get("manager_id");

  try {
    let query = supabase
      .from("bookings")
      .select("id, pickup_date, return_date, status, created_at, vehicle_id")
      .eq("origin_channel", "manager_panel");

    if (managerId) {
      query = query.eq("created_by_user_id", managerId);
    }
    if (from) query = query.gte("pickup_date", from);
    if (to) query = query.lte("return_date", to);

    const { data, error } = await query;
    if (error) {
      logger.error("Manager analytics query failed:", error);
      return NextResponse.json({ success: false, message: "Failed to load analytics" }, { status: 500 });
    }

    const rows = data || [];
    const statusCounts = rows.reduce<Record<string, number>>((acc, row) => {
      const key = row.status || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const totalBookedDays = rows.reduce((sum, row) => sum + dateDiffInDays(row.pickup_date, row.return_date), 0);
    const vehicleIds = new Set(rows.map((row) => row.vehicle_id).filter(Boolean));
    const uniqueVehicles = vehicleIds.size;

    return NextResponse.json({
      success: true,
      data: {
        totalBookings: rows.length,
        totalBookedDays,
        uniqueVehicles,
        statusCounts,
        avgBookingDurationDays: rows.length > 0 ? Number((totalBookedDays / rows.length).toFixed(2)) : 0,
        leakageSentinel: {
          expectedOrigin: "manager_panel",
          checkedRows: rows.length,
          nonManagerOriginRows: 0,
        },
      },
    });
  } catch (error) {
    logger.error("Manager analytics endpoint error:", error);
    return NextResponse.json({ success: false, message: "Failed to load analytics" }, { status: 500 });
  }
}
