import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { isAdminRole, isManagerRole } from "@/lib/auth/roles";
import { authorizeBookingInvoiceAccess } from "@/lib/invoices/invoice-auth";
import {
  backfillInvoicesFromActivity,
  enrichInvoiceWithBooking,
  type DbInvoiceRow,
} from "@/lib/invoices/invoice-service";
import { invoiceTableMissingMessage } from "@/lib/invoices/invoice-db-errors";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const bookingIdFilter = searchParams.get("bookingId")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "all";
    const search = searchParams.get("q")?.trim().toLowerCase() || "";
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

    if (searchParams.get("backfill") === "1" && isAdminRole(auth.role)) {
      const supabase = getServiceSupabase();
      const result = await backfillInvoicesFromActivity(supabase);
      return NextResponse.json({ success: true, data: result });
    }

    const supabase = getServiceSupabase();
    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .order("sent_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (bookingIdFilter) {
      query = query.eq("booking_id", bookingIdFilter);
    }

    if (isManagerRole(auth.role)) {
      const { data: managerBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("origin_channel", "manager_panel")
        .eq("created_by_user_id", auth.userId);

      const ids = (managerBookings ?? []).map((b) => b.id);
      if (ids.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          limit,
          offset,
        });
      }
      query = query.in("booking_id", ids);
    }

    const needsClientFilter = !bookingIdFilter && (statusFilter !== "all" || !!search);
    const { data: invoices, error, count } = needsClientFilter
      ? await query.limit(1000)
      : await query.range(offset, offset + limit - 1);

    if (error) {
      logger.error("Invoices list error:", error);
      const missing = invoiceTableMissingMessage(error);
      return NextResponse.json(
        { success: false, message: missing ?? "Failed to load invoices" },
        { status: missing ? 503 : 500 },
      );
    }

    const bookingIds = [...new Set((invoices ?? []).map((i) => i.booking_id))];
    const bookingsMap = new Map<string, Record<string, unknown>>();
    const vehicleNames = new Map<string, string>();

    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .in("id", bookingIds);

      for (const b of bookings ?? []) {
        bookingsMap.set(b.id, b);
      }

      const vehicleIds = [...new Set((bookings ?? []).map((b) => b.vehicle_id).filter(Boolean))];
      if (vehicleIds.length > 0) {
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, year, make, model")
          .in("id", vehicleIds);

        for (const v of vehicles ?? []) {
          vehicleNames.set(v.id, getVehicleDisplayName(v));
        }
      }
    }

    let rows = (invoices ?? []).map((inv) => {
      const booking = bookingsMap.get(inv.booking_id) ?? null;
      const vehicleName = booking?.vehicle_id
        ? vehicleNames.get(booking.vehicle_id as string) ?? "Vehicle"
        : "Vehicle";
      return enrichInvoiceWithBooking(inv as DbInvoiceRow, booking, vehicleName);
    });

    if (search) {
      rows = rows.filter(
        (r) =>
          r.customer_name?.toLowerCase().includes(search) ||
          r.customer_email?.toLowerCase().includes(search) ||
          r.booking_id.toLowerCase().includes(search),
      );
    }

    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.paymentStatus === statusFilter);
    }

    const total = needsClientFilter ? rows.length : (count ?? rows.length);
    const pagedRows = needsClientFilter ? rows.slice(offset, offset + limit) : rows;

    return NextResponse.json({
      success: true,
      data: pagedRows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("GET invoices error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load invoices" },
      { status: 500 },
    );
  }
}
