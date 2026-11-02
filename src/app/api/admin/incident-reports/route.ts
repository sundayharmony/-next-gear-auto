import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { validateDocumentLineItems } from "@/lib/documents/document-line-items";
import { parseTripAssociation } from "@/lib/documents/trip-association";
import { logger } from "@/lib/utils/logger";
import { generateShortDocumentCode } from "@/lib/documents/short-document-number";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id");
  const blockedDateId = searchParams.get("blocked_date_id");
  const vehicleId = searchParams.get("vehicle_id");
  const status = searchParams.get("status");

  let query = supabase
    .from("incident_reports")
    .select(
      "id, booking_id, blocked_date_id, vehicle_id, title, description, occurred_at, status, line_items, notes, created_at"
    )
    .order("occurred_at", { ascending: false })
    .limit(1000);

  if (bookingId) query = query.eq("booking_id", bookingId);
  if (blockedDateId) query = query.eq("blocked_date_id", blockedDateId);
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    if (/incident_reports/i.test(error.message) && /does not exist|relation/i.test(error.message)) {
      return NextResponse.json({
        success: true,
        data: [],
        warning: "incident_reports table missing — run supabase-tickets-incidents-upgrade.sql",
      });
    }
    logger.error("Incident reports GET error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  const records = (data || []).map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    blockedDateId: row.blocked_date_id,
    vehicleId: row.vehicle_id,
    title: row.title,
    description: row.description || "",
    occurredAt: row.occurred_at,
    status: row.status,
    lineItems: row.line_items ?? [],
    notes: row.notes || "",
    createdAt: row.created_at,
    vehicleName: "",
    customerName: "",
    bookingDates: "",
  }));

  return NextResponse.json({ success: true, data: records });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  try {
    const body = await req.json();
    const { bookingId, blockedDateId } = parseTripAssociation(body);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const occurredAt = typeof body.occurredAt === "string" ? body.occurredAt.trim() : "";
    if (!title || !occurredAt) {
      return NextResponse.json(
        { success: false, message: "Title and occurred date are required" },
        { status: 400 }
      );
    }
    const lineParsed = validateDocumentLineItems(body.lineItems);
    if (!lineParsed.ok) {
      return NextResponse.json({ success: false, message: lineParsed.message }, { status: 400 });
    }

    let id = "";
    let data = null;
    let error = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      id = `inc_${generateShortDocumentCode(6)}`;
      const inserted = await supabase
        .from("incident_reports")
        .insert({
          id,
          booking_id: bookingId,
          blocked_date_id: blockedDateId,
          vehicle_id: body.vehicleId || null,
          title,
          description: body.description || null,
          occurred_at: occurredAt,
          status: body.status || "open",
          line_items: lineParsed.items,
          notes: body.notes || null,
        })
        .select()
        .maybeSingle();
      if (!inserted.error) {
        data = inserted.data;
        error = null;
        break;
      }
      error = inserted.error;
      if (!/duplicate|unique/i.test(inserted.error.message)) break;
    }

    if (error) {
      logger.error("Incident report create error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id.startsWith("inc_")) {
      return NextResponse.json({ success: false, message: "Invalid incident id" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.occurredAt !== undefined) updates.occurred_at = body.occurredAt;
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes || null;
    if (body.vehicleId !== undefined) updates.vehicle_id = body.vehicleId || null;
    if (body.bookingId !== undefined || body.blockedDateId !== undefined) {
      const trip = parseTripAssociation(body);
      updates.booking_id = trip.bookingId;
      updates.blocked_date_id = trip.blockedDateId;
    }
    if (body.lineItems !== undefined) {
      const lineParsed = validateDocumentLineItems(body.lineItems);
      if (!lineParsed.ok) {
        return NextResponse.json({ success: false, message: lineParsed.message }, { status: 400 });
      }
      updates.line_items = lineParsed.items;
    }

    const { data, error } = await supabase
      .from("incident_reports")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id?.startsWith("inc_")) {
    return NextResponse.json({ success: false, message: "Incident id required" }, { status: 400 });
  }

  const { error } = await supabase.from("incident_reports").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
