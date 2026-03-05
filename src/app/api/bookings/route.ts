import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import {
  sendBookingConfirmation,
  sendAdminNewBooking,
  sendCancellationEmail,
} from "@/lib/email/mailer";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bookingId = searchParams.get("id");
  const customerId = searchParams.get("customer_id");
  const customerEmail = searchParams.get("customer_email");
  const status = searchParams.get("status");
  const supabase = getServiceSupabase();

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
          .select("year, make, model")
          .eq("id", booking.vehicle_id)
          .single();
        if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
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
    if (customerEmail) {
      query = query.eq("customer_email", customerEmail);
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
        .select("id, year, make, model")
        .in("id", vehicleIds);

      if (vehicles) {
        vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, `${v.year} ${v.make} ${v.model}`]));
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
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();
    // Double-booking check
    if (body.vehicleId && body.pickupDate && body.returnDate) {
      const { data: conflicting } = await supabase
        .from("bookings")
        .select("id")
        .eq("vehicle_id", body.vehicleId)
        .in("status", ["confirmed", "active", "pending"])
        .lte("pickup_date", body.returnDate)
        .gte("return_date", body.pickupDate);

      if (conflicting && conflicting.length > 0) {
        return NextResponse.json(
          { success: false, message: "This vehicle is already booked for the selected dates." },
          { status: 409 }
        );
      }
    }

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
      pickup_time: body.pickupTime || null,
      return_time: body.returnTime || null,
      extras: body.extras || [],
      total_price: body.totalPrice || 0,
      deposit: body.totalPrice || 0,
      status: "pending",
      signed_name: body.signedName || null,
      agreement_signed_at: body.signedName ? new Date().toISOString() : null,
      insurance_proof_url: body.insuranceProofUrl || null,
      insurance_opted_out: body.insuranceOptedOut || false,
    });

    if (error) {
      console.error("Create booking error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Send confirmation emails for admin-created bookings
    if (body.customerDetails?.email) {
      let vehicleName = "Vehicle";
      if (body.vehicleId) {
        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("year, make, model")
          .eq("id", body.vehicleId)
          .single();
        if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      }

      // Check if customer needs a password
      let needsPassword = false;
      const customerEmail = body.customerDetails.email.toLowerCase().trim();
      const { data: cust } = await supabase
        .from("customers")
        .select("password_hash")
        .eq("email", customerEmail)
        .single();
      needsPassword = !cust?.password_hash;

      const emailData = {
        bookingId,
        customerName: body.customerDetails.name || "Customer",
        customerEmail,
        vehicleName,
        pickupDate: body.pickupDate,
        returnDate: body.returnDate,
        pickupTime: body.pickupTime || null,
        returnTime: body.returnTime || null,
        totalPrice: body.totalPrice || 0,
        deposit: body.totalPrice || 0,
        needsPassword,
      };

      sendBookingConfirmation(emailData).catch(console.error);
      sendAdminNewBooking(emailData).catch(console.error);
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
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json(
        { success: false, message: "Missing bookingId or status" },
        { status: 400 }
      );
    }

    // Fetch booking details before updating (for emails)
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

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

    // Send emails based on status change
    if (booking && booking.customer_email) {
      let vehicleName = "Vehicle";
      if (booking.vehicle_id) {
        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("year, make, model")
          .eq("id", booking.vehicle_id)
          .single();
        if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      }

      // Check if customer needs a password
      let needsPassword = false;
      if (booking.customer_id) {
        const { data: cust } = await supabase
          .from("customers")
          .select("password_hash")
          .eq("id", booking.customer_id)
          .single();
        needsPassword = !cust?.password_hash;
      } else if (booking.customer_email) {
        const { data: cust } = await supabase
          .from("customers")
          .select("password_hash")
          .eq("email", booking.customer_email.toLowerCase().trim())
          .single();
        needsPassword = !cust?.password_hash;
      }

      const emailData = {
        bookingId: booking.id,
        customerName: booking.customer_name || "Customer",
        customerEmail: booking.customer_email,
        vehicleName,
        pickupDate: booking.pickup_date,
        returnDate: booking.return_date,
        pickupTime: booking.pickup_time || null,
        returnTime: booking.return_time || null,
        totalPrice: booking.total_price || 0,
        deposit: booking.deposit || 0,
        needsPassword,
      };

      if (status === "cancelled") {
        sendCancellationEmail(emailData).catch(console.error);
      } else if (status === "confirmed" && booking.status === "pending") {
        // Admin confirming a manual/pending booking
        sendBookingConfirmation(emailData).catch(console.error);
      }
    }

    return NextResponse.json({ success: true, message: "Booking updated" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
