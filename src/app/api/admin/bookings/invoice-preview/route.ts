import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import {
  fetchCustomerManagerAccessRow,
  isManagerPanelAccessEnabled,
} from "@/lib/auth/manager-access";
import { isAdminRole, isManagerRole } from "@/lib/auth/roles";
import { bookingInvoiceTemplate } from "@/lib/email/templates";
import { buildBookingInvoiceData } from "@/lib/invoices/invoice-data";
import { defaultInvoiceDueDate, validateInvoiceDueDate } from "@/lib/invoices/invoice-due-date";
import { validateAdditionalInvoiceLineItems } from "@/lib/invoices/invoice-line-items";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";

const BOOKING_ID_RE = /^bk[0-9a-f]{7}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseBookingId(raw: string | null | undefined): string | null {
  const bookingId = raw?.trim() || "";
  if (!bookingId || (!BOOKING_ID_RE.test(bookingId) && !UUID_RE.test(bookingId))) {
    return null;
  }
  return bookingId;
}

async function authorizeBookingInvoiceAccess(
  auth: Awaited<ReturnType<typeof verifyAdminOrManager>>,
  booking: {
    origin_channel: string | null;
    created_by_user_id: string | null;
  },
  action: "preview" | "send",
): Promise<NextResponse | null> {
  if (!auth.authorized) return auth.response;

  const verb = action === "send" ? "send" : "preview";

  if (isManagerRole(auth.role)) {
    const supabase = getServiceSupabase();
    const accessRow = await fetchCustomerManagerAccessRow(supabase, auth.userId);
    if (!isManagerPanelAccessEnabled(accessRow)) {
      return NextResponse.json(
        { success: false, message: "Manager panel access is disabled" },
        { status: 403 },
      );
    }
    if (
      booking.origin_channel !== "manager_panel" ||
      booking.created_by_user_id !== auth.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Managers can only ${verb} invoices for their own bookings`,
        },
        { status: 403 },
      );
    }
  } else if (!isAdminRole(auth.role)) {
    return NextResponse.json(
      { success: false, message: "Staff access required" },
      { status: 403 },
    );
  }

  return null;
}

async function loadBookingInvoiceContext(bookingId: string) {
  const supabase = getServiceSupabase();
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr) {
    logger.error("Invoice preview booking lookup error:", bookingErr);
    return {
      error: NextResponse.json(
        { success: false, message: "Unable to load booking" },
        { status: 500 },
      ),
    };
  }

  if (!booking) {
    return { error: NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 }) };
  }

  let vehicleName = "Vehicle";
  let vehicleDailyRate: number | null = null;
  if (booking.vehicle_id) {
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("year, make, model, daily_rate")
      .eq("id", booking.vehicle_id)
      .maybeSingle();

    if (vehicle) {
      vehicleName = getVehicleDisplayName(vehicle);
      vehicleDailyRate =
        typeof vehicle.daily_rate === "number"
          ? vehicle.daily_rate
          : Number(vehicle.daily_rate) || null;
    }
  }

  return {
    booking,
    vehicleName,
    vehicleDailyRate,
  };
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  try {
    const bookingId = parseBookingId(req.nextUrl.searchParams.get("bookingId"));
    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "Valid bookingId is required" },
        { status: 400 },
      );
    }

    const ctx = await loadBookingInvoiceContext(bookingId);
    if ("error" in ctx) return ctx.error;

    const denied = await authorizeBookingInvoiceAccess(auth, ctx.booking, "preview");
    if (denied) return denied;

    const invoiceData = buildBookingInvoiceData(
      { ...ctx.booking, vehicleName: ctx.vehicleName },
      { vehicleDailyRate: ctx.vehicleDailyRate },
    );

    return NextResponse.json({
      success: true,
      data: {
        lineItems: invoiceData.lineItems,
        chargesTotal: invoiceData.chargesTotal,
        amountPaid: invoiceData.amountPaid,
        balanceDue: invoiceData.balanceDue,
        customerEmail: invoiceData.customerEmail,
        customerName: invoiceData.customerName,
        invoiceDate: invoiceData.invoiceDate,
        defaultDueDate: defaultInvoiceDueDate(),
      },
    });
  } catch (error) {
    logger.error("Invoice preview error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load invoice preview" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  try {
    let body: { bookingId?: string; additionalLineItems?: unknown; dueDate?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const bookingId = parseBookingId(body.bookingId);
    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "Valid bookingId is required" },
        { status: 400 },
      );
    }

    const additionalParsed = validateAdditionalInvoiceLineItems(body.additionalLineItems);
    if (!additionalParsed.ok) {
      return NextResponse.json(
        { success: false, message: additionalParsed.message },
        { status: 400 },
      );
    }

    const ctx = await loadBookingInvoiceContext(bookingId);
    if ("error" in ctx) return ctx.error;

    const denied = await authorizeBookingInvoiceAccess(auth, ctx.booking, "preview");
    if (denied) return denied;

    const draftInvoice = buildBookingInvoiceData(
      { ...ctx.booking, vehicleName: ctx.vehicleName },
      { vehicleDailyRate: ctx.vehicleDailyRate },
    );
    const dueParsed = validateInvoiceDueDate(body.dueDate, draftInvoice.invoiceDate);
    if (!dueParsed.ok) {
      return NextResponse.json(
        { success: false, message: dueParsed.message },
        { status: 400 },
      );
    }

    const invoiceData = buildBookingInvoiceData(
      { ...ctx.booking, vehicleName: ctx.vehicleName },
      {
        vehicleDailyRate: ctx.vehicleDailyRate,
        additionalLineItems: additionalParsed.items,
        dueDate: dueParsed.dueDate,
      },
    );

    const html = bookingInvoiceTemplate(invoiceData);

    return NextResponse.json({
      success: true,
      data: { html },
    });
  } catch (error) {
    logger.error("Invoice HTML preview error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to render invoice preview" },
      { status: 500 },
    );
  }
}
