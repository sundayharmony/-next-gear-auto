import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";
import { isManagerFeatureEnabled } from "@/lib/config/feature-flags";

const sortColumnMap: Record<string, string> = {
  customer_name: "customer_name",
  pickup_date: "pickup_date",
  return_date: "return_date",
  total_price: "total_price",
  deposit: "deposit",
  status: "status",
  created_at: "created_at",
};

export async function GET(req: NextRequest) {
  if (!isManagerFeatureEnabled("managerPanelRoutes")) {
    return NextResponse.json({ success: false, message: "Manager panel routes are disabled." }, { status: 403 });
  }

  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  const status = req.nextUrl.searchParams.get("status");
  const managerId = req.nextUrl.searchParams.get("manager_id");
  const search = req.nextUrl.searchParams.get("search");
  const sortParam = req.nextUrl.searchParams.get("sort");
  const orderParam = req.nextUrl.searchParams.get("order");

  const sortColumn = sortParam && sortColumnMap[sortParam] ? sortColumnMap[sortParam] : "created_at";
  const isAscending = orderParam === "asc";

  try {
    const today = new Date().toISOString().slice(0, 10);
    let query = supabase.from("bookings").select("*, vehicles(year, make, model)");

    if (auth.role === "manager") {
      // Managers can see all active and upcoming trips across channels.
      query = query
        .not("status", "in", "(cancelled,completed)")
        .gte("return_date", today);
    } else if (managerId) {
      query = query.eq("created_by_user_id", managerId);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      const safeSearch = (search || "").slice(0, 100);
      const sanitized = safeSearch.replace(/[%_*(),.<>!=&|]/g, "");
      if (sanitized) {
        const escapedSearch = encodeURIComponent(sanitized);
        query = query.or(
          `customer_name.ilike.%${escapedSearch}%,customer_email.ilike.%${escapedSearch}%,id.eq.${escapedSearch}`
        );
      }
    }

    query = query.order(sortColumn, { ascending: isAscending });

    const { data, error } = await query;
    if (error) {
      logger.error("Manager bookings fetch failed:", error);
      return NextResponse.json({ success: false, message: "Failed to fetch manager bookings" }, { status: 500 });
    }

    const enriched = (data || []).map((b) => {
      const v = b.vehicles as unknown as { year: number; make: string; model: string } | null;
      const { vehicles: _vehicle, ...rest } = b;
      const canViewPricing = auth.role === "admin" || b.created_by_user_id === auth.userId;
      const canManage = auth.role === "admin" || b.created_by_user_id === auth.userId;

      const total_price = canViewPricing ? b.total_price : null;
      const deposit = canViewPricing ? b.deposit : null;
      const location_surcharge = canViewPricing ? b.location_surcharge : null;
      return {
        ...rest,
        total_price,
        deposit,
        location_surcharge,
        canViewPricing,
        canManage,
        vehicleName: v ? getVehicleDisplayName(v) : "Unknown Vehicle",
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    logger.error("Manager bookings endpoint error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch manager bookings" }, { status: 500 });
  }
}
