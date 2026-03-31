import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

// GET: Fetch booking activity records
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "booking_id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Parse and validate pagination parameters
    let limit = 100;
    let offset = 0;

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 1000) {
        limit = parsedLimit;
      }
    }

    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        offset = parsedOffset;
      }
    }

    // Validate date range if provided
    if (fromDate && toDate) {
      const from = new Date(fromDate.includes("T") ? fromDate : fromDate + "T00:00:00");
      const to = new Date(toDate.includes("T") ? toDate : toDate + "T00:00:00");
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json(
          { success: false, error: "Invalid date format for from_date or to_date" },
          { status: 400 }
        );
      }
      if (from > to) {
        return NextResponse.json(
          { success: false, error: "from_date must be before or equal to to_date" },
          { status: 400 }
        );
      }
    }

    let query = supabase
      .from("booking_activity")
      .select("*", { count: "exact" })
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    // Apply date range filters if provided
    if (fromDate) {
      query = query.gte("created_at", fromDate);
    }
    if (toDate) {
      query = query.lte("created_at", toDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error("Error fetching booking activity:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/admin/booking-activity:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new booking activity record
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { booking_id, action, details, performed_by } = body;

    // Validation
    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: "booking_id is required" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: "action is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const id = crypto.randomUUID();

    const { data, error } = await supabase
      .from("booking_activity")
      .insert([
        {
          id,
          booking_id,
          action,
          details: details || null,
          performed_by: performed_by || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    if (error) {
      logger.error("Error creating booking activity:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { id: data?.id || id },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Unexpected error in POST /api/admin/booking-activity:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
