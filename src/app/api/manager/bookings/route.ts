import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";
import { isManagerFeatureEnabled } from "@/lib/config/feature-flags";
import {
  fetchGlobalOccupancy,
  occupancyToBookingRowCompat,
  sortOccupancyEntries,
} from "@/lib/admin/vehicle-occupancy";

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
    const includeTuro = req.nextUrl.searchParams.get("includeTuro") === "true";

    if (includeTuro) {
      let bq = supabase.from("bookings").select("*, vehicles(year, make, model)");
      if (auth.role === "manager") {
        bq = bq.not("status", "in", "(cancelled,completed)").gte("return_date", today);
      } else if (managerId) {
        bq = bq.eq("created_by_user_id", managerId);
      }
      if (search) {
        const safeSearch = (search || "").slice(0, 100);
        const sanitized = safeSearch.replace(/[%_*(),.<>!=&|]/g, "");
        if (sanitized) {
          const escapedSearch = encodeURIComponent(sanitized);
          bq = bq.or(
            `customer_name.ilike.%${escapedSearch}%,customer_email.ilike.%${escapedSearch}%,id.eq.${escapedSearch}`
          );
        }
      }
      bq = bq.order(sortColumn, { ascending: isAscending }).limit(2000);
      const { data: bookingRowsRaw, error: bqErr } = await bq;
      if (bqErr) {
        logger.error("Manager bookings includeTuro fetch failed:", bqErr);
        return NextResponse.json({ success: false, message: "Failed to fetch manager bookings" }, { status: 500 });
      }
      const role = auth.role === "manager" ? "manager" : "admin";
      let merged = await fetchGlobalOccupancy(supabase, role, auth.userId, {
        bookingRows: (bookingRowsRaw || []) as Record<string, unknown>[],
        status,
        from: null,
        to: null,
      });
      merged = sortOccupancyEntries(merged, sortColumn, isAscending);
      const enriched = merged.map((e) => {
        const row = occupancyToBookingRowCompat(e) as Record<string, unknown>;
        if (e.kind === "booking") {
          const raw = (bookingRowsRaw || []).find((x: { id?: string }) => x.id === e.id) as Record<string, unknown> | undefined;
          const canViewPricing = auth.role === "admin" || raw?.created_by_user_id === auth.userId;
          const canManage = auth.role === "admin" || raw?.created_by_user_id === auth.userId;
          row.canViewPricing = canViewPricing;
          row.canManage = canManage;
          row.total_price = canViewPricing ? raw?.total_price : null;
          row.deposit = canViewPricing ? raw?.deposit : null;
          row.location_surcharge = canViewPricing ? raw?.location_surcharge : null;
          row.is_overdue =
            e.kind === "booking" && e.return_date < today && e.status === "active";
        }
        return row;
      });
      return NextResponse.json({ success: true, data: enriched });
    }

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
