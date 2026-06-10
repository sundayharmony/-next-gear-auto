import { NextRequest, NextResponse } from "next/server";
import { verifyOwnerWithPortalAccess, getOwnerVehicleIds } from "@/lib/owner/owner-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { logger } from "@/lib/utils/logger";
import { getServiceSupabase } from "@/lib/db/supabase";
import {
  createPanelBooking,
  type CreatePanelBookingInput,
} from "@/lib/bookings/create-panel-booking";

/**
 * GET /api/owner/bookings            → all bookings for the owner's vehicles
 * GET /api/owner/bookings?id=bk123   → a single booking (owner-scoped)
 *
 * @deprecated For list/dashboard data prefer GET /api/owner/dataset (bookings slice).
 * POST remains the canonical owner booking-create endpoint.
 *
 * Owners only ever see bookings tied to vehicles they own; the dataset loader
 * filters by owner_id from the JWT, so no client-supplied id can widen scope.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyOwnerWithPortalAccess(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("id");
    const { bookings } = await loadOwnerDataset(auth.ownerId, { ownerPortalOnly: true });

    if (bookingId) {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) {
        return NextResponse.json(
          { success: false, message: "Booking not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: true, data: booking },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true, data: bookings },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Owner bookings error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load bookings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/owner/bookings — create a reservation on one of the owner's vehicles.
 * Vehicle id is validated server-side; clients cannot book vehicles they do not own.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyOwnerWithPortalAccess(req);
  if (!auth.authorized) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const vehicleId = String(body.vehicleId || "");
  if (!vehicleId) {
    return NextResponse.json({ success: false, message: "vehicleId is required" }, { status: 400 });
  }

  const ownedIds = await getOwnerVehicleIds(auth.ownerId);
  if (!ownedIds.includes(vehicleId)) {
    return NextResponse.json(
      { success: false, message: "You can only create bookings for your assigned vehicles" },
      { status: 403 }
    );
  }

  const input: CreatePanelBookingInput = {
    vehicleId,
    pickupDate: String(body.pickupDate || ""),
    returnDate: String(body.returnDate || ""),
    pickupTime: (body.pickupTime as string) || null,
    returnTime: (body.returnTime as string) || null,
    customerName: (body.customerName as string) || null,
    customerEmail: (body.customerEmail as string) || null,
    customerPhone: (body.customerPhone as string) || null,
    customerId: (body.customerId as string) || null,
    totalPrice: typeof body.totalPrice === "number" ? body.totalPrice : Number(body.totalPrice) || 0,
    deposit: typeof body.deposit === "number" ? body.deposit : Number(body.deposit) || 0,
    extras: Array.isArray(body.selectedExtras)
      ? (body.selectedExtras as string[])
      : Array.isArray(body.extras)
        ? (body.extras as string[])
        : [],
    adminNotes: (body.adminNotes as string) || null,
    pickupLocationId: (body.pickup_location_id as string) || (body.pickupLocationId as string) || null,
    returnLocationId: (body.return_location_id as string) || (body.returnLocationId as string) || null,
    locationSurcharge:
      typeof body.location_surcharge === "number"
        ? body.location_surcharge
        : typeof body.locationSurcharge === "number"
          ? body.locationSurcharge
          : 0,
  };

  if (!input.customerName?.trim() || !input.customerEmail?.trim()) {
    return NextResponse.json(
      { success: false, message: "Customer name and email are required" },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();
  const result = await createPanelBooking(supabase, input, {
    originChannel: "owner_panel",
    createdByRole: "owner",
    createdByUserId: auth.ownerId,
    overlapMode: "manager",
    bypassOverlap: false,
    pendingEmailVariant: "staff",
    skipOwnerNotification: true,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message }, { status: result.status });
  }

  return NextResponse.json(
    { success: true, data: { id: result.bookingId, customer_id: result.customerId } },
    { status: 201 }
  );
}
