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
  "rideshare",
  "turo_trip",
  "other",
];

const MAX_EXPENSE_AMOUNT = 1000000;

function isMissingBlockedDateColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeMessage = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return maybeMessage.toLowerCase().includes("blocked_date_id");
}

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

async function resolveVehicleIdForBlockedDateExpense(
  supabase: ReturnType<typeof getServiceSupabase>,
  blockedDateId: string,
  vehicleIdFromBody: string | null | undefined
): Promise<{ ok: true; vehicleId: string } | { ok: false; message: string }> {
  const { data: bd, error } = await supabase
    .from("blocked_dates")
    .select("id, vehicle_id, source")
    .eq("id", blockedDateId)
    .maybeSingle();
  if (error || !bd) {
    return { ok: false, message: "Blocked date not found" };
  }
  if (bd.source !== "turo-email") {
    return { ok: false, message: "Expenses can only be linked to Turo (email) trips" };
  }
  const vid = bd.vehicle_id as string;
  if (vehicleIdFromBody && vehicleIdFromBody !== vid) {
    return { ok: false, message: "vehicleId must match the Turo trip vehicle" };
  }
  return { ok: true, vehicleId: vid };
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
    const blockedDateId = searchParams.get("blocked_date_id");

    const applyFilters = <T extends { eq: (column: string, value: unknown) => T; gte: (column: string, value: string) => T; lte: (column: string, value: string) => T }>(baseQuery: T) => {
      let query = baseQuery;
      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }
      if (blockedDateId) {
        query = query.eq("blocked_date_id", blockedDateId);
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
      return query;
    };

    let { data, error } = await applyFilters(
      supabase
        .from("expenses")
        .select("id, vehicle_id, category, amount, description, date, created_at, blocked_date_id")
    ).order("date", { ascending: false });

    // Backward compatibility for environments that have not deployed blocked_date_id yet.
    if (error && isMissingBlockedDateColumnError(error)) {
      logger.warn("expenses.blocked_date_id column missing; falling back to legacy select");
      if (blockedDateId) {
        return NextResponse.json(
          { success: false, message: "Filtering by blocked date is not available in this environment yet." },
          { status: 400 }
        );
      }
      const fallback = await applyFilters(
        supabase
          .from("expenses")
          .select("id, vehicle_id, category, amount, description, date, created_at")
      ).order("date", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

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
    const { vehicleId, category, amount, description, date, blockedDateId } = body;

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

    let resolvedVehicleId: string | null = vehicleId || null;
    let resolvedBlockedId: string | null = null;
    if (blockedDateId && typeof blockedDateId === "string" && blockedDateId.trim()) {
      const r = await resolveVehicleIdForBlockedDateExpense(supabase, blockedDateId.trim(), vehicleId || null);
      if (!r.ok) {
        return NextResponse.json({ success: false, message: r.message }, { status: 400 });
      }
      resolvedVehicleId = r.vehicleId;
      resolvedBlockedId = blockedDateId.trim();
    }

    const insertRow: Record<string, unknown> = {
      id,
      vehicle_id: resolvedVehicleId,
      category,
      amount: parsedAmount,
      description: description || null,
      date,
      created_at: new Date().toISOString(),
    };
    if (resolvedBlockedId) {
      insertRow.blocked_date_id = resolvedBlockedId;
    }

    const { data, error } = await supabase.from("expenses").insert([insertRow]).select().maybeSingle();

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
    const { id, vehicleId, category, amount, description, date, blockedDateId } = body;

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

    let existing: { vehicle_id?: string | null; blocked_date_id?: string | null } | null = null;
    const primaryExisting = await supabase
      .from("expenses")
      .select("vehicle_id, blocked_date_id")
      .eq("id", id)
      .maybeSingle();
    if (primaryExisting.error && isMissingBlockedDateColumnError(primaryExisting.error)) {
      const legacyExisting = await supabase
        .from("expenses")
        .select("vehicle_id")
        .eq("id", id)
        .maybeSingle();
      existing = (legacyExisting.data as { vehicle_id?: string | null } | null) ?? null;
    } else {
      existing = (primaryExisting.data as { vehicle_id?: string | null; blocked_date_id?: string | null } | null) ?? null;
    }

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

    if (blockedDateId !== undefined) {
      const trimmed = typeof blockedDateId === "string" ? blockedDateId.trim() : "";
      if (!trimmed) {
        updates.blocked_date_id = null;
      } else {
        const effectiveVehicle =
          vehicleId !== undefined ? (vehicleId || null) : (existing?.vehicle_id as string | null);
        const r = await resolveVehicleIdForBlockedDateExpense(supabase, trimmed, effectiveVehicle ?? undefined);
        if (!r.ok) {
          return NextResponse.json({ success: false, message: r.message }, { status: 400 });
        }
        updates.vehicle_id = r.vehicleId;
        updates.blocked_date_id = trimmed;
      }
    }

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
