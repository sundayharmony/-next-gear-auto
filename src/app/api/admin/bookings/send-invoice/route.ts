import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import {
  fetchCustomerManagerAccessRow,
  isManagerPanelAccessEnabled,
} from "@/lib/auth/manager-access";
import { isAdminRole, isManagerRole } from "@/lib/auth/roles";
import { sendBookingInvoice } from "@/lib/email/mailer";
import { buildBookingInvoiceData } from "@/lib/invoices/invoice-data";
import { generateInvoicePdf } from "@/lib/invoices/invoice-pdf";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import { isValidEmailFormat } from "@/lib/utils/validation";

const BOOKING_ID_RE = /^bk[0-9a-f]{7}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  try {
    let body: { bookingId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    if (!bookingId || (!BOOKING_ID_RE.test(bookingId) && !UUID_RE.test(bookingId))) {
      return NextResponse.json(
        { success: false, message: "Valid bookingId is required" },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    if (isManagerRole(auth.role)) {
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
          { success: false, message: "Managers can only send invoices for their own bookings" },
          { status: 403 },
        );
      }
    } else if (!isAdminRole(auth.role)) {
      return NextResponse.json(
        { success: false, message: "Staff access required" },
        { status: 403 },
      );
    }

    const customerEmail = (booking.customer_email || "").trim();
    if (!customerEmail || !isValidEmailFormat(customerEmail)) {
      return NextResponse.json(
        { success: false, message: "Booking has no valid customer email" },
        { status: 400 },
      );
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

    const invoiceData = buildBookingInvoiceData(
      {
        ...booking,
        vehicleName,
      },
      { vehicleDailyRate },
    );

    let pdfBytes: Uint8Array | undefined;
    try {
      pdfBytes = await generateInvoicePdf(invoiceData);
      if (pdfBytes.length > 10 * 1024 * 1024) {
        pdfBytes = undefined;
      }
    } catch (pdfErr) {
      logger.warn("Invoice PDF generation failed, sending HTML only:", pdfErr);
    }

    await sendBookingInvoice({
      ...invoiceData,
      customerEmail,
      pdfBytes,
    });

    const { data: staff } = await supabase
      .from("customers")
      .select("email")
      .eq("id", auth.userId)
      .maybeSingle();

    const performedBy = staff?.email || auth.userId;

    await supabase.from("booking_activity").insert({
      booking_id: bookingId,
      action: "invoice_sent",
      details: {
        to: customerEmail,
        balance_due: invoiceData.balanceDue,
        charges_total: invoiceData.chargesTotal,
        had_pdf: !!pdfBytes,
      },
      performed_by: performedBy,
    });

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${customerEmail}`,
      data: {
        balanceDue: invoiceData.balanceDue,
        hadPdf: !!pdfBytes,
      },
    });
  } catch (error) {
    logger.error("Send invoice error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send invoice" },
      { status: 500 },
    );
  }
}
