import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";

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
        photo_urls,
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
      const records = data.map((record) => {
        const v = record.vehicles as unknown as { year: number; make: string; model: string } | null;
        return {
        id: record.id,
        vehicleId: record.vehicle_id,
        vehicleName: v ? getVehicleDisplayName(v) : "Unknown Vehicle",
        title: record.title || "",
        description: record.description || "",
        status: record.status || "pending",
        cost: record.cost ?? null,
        photoUrls: record.photo_urls || [],
        scheduledDate: record.scheduled_date || "",
        startedDate: record.started_date || "",
        completedDate: record.completed_date || "",
        notes: record.notes || "",
        createdAt: record.created_at || "",
      };
      });

      return NextResponse.json({ success: true, data: records }, {
        headers: {
          "Cache-Control": "no-store, no-cache",
        },
      });
    }

    return NextResponse.json({ success: true, data: [] }, {
      headers: {
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (error) {
    logger.error("Admin maintenance GET error:", error);
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
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }
    const { vehicleId, title, description, cost, scheduledDate, status, startedDate, completedDate, notes } = body;

    if (!vehicleId || !title) {
      return NextResponse.json(
        { success: false, message: "vehicleId and title are required" },
        { status: 400 }
      );
    }

    // Validate cost field if provided (must be >= 0)
    if (cost !== undefined && cost !== null) {
      if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) {
        return NextResponse.json(
          { success: false, message: "Cost must be a non-negative number (>= 0)" },
          { status: 400 }
        );
      }
    }

    // Validate date fields if provided
    const validateDate = (dateStr: string | null, fieldName: string) => {
      if (dateStr && typeof dateStr === "string") {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${fieldName} format`);
        }
      }
    };

    try {
      validateDate(scheduledDate, "scheduledDate");
      validateDate(startedDate, "startedDate");
      validateDate(completedDate, "completedDate");
    } catch (err) {
      return NextResponse.json(
        { success: false, message: err instanceof Error ? err.message : "Invalid date format" },
        { status: 400 }
      );
    }

    const id = "mt_" + crypto.randomUUID();
    const VALID_STATUSES = ["pending", "in-progress", "completed", "cancelled"];
    const recordStatus = VALID_STATUSES.includes(status) ? status : "pending";

    const { data, error } = await supabase
      .from("maintenance_records")
      .insert({
        id,
        vehicle_id: vehicleId,
        title,
        description: description || "",
        status: recordStatus,
        cost: cost ?? null,
        photo_urls: [],
        scheduled_date: scheduledDate || null,
        started_date: startedDate || null,
        completed_date: completedDate || null,
        notes: notes || "",
      })
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Maintenance create error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Update vehicle maintenance status based on record status
    let vehicleMaintenanceStatus = "needs-service";
    if (recordStatus === "completed") {
      vehicleMaintenanceStatus = "good";
    } else if (recordStatus === "in-progress") {
      vehicleMaintenanceStatus = "in-maintenance";
    }

    const { error: vehicleUpdateError } = await supabase
      .from("vehicles")
      .update({ maintenance_status: vehicleMaintenanceStatus })
      .eq("id", vehicleId);

    if (vehicleUpdateError) {
      logger.error("Failed to update vehicle maintenance status:", vehicleUpdateError);
    }

    // Ensure data is not null before building response
    if (!data) {
      logger.error("Maintenance POST returned null data");
      return NextResponse.json(
        { success: false, message: "Failed to create record" },
        { status: 500 }
      );
    }

    const response = {
      id: data.id || "",
      vehicleId: data.vehicle_id || "",
      title: data.title || "",
      description: data.description || "",
      status: data.status || "pending",
      cost: data.cost ?? null,
      photoUrls: data.photo_urls || [],
      scheduledDate: data.scheduled_date || null,
      startedDate: data.started_date || null,
      completedDate: data.completed_date || null,
      notes: data.notes || "",
      createdAt: data.created_at || "",
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

    // Validate cost field if being updated (must be >= 0)
    if (updates.cost !== undefined && updates.cost !== null) {
      if (typeof updates.cost !== "number" || !Number.isFinite(updates.cost) || updates.cost < 0) {
        return NextResponse.json(
          { success: false, message: "Cost must be a non-negative number (>= 0)" },
          { status: 400 }
        );
      }
    }

    // Validate date fields if being updated
    const validateDate = (dateStr: any, fieldName: string) => {
      if (dateStr && typeof dateStr === "string") {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${fieldName} format`);
        }
      }
    };

    try {
      if (updates.scheduledDate !== undefined) validateDate(updates.scheduledDate, "scheduledDate");
      if (updates.startedDate !== undefined) validateDate(updates.startedDate, "startedDate");
      if (updates.completedDate !== undefined) validateDate(updates.completedDate, "completedDate");
    } catch (err) {
      return NextResponse.json(
        { success: false, message: err instanceof Error ? err.message : "Invalid date format" },
        { status: 400 }
      );
    }

    // Build DB updates mapping camelCase to snake_case
    const dbUpdates: Record<string, unknown> = {};
    if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
    if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.startedDate !== undefined) dbUpdates.started_date = updates.startedDate;
    if (updates.completedDate !== undefined) dbUpdates.completed_date = updates.completedDate;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.photoUrls !== undefined) dbUpdates.photo_urls = updates.photoUrls;

    // Get the record to find vehicleId
    const { data: record } = await supabase
      .from("maintenance_records")
      .select("vehicle_id")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("maintenance_records")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      logger.error("Maintenance update error:", error);
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

      // Use the new vehicleId if it was changed, otherwise use the existing one
      const targetVehicleId = updates.vehicleId || record.vehicle_id;
      if (targetVehicleId) {
        const { error: vErr } = await supabase
          .from("vehicles")
          .update({ maintenance_status: vehicleStatus })
          .eq("id", targetVehicleId);
        if (vErr) logger.error("Failed to update vehicle status:", vErr);
      }
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

    // Fetch record first to get photo URLs for storage cleanup
    const { data: record } = await supabase
      .from("maintenance_records")
      .select("photo_urls")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("maintenance_records")
      .delete()
      .eq("id", id);

    // Clean up photos from Supabase storage after successful delete
    if (!error && record?.photo_urls && record.photo_urls.length > 0) {
      try {
        const bucket = "maintenance-photos";
        const filePaths = record.photo_urls
          .map((url: string) => {
            // Extract storage path from public URL
            const marker = `/storage/v1/object/public/${bucket}/`;
            const idx = url.indexOf(marker);
            return idx !== -1 ? url.substring(idx + marker.length) : null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await supabase.storage.from(bucket).remove(filePaths);
        }
      } catch (cleanupErr) {
        logger.error("Failed to clean up maintenance photos from storage:", cleanupErr);
        // Don't fail the delete — record is already gone
      }
    }

    if (error) {
      logger.error("Maintenance delete error:", error);
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
