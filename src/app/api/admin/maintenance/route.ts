import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";

// GET: List all maintenance records with optional filters
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicle_id");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabase
      .from("maintenance_records")
      .select(
        `
        id,
        vehicle_id,
        title,
        description,
        status,
        cost,
        receipt_urls,
        scheduled_date,
        started_date,
        completed_date,
        notes,
        created_at,
        vehicles(id, year, make, model)
      `
      )
      .order("created_at", { ascending: false });

    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (from) {
      query = query.gte("scheduled_date", from);
    }

    if (to) {
      query = query.lte("scheduled_date", to);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const records = data.map((record: any) => ({
        id: record.id,
        vehicleId: record.vehicle_id,
        vehicleName: record.vehicles
          ? `${record.vehicles.year} ${record.vehicles.make} ${record.vehicles.model}`
          : "Unknown",
        title: record.title || "",
        description: record.description || "",
        status: record.status || "pending",
        cost: record.cost || null,
        receiptUrls: record.receipt_urls || [],
        scheduledDate: record.scheduled_date || "",
        startedDate: record.started_date || "",
        completedDate: record.completed_date || "",
        notes: record.notes || "",
        createdAt: record.created_at || "",
      }));

      return NextResponse.json({ success: true, data: records });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error("Admin maintenance GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch records" },
      { status: 500 }
    );
  }
}

// POST: Create a new maintenance record
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const body = await req.json();
    const { vehicleId, title, description, cost, scheduledDate, notes } = body;

    if (!vehicleId || !title) {
      return NextResponse.json(
        { success: false, message: "vehicleId and title are required" },
        { status: 400 }
      );
    }

    const id = "mt" + Date.now();

    const { data, error } = await supabase
      .from("maintenance_records")
      .insert({
        id,
        vehicle_id: vehicleId,
        title,
        description: description || "",
        status: "pending",
        cost: cost || null,
        receipt_urls: [],
        scheduled_date: scheduledDate || null,
        started_date: null,
        completed_date: null,
        notes: notes || "",
      })
      .select()
      .single();

    if (error) {
      console.error("Maintenance create error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Update vehicle maintenance status to "needs-service"
    await supabase
      .from("vehicles")
      .update({ maintenance_status: "needs-service" })
      .eq("id", vehicleId);

    const response = {
      id: data.id,
      vehicleId: data.vehicle_id,
      title: data.title,
      description: data.description,
      status: data.status,
      cost: data.cost,
      receiptUrls: data.receipt_urls,
      scheduledDate: data.scheduled_date,
      startedDate: data.started_date,
      completedDate: data.completed_date,
      notes: data.notes,
      createdAt: data.created_at,
    };

    return NextResponse.json({ success: true, data: response }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}

// PUT: Update maintenance record
export async function PUT(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Record ID required" },
        { status: 400 }
      );
    }

    // Build DB updates mapping camelCase to snake_case
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
    if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.startedDate !== undefined) dbUpdates.started_date = updates.startedDate;
    if (updates.completedDate !== undefined) dbUpdates.completed_date = updates.completedDate;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.receiptUrls !== undefined) dbUpdates.receipt_urls = updates.receiptUrls;

    // Get the record to find vehicleId
    const { data: record } = await supabase
      .from("maintenance_records")
      .select("vehicle_id")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("maintenance_records")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Maintenance update error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Update vehicle maintenance status based on record status
    if (record && updates.status) {
      let vehicleStatus = "needs-service";
      if (updates.status === "completed") {
        vehicleStatus = "good";
      } else if (updates.status === "in-progress") {
        vehicleStatus = "in-maintenance";
      }

      await supabase
        .from("vehicles")
        .update({ maintenance_status: vehicleStatus })
        .eq("id", record.vehicle_id);
    }

    return NextResponse.json({ success: true, message: "Record updated" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}

// DELETE: Delete maintenance record
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Record ID required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("maintenance_records")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Maintenance delete error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Record deleted" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
