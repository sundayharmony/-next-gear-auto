import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getVehicleDisplayName } from "@/lib/types";
import { generateTicketPdf } from "@/lib/documents/billing-record-pdf";
import type { DocumentLineItem } from "@/lib/documents/document-line-items";
import { logger } from "@/lib/utils/logger";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, message: "Ticket id required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, booking_id, vehicle_id, license_plate, ticket_type, violation_date, state, municipality, prefix, ticket_number, amount_due, status, notes, line_items"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("Ticket PDF load error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 });
  }

  let vehicleName = "";
  if (data.vehicle_id) {
    const { data: v } = await supabase
      .from("vehicles")
      .select("year, make, model")
      .eq("id", data.vehicle_id)
      .maybeSingle();
    if (v) vehicleName = getVehicleDisplayName(v);
  }
  let customerName = "";
  if (data.booking_id) {
    const { data: b } = await supabase
      .from("bookings")
      .select("customer_name")
      .eq("id", data.booking_id)
      .maybeSingle();
    customerName = b?.customer_name || "";
  }
  const ticketLabel =
    data.prefix && data.ticket_number ? `${data.prefix}-${data.ticket_number}` : data.id;

  const pdfBytes = await generateTicketPdf({
    id: data.id,
    ticketLabel,
    ticketType: data.ticket_type,
    violationDate: data.violation_date,
    status: data.status,
    amountDue: Number(data.amount_due) || 0,
    state: data.state || "",
    municipality: data.municipality || "",
    licensePlate: data.license_plate || "",
    vehicleName,
    customerName,
    bookingId: data.booking_id,
    lineItems: (data.line_items ?? []) as DocumentLineItem[],
    notes: data.notes || "",
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ticket-${ticketLabel.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf"`,
    },
  });
}
