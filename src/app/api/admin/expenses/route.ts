import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

const VALID_CATEGORIES = [
  "maintenance",
  "insurance",
  "fuel",
  "cleaning",
  "parking",
  "registration",
  "other",
];

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);

    const vehicleId = searchParams.get("vehicle_id");
    const category = searchParams.get("category");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    let query = supabase.from("expenses").select("*");

    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (fromDate) {
      query = query.gte("date", fromDate);
    }

    if (toDate) {
      query = query.lte("date", toDate);
    }

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      logger.error("Error fetching expenses:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/admin/expenses:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json();
    const { vehicleId, category, amount, description, date } = body;

    // Validation
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: "Invalid category" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const id = "exp_" + crypto.randomUUID();

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          id,
          vehicle_id: vehicleId || null,
          category,
          amount: parseFloat(amount),
          description: description || null,
          date,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Error creating expense:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Unexpected error in POST /api/admin/expenses:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json();
    const { id, vehicleId, category, amount, description, date } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: "Invalid category" },
        { status: 400 }
      );
    }

    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const updates: Record<string, unknown> = {};
    if (vehicleId !== undefined) updates.vehicle_id = vehicleId || null;
    if (category !== undefined) updates.category = category;
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (description !== undefined) updates.description = description || null;
    if (date !== undefined) updates.date = date;

    const { data, error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating expense:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error("Unexpected error in PUT /api/admin/expenses:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      logger.error("Error deleting expense:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    logger.error("Unexpected error in DELETE /api/admin/expenses:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
