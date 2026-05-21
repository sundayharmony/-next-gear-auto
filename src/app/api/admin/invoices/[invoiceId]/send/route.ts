import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { authorizeBookingInvoiceAccess } from "@/lib/invoices/invoice-auth";
import { loadBookingWithVehicle, sendInvoiceEmail } from "@/lib/invoices/invoice-service";
import { logger } from "@/lib/utils/logger";

const INV_ID_RE = /^inv_[a-z0-9]{8,32}$/i;

type RouteContext = { params: Promise<{ invoiceId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
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
    const { data: invoice } = await supabase
      .from("invoices")
      .select("booking_id")
      .eq("id", invoiceId)
      .maybeSingle();

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
    }, "send");
    if (denied) return denied;

    const { data: staff } = await supabase
      .from("customers")
      .select("email")
      .eq("id", auth.userId)
      .maybeSingle();

    const performedBy = staff?.email || auth.userId;
    const result = await sendInvoiceEmail(supabase, invoiceId, performedBy);

    if (!result.ok) {
      const status =
        result.code === "not_found" ? 404 : result.code === "validation" ? 400 : 500;
      return NextResponse.json({ success: false, message: result.message }, { status });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        balanceDue: result.balanceDue,
        hadPdf: result.hadPdf,
      },
    });
  } catch (error) {
    logger.error("POST invoice send error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send invoice" },
      { status: 500 },
    );
  }
}
