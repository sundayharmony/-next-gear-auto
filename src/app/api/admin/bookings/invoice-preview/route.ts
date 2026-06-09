import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { bookingInvoiceTemplate } from "@/lib/email/templates";
import { authorizeBookingInvoiceAccess } from "@/lib/invoices/invoice-auth";
import { buildBookingInvoiceData } from "@/lib/invoices/invoice-data";
import { defaultInvoiceDueDate, validateInvoiceDueDate } from "@/lib/invoices/invoice-due-date";
import { validateAdditionalInvoiceLineItems } from "@/lib/invoices/invoice-line-items";
import { getServiceSupabase } from "@/lib/db/supabase";
import { loadBookingWithVehicle } from "@/lib/invoices/invoice-service";
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

function bookingLookupResponse(ctx: Awaited<ReturnType<typeof loadBookingWithVehicle>>) {
  if ("error" in ctx) {
    return NextResponse.json(
      {
        success: false,
        message: ctx.error === "not_found" ? "Booking not found" : "Unable to load booking",
      },
      { status: ctx.error === "not_found" ? 404 : 500 },
    );
  }
  return null;
}

type BookingInvoiceCtx = Extract<
  Awaited<ReturnType<typeof loadBookingWithVehicle>>,
  { booking: Record<string, unknown> }
>;

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

    const supabase = getServiceSupabase();
    const loaded = await loadBookingWithVehicle(supabase, bookingId);
    const lookupErr = bookingLookupResponse(loaded);
    if (lookupErr) return lookupErr;
    const ctx = loaded as BookingInvoiceCtx;

    const denied = await authorizeBookingInvoiceAccess(
      auth,
      ctx.booking as { origin_channel: string | null; created_by_user_id: string | null },
      "preview",
    );
    if (denied) return denied;

    const invoiceData = buildBookingInvoiceData(
      { ...ctx.booking, vehicleName: ctx.vehicleName } as Parameters<
        typeof buildBookingInvoiceData
      >[0],
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

    const supabase = getServiceSupabase();
    const loaded = await loadBookingWithVehicle(supabase, bookingId);
    const lookupErr = bookingLookupResponse(loaded);
    if (lookupErr) return lookupErr;
    const ctx = loaded as BookingInvoiceCtx;

    const denied = await authorizeBookingInvoiceAccess(
      auth,
      ctx.booking as { origin_channel: string | null; created_by_user_id: string | null },
      "preview",
    );
    if (denied) return denied;

    const draftInvoice = buildBookingInvoiceData(
      { ...ctx.booking, vehicleName: ctx.vehicleName } as Parameters<
        typeof buildBookingInvoiceData
      >[0],
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
      { ...ctx.booking, vehicleName: ctx.vehicleName } as Parameters<
        typeof buildBookingInvoiceData
      >[0],
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
