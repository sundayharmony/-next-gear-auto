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

const MAX_EXPENSE_AMOUNT = 1000000;

function validateExpenseInput(
  category: unknown,
  amount: unknown
): { valid: boolean; error?: string } {
  // Validate category
  if (!category || !VALID_CATEGORIES.includes(category as string)) {
    return { valid: false, error: "Invalid category" };
  }

  // Validate amount
  const parsedAmount =
    typeof amount === "number" ? amount : parseFloat(amount as string);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return {
      valid: false,
      error: "Amount must be a valid positive number",
    };
  }

  if (parsedAmount > MAX_EXPENSE_AMOUNT) {
    return {
      valid: false,
      error: `Amount cannot exceed $${MAX_EXPENSE_AMOUNT.toLocaleString()}`,
    };
  }

  return { valid: true };
}

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

    let query = supabase.from("expenses").select("id, vehicle_id, category, amount, description, date, created_at");

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
        { success: false, message: error.message },
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
      { success: false, message: "Internal server error" },
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
    const validation = validateExpenseInput(category, amount);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    const parsedAmount =
      typeof amount === "number" ? amount : parseFloat(amount as string);

    if (!date) {
      return NextResponse.json(
        { success: false, message: "Date is required" },
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
          amount: parsedAmount,
          description: description || null,
          date,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Error creating expense:", error);
      return NextResponse.json(
        { success: false, message: error.message },
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
      { success: false, message: "Internal server error" },
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
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    // Only validate if category or amount is provided
    if (category !== undefined || amount !== undefined) {
      const validation = validateExpenseInput(
        category || "maintenance", // Use dummy value if not provided (won't validate)
        amount || 1
      );
      // For PUT, only validate the fields that were actually provided
      if (category && !VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { success: false, message: "Invalid category" },
          { status: 400 }
        );
      }
      if (amount !== undefined) {
        const parsedCheck = parseFloat(amount as any);
        if (!Number.isFinite(parsedCheck) || parsedCheck <= 0) {
          return NextResponse.json(
            { success: false, message: "Invalid amount" },
            { status: 400 }
          );
        }
        if (parsedCheck > MAX_EXPENSE_AMOUNT) {
          return NextResponse.json(
            { success: false, message: `Amount cannot exceed $${MAX_EXPENSE_AMOUNT.toLocaleString()}` },
            { status: 400 }
          );
        }
      }
    }

    const supabase = getServiceSupabase();

    const updates: Record<string, unknown> = {};
    if (vehicleId !== undefined) updates.vehicle_id = vehicleId || null;
    if (category !== undefined) updates.category = category;
    if (amount !== undefined) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || !Number.isFinite(parsed)) {
        return NextResponse.json({ success: false, message: "Amount must be a valid number" }, { status: 400 });
      }
      updates.amount = parsed;
    }
    if (description !== undefined) updates.description = description || null;
    if (date !== undefined) updates.date = date;

    const { data, error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Error updating expense:", error);
      return NextResponse.json(
        { success: false, message: error.message },
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
      { success: false, message: "Internal server error" },
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
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      logger.error("Error deleting expense:", error);
      return NextResponse.json(
        { success: false, message: error.message },
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
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
