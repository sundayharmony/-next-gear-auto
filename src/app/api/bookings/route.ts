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
import { logger } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bookingId = searchParams.get("id");
  const customerId = searchParams.get("customer_id");
  const customerEmail = searchParams.get("customer_email");
  const status = searchParams.get("status");
  const limitParam = searchParams.get("limit");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");
  const search = searchParams.get("search");
  const sortParam = searchParams.get("sort");
  const orderParam = searchParams.get("order");
  const pageParam = searchParams.get("page");
  const perPageParam = searchParams.get("per_page");
  const supabase = getServiceSupabase();

  // Column mapping for sort parameter
  const sortColumnMap: Record<string, string> = {
    customer_name: "customer_name",
    pickup_date: "pickup_date",
    return_date: "return_date",
    total_price: "total_price",
    deposit: "deposit",
    status: "status",
    created_at: "created_at",
  };

  // Determine sort column (default: created_at) and order (default: desc)
  const sortColumn = sortParam && sortColumnMap[sortParam] ? sortColumnMap[sortParam] : "created_at";
  const isAscending = orderParam === "asc";

  // Pagination
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : null;
  const perPage = perPageParam ? Math.min(Math.max(1, parseInt(perPageParam, 10)), 200) : 50;
  const offset = page && page > 0 ? (page - 1) * perPage : null;

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
      .select("*, vehicles(year, make, model)", { count: "exact" });

    if (customerId && customerEmail) {
      // Search by both — return bookings matching EITHER (covers mismatches)
      query = query.or(`customer_id.eq.${customerId},customer_email.ilike.${customerEmail}`);
    } else if (customerId) {
      query = query.eq("customer_id", customerId);
    } else if (customerEmail) {
      // Case-insensitive email match
      query = query.ilike("customer_email", customerEmail);
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
    // Server-side search: filter by customer_name, customer_email, or id (case-insensitive)
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,id.eq.${search}`);
    }
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        query = query.limit(limit);
      }
    }

    // Apply sorting
    query = query.order(sortColumn, { ascending: isAscending });

    // Apply pagination if page is provided
    if (offset !== null) {
      query = query.range(offset, offset + perPage - 1);
    }

    const { data: bookings, error, count } = await query;

    if (error) {
      logger.error("Bookings fetch error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const enriched = (bookings || []).map((b) => {
      const v = b.vehicles as unknown as { year: number; make: string; model: string } | null;
      const { vehicles: _v, ...rest } = b;
      // Check if overdue: return_date < today AND status === 'active'
      const isOverdue = b.return_date < today && b.status === "active";
      return {
        ...rest,
        vehicleName: v ? `${v.year} ${v.make} ${v.model}` : "Unknown",
        customerName: b.customer_name || "Guest",
        is_overdue: isOverdue,
      };
    });

    // Handle pagination response
    if (page !== null && offset !== null) {
      const totalPages = Math.ceil((count || 0) / perPage);
      return NextResponse.json({
        data: enriched,
        success: true,
        total: count || 0,
        page,
        totalPages,
      });
    }

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

    // Validate required fields
    if (!body.vehicleId || !body.pickupDate || !body.returnDate) {
      return NextResponse.json({ success: false, error: "vehicleId, pickupDate, and returnDate are required" }, { status: 400 });
    }

    // Double-booking check — admins can always overlap; clients need 60min gap
    if (!body.adminCreated && body.vehicleId && body.pickupDate && body.returnDate) {
      const { data: conflicting } = await supabase
        .from("bookings")
        .select("id, pickup_date, return_date, pickup_time, return_time")
        .eq("vehicle_id", body.vehicleId)
        .in("status", ["confirmed", "active", "pending"])
        .lte("pickup_date", body.returnDate)
        .gte("return_date", body.pickupDate);

      if (conflicting && conflicting.length > 0) {
        // Allow same-day turnovers if pickups/returns are 60+ minutes apart
        const newPickup = new Date(`${body.pickupDate}T${body.pickupTime || "00:00"}`);
        const newReturn = new Date(`${body.returnDate}T${body.returnTime || "23:59"}`);

        const hasRealConflict = conflicting.some((existing) => {
          const existPickup = new Date(`${existing.pickup_date}T${existing.pickup_time || "00:00"}`);
          const existReturn = new Date(`${existing.return_date}T${existing.return_time || "23:59"}`);

          // Check if there is at least 60 minutes gap between the two bookings
          const gapAfterExisting = (newPickup.getTime() - existReturn.getTime()) / 60000;
          const gapAfterNew = (existPickup.getTime() - newReturn.getTime()) / 60000;

          // No conflict if new booking starts 60+ min after existing ends,
          // or existing starts 60+ min after new booking ends
          return gapAfterExisting < 60 && gapAfterNew < 60;
        });

        if (hasRealConflict) {
          return NextResponse.json(
            { success: false, message: "This vehicle is already booked for the selected dates. Bookings on the same day must be at least 60 minutes apart." },
            { status: 409 }
          );
        }
      }
    }

    const bookingId = "bk" + Date.now() + Math.floor(Math.random() * 1000);

    // Normalize email for consistent matching
    const normalizedEmail = body.customerDetails?.email?.toLowerCase().trim() || null;

    // If customer details provided, find or create customer in the customers table
    let customerId = body.customerId || null;
    if (!customerId && normalizedEmail) {
      const customerEmail = normalizedEmail;
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

    // If admin provided customerId but no email, look up the customer's email for consistent matching
    let bookingEmail = normalizedEmail;
    let bookingName = body.customerDetails?.name || null;
    let bookingPhone = body.customerDetails?.phone || null;
    if (customerId && !bookingEmail) {
      const { data: custLookup } = await supabase
        .from("customers")
        .select("email, name, phone")
        .eq("id", customerId)
        .single();
      if (custLookup) {
        bookingEmail = custLookup.email?.toLowerCase().trim() || null;
        if (!bookingName) bookingName = custLookup.name;
        if (!bookingPhone) bookingPhone = custLookup.phone;
      }
    }

    // Admin can set initial status directly (e.g. "confirmed"); clients always start as "pending"
    const bookingStatus = body.adminCreated && body.initialStatus ? body.initialStatus : "pending";

    const { error } = await supabase.from("bookings").insert({
      id: bookingId,
      customer_id: customerId,
      vehicle_id: body.vehicleId,
      customer_name: bookingName,
      customer_email: bookingEmail,
      customer_phone: bookingPhone,
      pickup_date: body.pickupDate,
      return_date: body.returnDate,
      pickup_time: body.pickupTime || null,
      return_time: body.returnTime || null,
      extras: body.extras || [],
      total_price: body.totalPrice ?? 0,
      deposit: body.totalPrice ?? 0,
      status: bookingStatus,
      signed_name: body.signedName || null,
      agreement_signed_at: body.signedName ? new Date().toISOString() : null,
      insurance_proof_url: body.insuranceProofUrl || null,
      insurance_opted_out: body.insuranceOptedOut || false,
    });

    if (error) {
      logger.error("Create booking error:", error);
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

      // Send the right email based on booking status
      if (bookingStatus === "confirmed") {
        sendBookingConfirmation(emailData).catch(logger.error);
      } else {
        sendBookingPendingEmail(emailData).catch(logger.error);
      }
      // Always notify admin of new booking (unless admin created it themselves)
      if (!body.adminCreated) {
        sendAdminNewBooking(emailData).catch(logger.error);
      }
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
          }).catch(logger.error);
        }
      })
      .catch(logger.error);

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
    if (body.admin_notes !== undefined) updateFields.admin_notes = body.admin_notes;
    if (body.payment_method !== undefined) updateFields.payment_method = body.payment_method;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, message: "No fields to update" },
        { status: 400 }
      );
    }

    // Skip overlap check for PATCH — edits are admin-only and admins can overlap

    const { error } = await supabase
      .from("bookings")
      .update(updateFields)
      .eq("id", bookingId);

    if (error) {
      logger.error("Update booking error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to update booking" },
        { status: 500 }
      );
    }

    // Detect if customer email was changed
    const emailChanged = updateFields.customer_email &&
      updateFields.customer_email.toLowerCase().trim() !== (booking.customer_email || "").toLowerCase().trim();
    const statusChanged = body.status && body.status !== booking.status;
    const emailAddress = updateFields.customer_email || booking.customer_email;

    if ((statusChanged || emailChanged) && emailAddress) {
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

      // Check if the (new) customer needs a password
      let needsPassword = false;
      const lookupEmail = emailAddress.toLowerCase().trim();
      const { data: cust } = await supabase
        .from("customers")
        .select("password_hash")
        .eq("email", lookupEmail)
        .single();
      needsPassword = !cust?.password_hash;

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
        sendCancellationEmail(emailData).catch(logger.error);
      } else if (emailChanged) {
        // Email was changed — send confirmation to the new email address
        // so the new recipient knows about their booking and can set up their password
        sendBookingConfirmation(emailData).catch(logger.error);
      } else if (body.status === "confirmed" && booking.status === "pending") {
        sendBookingConfirmation(emailData).catch(logger.error);
      }
    }

    // If email changed, also find-or-create the customer record for the new email
    if (emailChanged && emailAddress) {
      const newEmail = emailAddress.toLowerCase().trim();
      const custName = (updateFields.customer_name || booking.customer_name || "Customer").slice(0, 100);
      const custPhone = (updateFields.customer_phone || booking.customer_phone || "").slice(0, 20);

      const { data: existingCust } = await supabase
        .from("customers")
        .select("id")
        .eq("email", newEmail)
        .single();

      if (existingCust) {
        // Link booking to existing customer
        await supabase.from("bookings").update({ customer_id: existingCust.id }).eq("id", bookingId);
      } else {
        // Create new customer for this email
        const newCustId = "c" + Date.now();
        const { data: newCust } = await supabase
          .from("customers")
          .insert({
            id: newCustId,
            name: custName,
            email: newEmail,
            phone: custPhone,
            role: "customer",
          })
          .select("id")
          .single();
        if (newCust) {
          await supabase.from("bookings").update({ customer_id: newCust.id }).eq("id", bookingId);
        }
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
