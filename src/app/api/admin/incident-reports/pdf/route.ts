import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getVehicleDisplayName } from "@/lib/types";
import { generateIncidentPdf } from "@/lib/documents/billing-record-pdf";
import { displayDocumentNumber } from "@/lib/documents/short-document-number";
import type { DocumentLineItem } from "@/lib/documents/document-line-items";
import { logger } from "@/lib/utils/logger";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id?.startsWith("inc_")) {
    return NextResponse.json({ success: false, message: "Incident id required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("incident_reports")
    .select(
      "id, booking_id, vehicle_id, title, description, occurred_at, status, notes, line_items"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("Incident PDF load error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ success: false, message: "Incident report not found" }, { status: 404 });
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

  const documentNumber = displayDocumentNumber(data.id);
  const pdfBytes = await generateIncidentPdf({
    id: data.id,
    documentNumber,
    title: data.title,
    status: data.status,
    occurredAt: data.occurred_at,
    description: data.description || "",
    vehicleName,
    customerName,
    bookingId: data.booking_id,
    lineItems: (data.line_items ?? []) as DocumentLineItem[],
    notes: data.notes || "",
  });

  const safeName = documentNumber;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="incident-${safeName}.pdf"`,
    },
  });
}
