import { NextRequest, NextResponse } from "next/server";
import { verifyOwner } from "@/lib/owner/owner-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/owner/bookings            → all bookings for the owner's vehicles
 * GET /api/owner/bookings?id=bk123   → a single booking (owner-scoped)
 *
 * Owners only ever see bookings tied to vehicles they own; the dataset loader
 * filters by owner_id from the JWT, so no client-supplied id can widen scope.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyOwner(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("id");
    const { bookings } = await loadOwnerDataset(auth.ownerId);

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
