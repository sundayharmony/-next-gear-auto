import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import {
  sendBookingConfirmation,
  sendBookingPendingEmail,
  sendAdminNewBooking,
  sendCancellationEmail,
} from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";
import { getAuthFromRequest, type TokenPayload } from "@/lib/auth/jwt";
import { getVehicleDisplayName } from "@/lib/types";

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

  // ── Authentication ────────────────────────────────────────────────
  // Determine caller identity. Admins can see all bookings; customers
  // can only see their own. Unauthenticated callers get limited data
  // for single-booking lookup only (needed by success/agreement pages).
  let auth: TokenPayload | null = null;
  try { auth = await getAuthFromRequest(request); } catch { /* unauthenticated */ }

  // Legacy fallback: x-admin-id header (matches verifyAdmin behavior)
  let isAdmin = auth?.role === "admin";
  if (!auth) {
    const legacyAdminId = request.headers.get("x-admin-id");
    if (legacyAdminId) {
      try {
        const { data: admin } = await supabase.from("admins").select("id, email").eq("id", legacyAdminId).single();
        if (admin) {
          isAdmin = true;
          auth = { sub: admin.id, email: admin.email || "", role: "admin" } as TokenPayload;
        }
      } catch { /* ignore */ }
    }
  }
  const callerEmail = auth?.email?.toLowerCase().trim();

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
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : null;
  const perPage = perPageParam ? Math.min(Math.max(1, parseInt(perPageParam, 10) || 50), 200) : 50;
  const offset = page !== null && page > 0 ? (page - 1) * perPage : null;

  try {
    // Single booking lookup (used by success page) — single query with JOIN
    if (bookingId) {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*, vehicles(year, make, model)")
        .eq("id", bookingId)
        .maybeSingle();

      if (error || !booking) {
        return NextResponse.json(
          { success: false, message: "Booking not found" },
          { status: 404 }
        );
      }

      const v = booking.vehicles as unknown as { year: number; make: string; model: string } | null;
      const { vehicles: _v, ...rest } = booking;

      const isOwner = isAdmin ||
        (callerEmail && booking.customer_email?.toLowerCase().trim() === callerEmail);

      // Strip sensitive fields for non-owners (unauthenticated success/agreement page callers)
      // customer_email is included so the agreement signing page can send it back
      // for server-side ownership verification
      const safeData = isOwner ? rest : {
        id: rest.id,
        vehicle_id: rest.vehicle_id,
        pickup_date: rest.pickup_date,
        return_date: rest.return_date,
        pickup_time: rest.pickup_time,
        return_time: rest.return_time,
        total_price: rest.total_price,
        deposit: rest.deposit,
        status: rest.status,
        customer_name: rest.customer_name,
        customer_email: rest.customer_email,
        extras: rest.extras,
        agreement_signed_at: rest.agreement_signed_at,
        signed_name: rest.signed_name,
        rental_agreement_url: rest.rental_agreement_url,
      };

      return NextResponse.json({
        success: true,
        data: {
          ...safeData,
          vehicle_name: v ? getVehicleDisplayName(v) : "Vehicle",
        },
      }, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    // ── List bookings — require authentication ──────────────────────
    // Admin: full access. Customer: own bookings only. No auth: rejected.
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    let query = supabase
      .from("bookings")
      .select("*, vehicles(year, make, model)", { count: "exact" });

    if (isAdmin) {
      // Admins can filter by any customer
      // Use proper Supabase or() method with separate filter conditions
      if (customerId && customerEmail) {
        query = query.or(`customer_id.eq.${encodeURIComponent(customerId)},customer_email.ilike.${encodeURIComponent(customerEmail)}`);
      } else if (customerId) {
        query = query.eq("customer_id", customerId);
      } else if (customerEmail) {
        query = query.ilike("customer_email", customerEmail);
      }
    } else if (callerEmail) {
      // Customers can only see their own bookings — enforce by caller's JWT email
      query = query.ilike("customer_email", callerEmail);
    } else {
      // No email in token — return nothing
      return NextResponse.json({ data: [], total: 0 });
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
      // Limit search length to 100 characters
      const safeSearch = (search || "").slice(0, 100);
      // Sanitize search to prevent PostgREST filter injection - strip all special PostgREST characters
      const sanitized = safeSearch.replace(/[%_*(),.<>!=&|]/g, "");
      if (sanitized) {
        // Use proper parameter escaping with encodeURIComponent
        const escapedSearch = encodeURIComponent(sanitized);
        query = query.or(`customer_name.ilike.%${escapedSearch}%,customer_email.ilike.%${escapedSearch}%,id.eq.${escapedSearch}`);
      }
    }
    if (limitParam) {
      const limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 200);
      query = query.limit(limit);
    } else if (offset === null) {
      // Default limit of 50 when no pagination params provided, max limit 200
      query = query.limit(50);
    }

    // Apply sorting (default: created_at DESC)
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
        vehicleName: v ? getVehicleDisplayName(v) : "Unknown Vehicle",
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
      }, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ data: enriched, success: true }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
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

    // Validate totalPrice is numeric if provided
    if (body.totalPrice !== undefined && (typeof body.totalPrice !== "number" || !Number.isFinite(body.totalPrice) || body.totalPrice < 0)) {
      return NextResponse.json({ success: false, error: "totalPrice must be a non-negative number" }, { status: 400 });
    }

    // Validate extras is an array of valid strings
    if (body.extras !== undefined) {
      if (!Array.isArray(body.extras)) {
        return NextResponse.json({ success: false, error: "extras must be an array" }, { status: 400 });
      }
      if (!body.extras.every((extra: any) => typeof extra === "string")) {
        return NextResponse.json({ success: false, error: "all extras must be strings" }, { status: 400 });
      }
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

    const bookingId = "bk" + crypto.randomUUID().replace(/-/g, "").slice(0, 7);

    // Normalize email for consistent matching
    // Accept both nested customerDetails (public booking flow) and flat keys (admin create form)
    const rawEmail = body.customerDetails?.email || body.customerEmail || null;
    const normalizedEmail = rawEmail?.toLowerCase().trim() || null;

    // If customer details provided, find or create customer in the customers table
    let customerId = body.customerId || null;
    if (!customerId && normalizedEmail) {
      const customerEmail = normalizedEmail;
      const customerName = (body.customerDetails?.name || body.customerName || "Customer").slice(0, 100);
      const customerPhone = (body.customerDetails?.phone || body.customerPhone || "").slice(0, 20);

      // Check if customer already exists
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", customerEmail)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update name/phone if they were previously empty
        const { error: updateErr } = await supabase
          .from("customers")
          .update({
            name: customerName,
            ...(customerPhone ? { phone: customerPhone } : {}),
          })
          .eq("id", existingCustomer.id);
        if (updateErr) logger.warn("Failed to update existing customer info:", updateErr);
      } else {
        // Create new customer (with ON CONFLICT handling for race conditions)
        const newCustId = "c_" + crypto.randomUUID();
        const { data: newCustomer, error: insertErr } = await supabase
          .from("customers")
          .upsert(
            {
              id: newCustId,
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              role: "customer",
            },
            { onConflict: "email", ignoreDuplicates: false }
          )
          .select("id")
          .maybeSingle();

        if (insertErr && insertErr.code === "23505") {
          // Unique constraint violation on email — fetch the existing customer
          const { data: existingCust } = await supabase
            .from("customers")
            .select("id")
            .eq("email", customerEmail)
            .maybeSingle();
          customerId = existingCust?.id || newCustId;
        } else if (newCustomer) {
          customerId = newCustomer.id;
        }
      }
    }

    // If admin provided customerId but no email, look up the customer's email for consistent matching
    let bookingEmail = normalizedEmail;
    let bookingName = body.customerDetails?.name || body.customerName || null;
    let bookingPhone = body.customerDetails?.phone || body.customerPhone || null;
    if (customerId && !bookingEmail) {
      const { data: custLookup } = await supabase
        .from("customers")
        .select("email, name, phone")
        .eq("id", customerId)
        .maybeSingle();
      if (custLookup) {
        bookingEmail = custLookup.email?.toLowerCase().trim() || null;
        if (!bookingName) bookingName = custLookup.name;
        if (!bookingPhone) bookingPhone = custLookup.phone;
      }
    }

    // Bookings always start as "pending" — cannot be confirmed until agreement is signed
    const bookingStatus = "pending";

    // Re-check for overlaps immediately before insert to minimize race condition window
    if (!body.adminCreated && body.vehicleId && body.pickupDate && body.returnDate) {
      const { data: finalConflictCheck } = await supabase
        .from("bookings")
        .select("id, pickup_date, return_date, pickup_time, return_time")
        .eq("vehicle_id", body.vehicleId)
        .in("status", ["confirmed", "active", "pending"])
        .lte("pickup_date", body.returnDate)
        .gte("return_date", body.pickupDate);

      if (finalConflictCheck && finalConflictCheck.length > 0) {
        const newPickup = new Date(`${body.pickupDate}T${body.pickupTime || "00:00"}`);
        const newReturn = new Date(`${body.returnDate}T${body.returnTime || "23:59"}`);

        const hasRealConflict = finalConflictCheck.some((existing) => {
          const existPickup = new Date(`${existing.pickup_date}T${existing.pickup_time || "00:00"}`);
          const existReturn = new Date(`${existing.return_date}T${existing.return_time || "23:59"}`);

          const gapAfterExisting = (newPickup.getTime() - existReturn.getTime()) / 60000;
          const gapAfterNew = (existPickup.getTime() - newReturn.getTime()) / 60000;

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
      extras: Array.isArray(body.extras) ? body.extras : [],
      total_price: body.totalPrice ?? 0,
      deposit: body.deposit ?? 0,
      status: bookingStatus,
      signed_name: body.signedName || null,
      agreement_signed_at: null,
      insurance_proof_url: body.insuranceProofUrl || null,
      insurance_opted_out: body.insuranceOptedOut || false,
      pickup_location_id: body.pickup_location_id || body.pickupLocationId || null,
      return_location_id: body.return_location_id || body.returnLocationId || null,
      location_surcharge: body.location_surcharge || body.locationSurcharge || 0,
    });

    if (error) {
      logger.error("Create booking error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Fetch vehicle name and check customer password in parallel
    const emailRecipient = body.customerDetails?.email || body.customerEmail || null;
    const emailName = body.customerDetails?.name || body.customerName || "Customer";

    let vehicleName = "Vehicle";
    let needsPassword = false;

    if (body.vehicleId || emailRecipient) {
      // Vehicle fetch
      const vehiclePromise = body.vehicleId
        ? Promise.resolve(
            supabase.from("vehicles").select("year, make, model").eq("id", body.vehicleId).maybeSingle()
          ).then((res) => res.data as { year: string; make: string; model: string } | null)
        : Promise.resolve(null as { year: string; make: string; model: string } | null);

      // Customer password check
      const custPromise = emailRecipient
        ? Promise.resolve(
            supabase.from("customers").select("password_hash").eq("email", emailRecipient.toLowerCase().trim()).maybeSingle()
          ).then((res) => res.data as { password_hash: string } | null)
        : Promise.resolve(null as { password_hash: string } | null);

      const [vehicle, cust] = await Promise.all([vehiclePromise, custPromise]);

      if (vehicle) vehicleName = getVehicleDisplayName(vehicle);
      needsPassword = !cust?.password_hash;
    }

    // Send emails for new bookings (only when email is provided)
    // Support both nested (public flow) and flat (admin form) customer fields

    if (emailRecipient) {

      const emailData = {
        bookingId,
        customerName: emailName,
        customerEmail: emailRecipient,
        vehicleName,
        pickupDate: body.pickupDate,
        returnDate: body.returnDate,
        pickupTime: body.pickupTime || null,
        returnTime: body.returnTime || null,
        totalPrice: body.totalPrice ?? 0,
        deposit: body.deposit ?? 0,
        needsPassword,
      };

      // New bookings always start as pending
      sendBookingPendingEmail(emailData).catch(logger.error);
      // Always notify admin of new booking
      sendAdminNewBooking(emailData).catch(logger.error);
    }

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

// ─── Valid status transitions (Bug 17) ──────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// PATCH - Update booking (status change OR field edits)
export async function PATCH(request: NextRequest) {
  const supabase = getServiceSupabase();

  // Require admin authorization for field updates
  let auth: TokenPayload | null = null;
  try {
    auth = await getAuthFromRequest(request);
  } catch {
    auth = null;
  }

  if (!auth || auth.role !== "admin") {
    return NextResponse.json(
      { success: false, message: "Admin authorization required" },
      { status: 403 }
    );
  }

  // Separate JSON parsing from logic
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Validate body is a non-null object
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, message: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  try {
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
      .maybeSingle();

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
    if (body.pickup_location_id !== undefined) updateFields.pickup_location_id = body.pickup_location_id;
    if (body.pickup_location_name !== undefined) updateFields.pickup_location_name = body.pickup_location_name;
    if (body.return_location_id !== undefined) updateFields.return_location_id = body.return_location_id;
    if (body.return_location_name !== undefined) updateFields.return_location_name = body.return_location_name;
    if (body.location_surcharge !== undefined) updateFields.location_surcharge = body.location_surcharge;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, message: "No fields to update" },
        { status: 400 }
      );
    }

    // Validate status transitions (Bug 17)
    if (updateFields.status && updateFields.status !== booking.status) {
      const currentStatus = booking.status;
      const newStatus = updateFields.status;
      const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

      if (!allowedTransitions.includes(newStatus)) {
        return NextResponse.json(
          { success: false, message: `Cannot transition from ${currentStatus} to ${newStatus}` },
          { status: 400 }
        );
      }
    }

    // Block confirming a booking if the rental agreement hasn't been signed yet
    if (
      updateFields.status === "confirmed" &&
      booking.status === "pending" &&
      !booking.agreement_signed_at
    ) {
      return NextResponse.json(
        { success: false, message: "Cannot confirm booking — the rental agreement has not been signed yet." },
        { status: 400 }
      );
    }

    // Admins can change dates on any booking — skip overlap check for PATCH

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

    // If status changed to cancelled, delete blocked dates for this vehicle in the booking's date range
    if (updateFields.status === "cancelled" && booking.vehicle_id && booking.pickup_date && booking.return_date) {
      const { error: blockedErr } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("vehicle_id", booking.vehicle_id)
        .gte("end_date", booking.pickup_date)
        .lte("start_date", booking.return_date);
      if (blockedErr) {
        logger.error("Failed to delete blocked dates during cancellation:", blockedErr);
      }
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
          .maybeSingle();
        if (vehicle) vehicleName = getVehicleDisplayName(vehicle);
      }

      // Check if the (new) customer needs a password
      let needsPassword = false;
      const lookupEmail = emailAddress.toLowerCase().trim();
      const { data: cust } = await supabase
        .from("customers")
        .select("password_hash")
        .eq("email", lookupEmail)
        .maybeSingle();
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
        .maybeSingle();

      if (existingCust) {
        // Link booking to existing customer
        await supabase.from("bookings").update({ customer_id: existingCust.id }).eq("id", bookingId);
      } else {
        // Create new customer for this email
        const newCustId = "c_" + crypto.randomUUID();
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
          .maybeSingle();
        if (newCust) {
          await supabase.from("bookings").update({ customer_id: newCust.id }).eq("id", bookingId);
        }
      }
    }

    // Re-fetch the full updated booking to return to the client
    const { data: updatedBooking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    return NextResponse.json({ success: true, message: "Booking updated", data: updatedBooking });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
