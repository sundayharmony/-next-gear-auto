/**
 * Shared insert logic for staff/owner panel booking creation.
 * Used by POST /api/bookings (admin/manager) and POST /api/owner/bookings.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sendBookingPendingEmail,
  sendBookingSignAgreement,
  sendAdminNewBooking,
} from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";
import { checkBookingOverlap } from "@/lib/utils/booking-overlap";
import { isYyyyMmDd, isoDateOrderingOk } from "@/lib/utils/booking-dates";
import { isValidEmailFormat } from "@/lib/utils/validation";
import {
  parseRecurringBookingMeta,
  upsertRecurringBookingMeta,
} from "@/lib/utils/recurring-booking";
import { notifyVehicleOwner } from "@/lib/owner/notifications";
import { queueGoogleCalendarBookingSync } from "@/lib/integrations/google-calendar/hooks";
import type { BookingOverlapMode } from "@/lib/utils/booking-overlap";

export type PanelOriginChannel = "admin_panel" | "manager_panel" | "owner_panel";

export interface CreatePanelBookingInput {
  vehicleId: string;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string | null;
  returnTime?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerId?: string | null;
  totalPrice?: number;
  deposit?: number;
  extras?: string[];
  adminNotes?: string | null;
  pickupLocationId?: string | null;
  returnLocationId?: string | null;
  locationSurcharge?: number;
  insuranceOptedOut?: boolean;
  insuranceProofUrl?: string | null;
  signedName?: string | null;
}

export interface CreatePanelBookingContext {
  originChannel: PanelOriginChannel;
  createdByRole: "admin" | "manager" | "owner";
  createdByUserId: string | null;
  /** Admin bypasses overlap; manager/owner use manager overlap rules. */
  overlapMode: BookingOverlapMode;
  bypassOverlap: boolean;
  pendingEmailVariant: "staff" | "default";
  /** When true, skip owner notification (e.g. owner created booking on their own vehicle). */
  skipOwnerNotification?: boolean;
}

type ServiceSupabase = SupabaseClient;

export async function createPanelBooking(
  supabase: ServiceSupabase,
  body: CreatePanelBookingInput,
  ctx: CreatePanelBookingContext
): Promise<
  | { ok: true; bookingId: string; customerId: string | null }
  | { ok: false; status: number; message: string }
