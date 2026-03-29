import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

// GET: Fetch booking payments
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "booking_id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("booking_payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("received_at", { ascending: false });

    if (error) {
      logger.error("Error fetching booking payments:", error);
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
    logger.error("Unexpected error in GET /api/admin/booking-payments:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new booking payment and update booking deposit
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { booking_id, amount, method, note } = body;

    // Validation
    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: "booking_id is required" },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!method) {
      return NextResponse.json(
        { success: false, error: "method is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Verify booking_id exists in the bookings table
    const { data: bookingExists } = await supabase
      .from("bookings")
      .select("id")
      .eq("id", booking_id)
      .single();

    if (!bookingExists) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Let the DB generate the UUID id and received_at timestamp via defaults
    const insertPayload: Record<string, unknown> = {
      booking_id,
      amount: parsedAmount,
      method,
      note: note || null,
    };

    const { data: paymentData, error: paymentError } = await supabase
      .from("booking_payments")
      .insert([insertPayload])
      .select("id")
      .single();

    if (paymentError) {
      logger.error("Error creating booking payment: " + paymentError.message + " | code: " + paymentError.code + " | details: " + paymentError.details);
      return NextResponse.json(
        { success: false, error: paymentError.message },
        { status: 500 }
      );
    }

    // Calculate total payments — re-fetch after insert to include the new payment
    const { data: allPayments, error: sumError } = await supabase
      .from("booking_payments")
      .select("amount")
      .eq("booking_id", booking_id);

    if (sumError) {
      logger.error("Error calculating total payments:", sumError);
      return NextResponse.json(
        { success: false, error: sumError.message },
        { status: 500 }
      );
    }

    const newDeposit = (allPayments || []).reduce(
      (sum: number, p: { amount: number | null }) => sum + (p.amount ?? 0),
      0
    );

    // Update booking deposit
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ deposit: newDeposit })
      .eq("id", booking_id);

    if (updateError) {
      logger.error("Error updating booking deposit:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: paymentData?.id,
          new_deposit: newDeposit,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Unexpected error in POST /api/admin/booking-payments:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
