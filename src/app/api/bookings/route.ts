import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import {
  sendBookingConfirmation,
  sendBookingPendingEmail,
  sendAdminNewBooking,
  sendCancellationEmail,
  sendAgreementEmail,
} from "@/lib/email/mailer";
import { autoSignAgreement } from "@/lib/agreement/auto-sign";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bookingId = searchParams.get("id");
  const customerId = searchParams.get("customer_id");
  const customerEmail = searchParams.get("customer_email");
  const status = searchParams.get("status");
  const limitParam = searchParams.get("limit");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");
  const supabase = getServiceSupabase();

  try {
    // Single booking lookup (used by success page) — single query with JOIN
    if (bookingId) {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*, vehicles(year, make, model)")
        .eq("id", bookingId)
        .single();

      if (error || !booking) {
        return NextResponse.json(
          { success: false, message: "Booking not found" },
          { status: 404 }
        );
      }

      const v = booking.vehicles as unknown as { year: number; make: string; model: string } | null;
      const { vehicles: _v, ...rest } = booking;

      return NextResponse.json({
        success: true,
        data: {
          ...rest,
          vehicle_name: v ? `${v.year} ${v.make} ${v.model}` : "Vehicle",
        },
      });
    }

    // List bookings with optional filters — single query with vehicle JOIN
    let query = supabase
      .from("bookings")
      .select("*, vehicles(year, make, model)")
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
    // Date range filter: return bookings overlapping [from, to]
    if (fromDate) {
      query = query.gte("return_date", fromDate);
    }
    if (toDate) {
      query = query.lte("pickup_date", toDate);
    }
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        query = query.limit(limit);
      }
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Bookings fetch error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    const enriched = (bookings || []).map((b) => {
      const v = b.vehicles as unknown as { year: number; make: string; model: string } | null;
      const { vehicles: _v, ...rest } = b;
      return {
        ...rest,
        vehicleName: v ? `${v.year} ${v.make} ${v.model}` : "Unknown",
        customerName: b.customer_name || "Guest",
      };
    });

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

    // If customer details provided, find or create customer in the customers table
    let customerId = body.customerId || null;
    if (!customerId && body.customerDetails?.email) {
      const customerEmail = body.customerDetails.email.toLowerCase().trim();
      const customerName = (body.customerDetails.name || "Customer").slice(0, 100);
      const customerPhone = (body.customerDetails.phone || "").slice(0, 20);

      // Check if customer already exists
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", customerEmail)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update name/phone if they were previously empty
        await supabase
          .from("customers")
          .update({
            name: customerName,
            ...(customerPhone ? { phone: customerPhone } : {}),
          })
          .eq("id", existingCustomer.id);
      } else {
        // Create new customer
        const newCustId = "c" + Date.now();
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            id: newCustId,
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            role: "customer",
          })
          .select("id")
          .single();
        if (newCustomer) customerId = newCustomer.id;
      }
    }

    const { error } = await supabase.from("bookings").insert({
      id: bookingId,
      customer_id: customerId,
      vehicle_id: body.vehicleId,
      customer_name: body.customerDetails?.name,
      customer_email: body.customerDetails?.email,
      customer_phone: body.customerDetails?.phone,
      pickup_date: body.pickupDate,
      return_date: body.returnDate,
      pickup_time: body.pickupTime || null,
      return_time: body.returnTime || null,
      extras: body.extras || [],
      total_price: body.totalPrice ?? 0,
      deposit: body.totalPrice ?? 0,
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

    // Fetch vehicle name once (used for emails and agreement)
    let vehicleName = "Vehicle";
    if (body.vehicleId) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("year, make, model")
        .eq("id", body.vehicleId)
        .single();
      if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    }

    // Send emails for new bookings (only when email is provided)
    if (body.customerDetails?.email) {
      // Check if customer needs a password
      let needsPassword = false;
      const custEmail = body.customerDetails.email.toLowerCase().trim();
      const { data: cust } = await supabase
        .from("customers")
        .select("password_hash")
        .eq("email", custEmail)
        .single();
      needsPassword = !cust?.password_hash;

      const emailData = {
        bookingId,
        customerName: body.customerDetails.name || "Customer",
        customerEmail: custEmail,
        vehicleName,
        pickupDate: body.pickupDate,
        returnDate: body.returnDate,
        pickupTime: body.pickupTime || null,
        returnTime: body.returnTime || null,
        totalPrice: body.totalPrice ?? 0,
        deposit: body.totalPrice ?? 0,
        needsPassword,
      };

      // Send pending email to customer (booking starts as pending)
      sendBookingPendingEmail(emailData).catch(console.error);
      // Always notify admin of new booking
      sendAdminNewBooking(emailData).catch(console.error);
    }

    // Auto-sign rental agreement with client initials (admin-created bookings)
    autoSignAgreement(bookingId)
      .then((result) => {
        if (result && body.customerDetails?.email) {
          sendAgreementEmail({
            bookingId,
            customerName: body.customerDetails.name || "Customer",
            customerEmail: body.customerDetails.email,
            vehicleName,
            pickupDate: body.pickupDate,
            returnDate: body.returnDate,
            pickupTime: body.pickupTime || undefined,
            returnTime: body.returnTime || undefined,
            totalPrice: body.totalPrice ?? 0,
            deposit: body.totalPrice ?? 0,
            pdfBytes: result.pdfBytes,
          }).catch(console.error);
        }
      })
      .catch(console.error);

    return NextResponse.json(
      { data: { id: bookingId, customer_id: customerId }, success: true },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}

// PATCH - Update booking (status change OR field edits)
export async function PATCH(request: Request) {
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "Missing bookingId" },
        { status: 400 }
      );
    }

    // Fetch booking details before updating (for emails and comparison)
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    // Build update object — only include fields that were actually sent
    const updateFields: Record<string, any> = {};

    if (body.status !== undefined) updateFields.status = body.status;
    if (body.customer_id !== undefined) updateFields.customer_id = body.customer_id;
    if (body.customer_name !== undefined) updateFields.customer_name = body.customer_name;
    if (body.customer_email !== undefined) updateFields.customer_email = body.customer_email;
    if (body.customer_phone !== undefined) updateFields.customer_phone = body.customer_phone;
    if (body.vehicle_id !== undefined) updateFields.vehicle_id = body.vehicle_id;
    if (body.pickup_date !== undefined) updateFields.pickup_date = body.pickup_date;
    if (body.return_date !== undefined) updateFields.return_date = body.return_date;
    if (body.pickup_time !== undefined) updateFields.pickup_time = body.pickup_time;
    if (body.return_time !== undefined) updateFields.return_time = body.return_time;
    if (body.total_price !== undefined) updateFields.total_price = body.total_price;
    if (body.deposit !== undefined) updateFields.deposit = body.deposit;
    if (body.extras !== undefined) updateFields.extras = body.extras;
    if (body.insurance_opted_out !== undefined) updateFields.insurance_opted_out = body.insurance_opted_out;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, message: "No fields to update" },
        { status: 400 }
      );
    }

    // If vehicle or dates changed, check for double-booking conflicts
    const newVehicleId = updateFields.vehicle_id || booking.vehicle_id;
    const newPickupDate = updateFields.pickup_date || booking.pickup_date;
    const newReturnDate = updateFields.return_date || booking.return_date;
    const datesOrVehicleChanged =
      updateFields.vehicle_id || updateFields.pickup_date || updateFields.return_date;

    if (datesOrVehicleChanged) {
      const { data: conflicting } = await supabase
        .from("bookings")
        .select("id")
        .eq("vehicle_id", newVehicleId)
        .in("status", ["confirmed", "active", "pending"])
        .neq("id", bookingId) // Exclude this booking
        .lte("pickup_date", newReturnDate)
        .gte("return_date", newPickupDate);

      if (conflicting && conflicting.length > 0) {
        return NextResponse.json(
          { success: false, message: "This vehicle is already booked for the selected dates." },
          { status: 409 }
        );
      }
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateFields)
      .eq("id", bookingId);

    if (error) {
      console.error("Update booking error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to update booking" },
        { status: 500 }
      );
    }

    // Send emails based on status change
    const statusChanged = body.status && body.status !== booking.status;
    const emailAddress = updateFields.customer_email || booking.customer_email;

    if (statusChanged && emailAddress) {
      let vehicleName = "Vehicle";
      const vId = updateFields.vehicle_id || booking.vehicle_id;
      if (vId) {
        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("year, make, model")
          .eq("id", vId)
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
      } else if (emailAddress) {
        const { data: cust } = await supabase
          .from("customers")
          .select("password_hash")
          .eq("email", emailAddress.toLowerCase().trim())
          .single();
        needsPassword = !cust?.password_hash;
      }

      const emailData = {
        bookingId: booking.id,
        customerName: updateFields.customer_name || booking.customer_name || "Customer",
        customerEmail: emailAddress,
        vehicleName,
        pickupDate: updateFields.pickup_date ?? booking.pickup_date,
        returnDate: updateFields.return_date ?? booking.return_date,
        pickupTime: updateFields.pickup_time ?? booking.pickup_time ?? null,
        returnTime: updateFields.return_time ?? booking.return_time ?? null,
        totalPrice: updateFields.total_price ?? booking.total_price ?? 0,
        deposit: updateFields.deposit ?? booking.deposit ?? 0,
        needsPassword,
      };

      if (body.status === "cancelled") {
        sendCancellationEmail(emailData).catch(console.error);
      } else if (body.status === "confirmed" && booking.status === "pending") {
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
