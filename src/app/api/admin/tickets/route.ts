import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

// GET: List tickets with optional filters
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("booking_id");
    const customerId = searchParams.get("customer_id");
    const vehicleId = searchParams.get("vehicle_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("tickets")
      .select(
        `
        id,
        booking_id,
        customer_id,
        vehicle_id,
        license_plate,
        ticket_type,
        violation_date,
        state,
        municipality,
        court_id,
        prefix,
        ticket_number,
        amount_due,
        status,
        notes,
        created_at,
        vehicles(id, year, make, model),
        bookings(id, customer_name, pickup_date, return_date)
      `
      )
      .order("violation_date", { ascending: false });

    if (bookingId) query = query.eq("booking_id", bookingId);
    if (customerId) query = query.eq("customer_id", customerId);
    if (vehicleId) query = query.eq("vehicle_id", vehicleId);
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      logger.error("Tickets GET error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const records = (data || []).map((t) => {
      const v = t.vehicles as unknown as {
        year: number;
        make: string;
        model: string;
      } | null;
      const b = t.bookings as unknown as {
        id: string;
        customer_name: string;
        pickup_date: string;
        return_date: string;
      } | null;
      return {
        id: t.id,
        bookingId: t.booking_id,
        customerId: t.customer_id,
        vehicleId: t.vehicle_id,
        licensePlate: t.license_plate || "",
        ticketType: t.ticket_type || "traffic",
        violationDate: t.violation_date || "",
        state: t.state || "",
        municipality: t.municipality || "",
        courtId: t.court_id || "",
        prefix: t.prefix || "",
        ticketNumber: t.ticket_number || "",
        amountDue: t.amount_due || 0,
        status: t.status || "unpaid",
        notes: t.notes || "",
        createdAt: t.created_at || "",
        vehicleName: v ? `${v.year} ${v.make} ${v.model}` : "",
        customerName: b?.customer_name || "",
        bookingDates: b
          ? `${b.pickup_date} → ${b.return_date}`
          : "",
      };
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    logger.error("Tickets GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

// POST: Create a new ticket
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const body = await req.json();
    const {
      bookingId,
      customerId,
      vehicleId,
      licensePlate,
      ticketType,
      violationDate,
      state,
      municipality,
      courtId,
      prefix,
      ticketNumber,
      amountDue,
      status,
      notes,
    } = body;

    if (!violationDate) {
      return NextResponse.json(
        { success: false, message: "Violation date is required" },
        { status: 400 }
      );
    }

    const id = "tkt_" + crypto.randomUUID();

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        id,
        booking_id: bookingId || null,
        customer_id: customerId || null,
        vehicle_id: vehicleId || null,
        license_plate: licensePlate || null,
        ticket_type: ticketType || "traffic",
        violation_date: violationDate,
        state: state || null,
        municipality: municipality || null,
        court_id: courtId || null,
        prefix: prefix || null,
        ticket_number: ticketNumber || null,
        amount_due: amountDue ? parseFloat(amountDue) : 0,
        status: status || "unpaid",
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      logger.error("Ticket create error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}

// PUT: Update a ticket
export async function PUT(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Ticket ID required" },
        { status: 400 }
      );
    }

    const dbUpdates: Record<string, unknown> = {};
    if (updates.bookingId !== undefined) dbUpdates.booking_id = updates.bookingId;
    if (updates.customerId !== undefined) dbUpdates.customer_id = updates.customerId;
    if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;
    if (updates.licensePlate !== undefined) dbUpdates.license_plate = updates.licensePlate;
    if (updates.ticketType !== undefined) dbUpdates.ticket_type = updates.ticketType;
    if (updates.violationDate !== undefined) dbUpdates.violation_date = updates.violationDate;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.municipality !== undefined) dbUpdates.municipality = updates.municipality;
    if (updates.courtId !== undefined) dbUpdates.court_id = updates.courtId;
    if (updates.prefix !== undefined) dbUpdates.prefix = updates.prefix;
    if (updates.ticketNumber !== undefined) dbUpdates.ticket_number = updates.ticketNumber;
    if (updates.amountDue !== undefined)
      dbUpdates.amount_due = parseFloat(updates.amountDue);
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase
      .from("tickets")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      logger.error("Ticket update error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Ticket updated" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}

// DELETE: Delete a ticket
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Ticket ID required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("tickets").delete().eq("id", id);

    if (error) {
      logger.error("Ticket delete error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Ticket deleted" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