> {
  if (!body.vehicleId || !body.pickupDate || !body.returnDate) {
    return { ok: false, status: 400, message: "vehicleId, pickupDate, and returnDate are required" };
  }
  if (!isYyyyMmDd(body.pickupDate) || !isYyyyMmDd(body.returnDate)) {
    return {
      ok: false,
      status: 400,
      message: "pickupDate and returnDate must be valid dates in YYYY-MM-DD format",
    };
  }
  if (!isoDateOrderingOk(body.pickupDate, body.returnDate)) {
    return { ok: false, status: 400, message: "returnDate must be on or after pickupDate" };
  }
  if (
    body.totalPrice !== undefined &&
    (typeof body.totalPrice !== "number" || !Number.isFinite(body.totalPrice) || body.totalPrice < 0)
  ) {
    return { ok: false, status: 400, message: "totalPrice must be a non-negative number" };
  }
  if (body.extras !== undefined && !Array.isArray(body.extras)) {
    return { ok: false, status: 400, message: "extras must be an array" };
  }

  const rawEmail = body.customerEmail?.toLowerCase().trim() || null;
  if (rawEmail && !isValidEmailFormat(rawEmail)) {
    return { ok: false, status: 400, message: "Invalid email format" };
  }

  if (!ctx.bypassOverlap) {
    const overlap = await checkBookingOverlap(
      supabase,
      body.vehicleId,
      body.pickupDate,
      body.returnDate,
      body.pickupTime || null,
      body.returnTime || null,
      { mode: ctx.overlapMode }
    );
    if (overlap) {
      const overlapJson = await overlap.json().catch(() => ({}));
      const message =
        typeof overlapJson === "object" && overlapJson && "message" in overlapJson
          ? String((overlapJson as { message?: string }).message)
          : "Vehicle is not available for these dates";
      return { ok: false, status: 409, message };
    }
  }

  let customerId = body.customerId || null;
  const customerName = (body.customerName || "Customer").slice(0, 100);
  const customerPhone = (body.customerPhone || "").slice(0, 20);

  if (!customerId && rawEmail) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", rawEmail)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabase
        .from("customers")
        .update({ name: customerName, ...(customerPhone ? { phone: customerPhone } : {}) })
        .eq("id", existingCustomer.id);
    } else {
      const newCustId = "c_" + crypto.randomUUID();
      const { data: newCustomer, error: insertErr } = await supabase
        .from("customers")
        .insert({
          id: newCustId,
          name: customerName,
          email: rawEmail,
          phone: customerPhone,
          role: "customer",
        })
        .select("id")
        .maybeSingle();

      if (insertErr?.code === "23505") {
        const { data: existingCust } = await supabase
          .from("customers")
          .select("id")
          .eq("email", rawEmail)
          .maybeSingle();
        customerId = existingCust?.id || newCustId;
      } else if (newCustomer) {
        customerId = newCustomer.id;
      } else if (insertErr) {
        logger.error("Owner panel customer insert error:", insertErr);
        return { ok: false, status: 500, message: "Failed to create customer record" };
      }
    }
  }

  let bookingEmail = rawEmail;
  let bookingName = body.customerName || null;
  let bookingPhone = body.customerPhone || null;
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

  if (!ctx.bypassOverlap) {
    const finalOverlap = await checkBookingOverlap(
      supabase,
      body.vehicleId,
      body.pickupDate,
      body.returnDate,
      body.pickupTime || null,
      body.returnTime || null,
      { mode: ctx.overlapMode }
    );
    if (finalOverlap) {
      const overlapJson = await finalOverlap.json().catch(() => ({}));
      const message =
        typeof overlapJson === "object" && overlapJson && "message" in overlapJson
          ? String((overlapJson as { message?: string }).message)
          : "Vehicle is not available for these dates";
      return { ok: false, status: 409, message };
    }
  }

  const bookingId = "bk" + crypto.randomUUID().replace(/-/g, "").slice(0, 7);
  const rawAdminNotes = typeof body.adminNotes === "string" ? body.adminNotes.trim() : "";
  const normalizedNotes = rawAdminNotes
    ? (() => {
        const existingMeta = parseRecurringBookingMeta(rawAdminNotes);
        return upsertRecurringBookingMeta(rawAdminNotes, {
          isRecurringLongTerm: existingMeta.isRecurringLongTerm,
          weeklyDueDay: existingMeta.weeklyDueDay,
        });
      })()
    : null;

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
    status: "pending",
    signed_name: body.signedName || null,
    agreement_signed_at: null,
    insurance_proof_url: body.insuranceProofUrl || null,
    insurance_opted_out: body.insuranceOptedOut || false,
    pickup_location_id: body.pickupLocationId || null,
    return_location_id: body.returnLocationId || null,
    location_surcharge: body.locationSurcharge ?? 0,
    admin_notes: normalizedNotes,
    origin_channel: ctx.originChannel,
    created_by_role: ctx.createdByRole,
    created_by_user_id: ctx.createdByUserId,
  });

  if (error) {
    logger.error("createPanelBooking insert error:", error);
    return { ok: false, status: 500, message: "Failed to create booking" };
  }

  const notifyEmail = bookingEmail?.trim() || null;
  const displayName = (bookingName || "Customer").slice(0, 100);

  let vehicleName = "Vehicle";
  let needsPassword = false;

  if (body.vehicleId || notifyEmail) {
    const [vehicleRes, custRes] = await Promise.all([
      body.vehicleId
        ? supabase.from("vehicles").select("year, make, model").eq("id", body.vehicleId).maybeSingle()
        : Promise.resolve({ data: null }),
      notifyEmail
        ? supabase
            .from("customers")
            .select("password_hash")
            .eq("email", notifyEmail)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const vehicle = vehicleRes.data as { year: number; make: string; model: string } | null;
    if (!vehicle && body.vehicleId) {
      return { ok: false, status: 404, message: "Vehicle not found" };
    }
    if (vehicle) vehicleName = getVehicleDisplayName(vehicle);
    needsPassword = !custRes.data?.password_hash;
  }

  if (notifyEmail) {
    const emailData = {
      bookingId,
      customerName: displayName,
      customerEmail: notifyEmail,
      vehicleName,
      pickupDate: body.pickupDate,
      returnDate: body.returnDate,
      pickupTime: body.pickupTime ?? undefined,
      returnTime: body.returnTime ?? undefined,
      totalPrice: body.totalPrice ?? 0,
      deposit: body.deposit ?? 0,
      needsPassword,
      pendingEmailVariant: ctx.pendingEmailVariant,
    };
    sendBookingPendingEmail(emailData).catch(logger.error);
    sendBookingSignAgreement(emailData).catch(logger.error);
    sendAdminNewBooking(emailData).catch(logger.error);
  }

  if (!ctx.skipOwnerNotification) {
    notifyVehicleOwner(
      body.vehicleId,
      "booking_created",
      "New booking",
      `${vehicleName} booked ${body.pickupDate} → ${body.returnDate}.`,
      bookingId
    ).catch(logger.error);
  }

  queueGoogleCalendarBookingSync(bookingId);

  return { ok: true, bookingId, customerId };
}
