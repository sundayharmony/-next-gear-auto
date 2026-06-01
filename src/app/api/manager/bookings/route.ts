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
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import {
  bookingIsCurrentlyOccupying,
  enrichBookingOverdueFields,
} from "@/lib/utils/recurring-booking";
import { sanitizePostgrestSearch } from "@/lib/utils/safe-url";
import {
  canManageBooking,
  canViewBookingFinancials,
  redactBookingFinancials,
} from "@/lib/bookings/financial-access";

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
    const today = formatYyyyMmDdLocal(new Date());
    const includeTuro = req.nextUrl.searchParams.get("includeTuro") === "true";

    if (includeTuro) {
      let bq = supabase.from("bookings").select("*, vehicles(year, make, model)");
      if (auth.role === "manager") {
        bq = bq.not("status", "in", "(cancelled,completed)");
      } else if (managerId) {
        bq = bq.eq("created_by_user_id", managerId);
      }
      if (search) {
        const safeSearch = (search || "").slice(0, 100);
        const sanitized = sanitizePostgrestSearch(safeSearch);
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
          const canView = canViewBookingFinancials(auth.role, raw);
          row.canManage = canManageBooking(auth.role, raw, auth.userId);
          row.total_price = raw?.total_price ?? null;
          row.deposit = raw?.deposit ?? null;
          row.location_surcharge = raw?.location_surcharge ?? null;
          const overdueFields = enrichBookingOverdueFields(
            {
              pickup_date: e.pickup_date,
              return_date: e.return_date,
              status: e.status,
              total_price: (raw?.total_price as number | null) ?? null,
              deposit: (raw?.deposit as number | null) ?? null,
              admin_notes: (raw?.admin_notes as string | null) ?? null,
            },
            today
          );
          Object.assign(row, overdueFields);
          // Centralized authorization: strips ALL financial fields (incl.
          // derived totals and payment-overdue status) when access is denied.
          return redactBookingFinancials(row, canView);
        }
        return row;
      });
      return NextResponse.json({ success: true, data: enriched });
    }

    let query = supabase.from("bookings").select("*, vehicles(year, make, model)");

    if (auth.role === "manager") {
      query = query.not("status", "in", "(cancelled,completed)");
    } else if (managerId) {
      query = query.eq("created_by_user_id", managerId);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      const safeSearch = (search || "").slice(0, 100);
      const sanitized = sanitizePostgrestSearch(safeSearch);
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

    let enriched = (data || []).map((b) => {
      const v = b.vehicles as unknown as { year: number; make: string; model: string } | null;
      const { vehicles: _vehicle, ...rest } = b;
      const overdueFields = enrichBookingOverdueFields(
        {
          pickup_date: b.pickup_date,
          return_date: b.return_date,
          status: b.status,
          total_price: b.total_price,
          deposit: b.deposit,
          admin_notes: b.admin_notes,
        },
        today
      );
      // Centralized authorization: strips ALL financial fields (incl. derived
      // totals and payment-overdue status) when manager access is denied.
      return redactBookingFinancials(
        {
          ...rest,
          canManage: canManageBooking(auth.role, b, auth.userId),
          vehicleName: v ? getVehicleDisplayName(v) : "Unknown Vehicle",
          ...overdueFields,
        },
        canViewBookingFinancials(auth.role, b)
      );
    });

    if (auth.role === "manager") {
      enriched = enriched.filter((b) =>
        bookingIsCurrentlyOccupying(
          {
            pickup_date: b.pickup_date,
            return_date: b.return_date,
            admin_notes: b.admin_notes,
            status: b.status,
          },
          today
        )
      );
    }

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    logger.error("Manager bookings endpoint error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch manager bookings" }, { status: 500 });
  }
}
