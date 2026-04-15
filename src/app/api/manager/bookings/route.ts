import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";
import { isManagerFeatureEnabled } from "@/lib/config/feature-flags";

export async function GET(req: NextRequest) {
  if (!isManagerFeatureEnabled("managerPanelRoutes")) {
    return NextResponse.json({ success: false, message: "Manager panel routes are disabled." }, { status: 403 });
  }

  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  const status = req.nextUrl.searchParams.get("status");
  const managerId = req.nextUrl.searchParams.get("manager_id");

  try {
    let query = supabase
      .from("bookings")
      .select("*, vehicles(year, make, model)")
      .eq("origin_channel", "manager_panel")
      .order("created_at", { ascending: false });

    const effectiveManagerId = auth.role === "manager" ? auth.userId : managerId;
    if (effectiveManagerId) {
      query = query.eq("created_by_user_id", effectiveManagerId);
    }
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("Manager bookings fetch failed:", error);
      return NextResponse.json({ success: false, message: "Failed to fetch manager bookings" }, { status: 500 });
    }

    const enriched = (data || []).map((b) => {
      const v = b.vehicles as unknown as { year: number; make: string; model: string } | null;
      const { vehicles: _vehicle, ...rest } = b;
      return {
        ...rest,
        vehicleName: v ? getVehicleDisplayName(v) : "Unknown Vehicle",
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    logger.error("Manager bookings endpoint error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch manager bookings" }, { status: 500 });
  }
}
