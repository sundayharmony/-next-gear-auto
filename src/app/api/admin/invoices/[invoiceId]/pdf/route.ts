import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { authorizeBookingInvoiceAccess } from "@/lib/invoices/invoice-auth";
import {
  buildInvoicePayload,
  loadBookingWithVehicle,
  type DbInvoiceRow,
} from "@/lib/invoices/invoice-service";
import { generateInvoicePdf } from "@/lib/invoices/invoice-pdf";
import { normalizeAdditionalLineItems } from "@/lib/invoices/invoice-line-items";
import { logger } from "@/lib/utils/logger";

import { displayDocumentNumber, INVOICE_ID_RE } from "@/lib/documents/short-document-number";

type RouteContext = { params: Promise<{ invoiceId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  try {
    const { invoiceId } = await context.params;
    if (!INVOICE_ID_RE.test(invoiceId)) {
      return NextResponse.json({ success: false, message: "Invalid invoice ID" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (error || !invoice) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    const ctx = await loadBookingWithVehicle(supabase, invoice.booking_id);
    if ("error" in ctx) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const denied = await authorizeBookingInvoiceAccess(
      auth,
      ctx.booking as { origin_channel: string | null; created_by_user_id: string | null },
      "manage",
    );
    if (denied) return denied;

    const row = invoice as DbInvoiceRow;
    const additional = normalizeAdditionalLineItems(row.additional_line_items ?? []);
    const built = buildInvoicePayload(ctx.booking, ctx.vehicleName, ctx.vehicleDailyRate, {
      additionalLineItems: additional,
      dueDate: row.due_date,
    });
    if (!built.ok) {
      return NextResponse.json({ success: false, message: built.message }, { status: 400 });
    }

    const documentNumber = displayDocumentNumber(row.id);
    const pdfBytes = await generateInvoicePdf(built.invoiceData, { documentNumber });
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${documentNumber}.pdf"`,
      },
    });
  } catch (err) {
    logger.error("Invoice PDF error:", err);
    return NextResponse.json({ success: false, message: "Failed to generate PDF" }, { status: 500 });
  }
}
