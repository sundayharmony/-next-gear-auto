import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { authorizeBookingInvoiceAccess } from "@/lib/invoices/invoice-auth";
import {
  enrichInvoiceWithBooking,
  loadBookingWithVehicle,
  upsertInvoiceFromBooking,
  type DbInvoiceRow,
} from "@/lib/invoices/invoice-service";
import { validateAdditionalInvoiceLineItems } from "@/lib/invoices/invoice-line-items";
import { validateInvoiceDueDate } from "@/lib/invoices/invoice-due-date";
import { logger } from "@/lib/utils/logger";

const INV_ID_RE = /^inv_[a-z0-9]{8,32}$/i;

type RouteContext = { params: Promise<{ invoiceId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  try {
    const { invoiceId } = await context.params;
    if (!INV_ID_RE.test(invoiceId)) {
      return NextResponse.json(
        { success: false, message: "Invalid invoice ID" },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (error) {
      logger.error("Invoice GET error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to load invoice" },
        { status: 500 },
      );
    }
    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      );
    }

    const ctx = await loadBookingWithVehicle(supabase, invoice.booking_id);
    if ("error" in ctx) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    const denied = await authorizeBookingInvoiceAccess(auth, ctx.booking as {
      origin_channel: string | null;
      created_by_user_id: string | null;
    }, "manage");
    if (denied) return denied;

    const { data: sendHistory } = await supabase
      .from("booking_activity")
      .select("id, created_at, performed_by, details")
      .eq("booking_id", invoice.booking_id)
      .eq("action", "invoice_sent")
      .order("created_at", { ascending: false });

    const enriched = enrichInvoiceWithBooking(
      invoice as DbInvoiceRow,
      ctx.booking,
      ctx.vehicleName,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...enriched,
        sendHistory: sendHistory ?? [],
      },
    });
  } catch (error) {
    logger.error("GET invoice detail error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load invoice" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  try {
    const { invoiceId } = await context.params;
    if (!INV_ID_RE.test(invoiceId)) {
      return NextResponse.json(
        { success: false, message: "Invalid invoice ID" },
        { status: 400 },
      );
    }

    let body: { additionalLineItems?: unknown; dueDate?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (error || !invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      );
    }

    const ctx = await loadBookingWithVehicle(supabase, invoice.booking_id);
    if ("error" in ctx) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    const denied = await authorizeBookingInvoiceAccess(auth, ctx.booking as {
      origin_channel: string | null;
      created_by_user_id: string | null;
    }, "manage");
    if (denied) return denied;

    const additionalParsed = validateAdditionalInvoiceLineItems(
      body.additionalLineItems ?? invoice.additional_line_items,
    );
    if (!additionalParsed.ok) {
      return NextResponse.json(
        { success: false, message: additionalParsed.message },
        { status: 400 },
      );
    }

    const dueDate =
      typeof body.dueDate === "string" ? body.dueDate : invoice.due_date;
    const draft = await import("@/lib/invoices/invoice-data").then((m) =>
      m.buildBookingInvoiceData(
        { ...ctx.booking, vehicleName: ctx.vehicleName } as Parameters<
          typeof m.buildBookingInvoiceData
        >[0],
        { vehicleDailyRate: ctx.vehicleDailyRate },
      ),
    );
    const dueParsed = validateInvoiceDueDate(dueDate, draft.invoiceDate);
    if (!dueParsed.ok) {
      return NextResponse.json(
        { success: false, message: dueParsed.message },
        { status: 400 },
      );
    }

    const result = await upsertInvoiceFromBooking(supabase, invoice.booking_id, {
      additionalLineItems: additionalParsed.items,
      dueDate: dueParsed.dueDate,
    });

    if (!result.ok) {
      const status = result.code === "not_found" ? 404 : result.code === "validation" ? 400 : 500;
      return NextResponse.json({ success: false, message: result.message }, { status });
    }

    const enriched = enrichInvoiceWithBooking(
      result.invoice,
      ctx.booking,
      ctx.vehicleName,
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    logger.error("PATCH invoice error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update invoice" },
      { status: 500 },
    );
  }
}
