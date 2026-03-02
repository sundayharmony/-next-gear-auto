import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bookingId = searchParams.get("id");
  const customerId = searchParams.get("customer_id");
  const status = searchParams.get("status");

  try {
    // Single booking lookup (used by success page)
    if (bookingId) {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error || !booking) {
        return NextResponse.json(
          { success: false, message: "Booking not found" },
          { status: 404 }
        );
      }

      // Fetch vehicle name
      let vehicleName = "Vehicle";
      if (booking.vehicle_id) {
        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("name")
          .eq("id", booking.vehicle_id)
          .single();
        if (vehicle) vehicleName = vehicle.name;
      }

      return NextResponse.json({
        success: true,
        data: {
          ...booking,
          vehicle_name: vehicleName,
        },
      });
    }

    // List bookings with optional filters
    let query = supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Bookings fetch error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    // Fetch vehicle names for all bookings
    const vehicleIds = [...new Set(bookings?.map((b) => b.vehicle_id).filter(Boolean))];
    let vehicleMap: Record<string, string> = {};

    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, name")
        .in("id", vehicleIds);

      if (vehicles) {
        vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v.name]));
      }
    }

    const enriched = (bookings || []).map((b) => ({
      ...b,
      vehicleName: vehicleMap[b.vehicle_id] || "Unknown",
      customerName: b.customer_name || "Guest",
    }));

    return NextResponse.json({ data: enriched, success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookingId = "bk" + Date.now() + Math.floor(Math.random() * 1000);

    const { error } = await supabase.from("bookings").insert({
      id: bookingId,
      customer_id: body.customerId || null,
      vehicle_id: body.vehicleId,
      customer_name: body.customerDetails?.name,
      customer_email: body.customerDetails?.email,
      customer_phone: body.customerDetails?.phone,
      pickup_date: body.pickupDate,
      return_date: body.returnDate,
      extras: body.extras || [],
      total_price: body.totalPrice || 0,
      deposit: 50,
      status: "pending",
      signed_name: body.signedName || null,
      agreement_signed_at: body.signedName ? new Date().toISOString() : null,
    });

    if (error) {
      console.error("Create booking error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to create booking" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { id: bookingId }, success: true },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}

// PATCH - Update booking status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json(
        { success: false, message: "Missing bookingId or status" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update booking" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Booking updated" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
