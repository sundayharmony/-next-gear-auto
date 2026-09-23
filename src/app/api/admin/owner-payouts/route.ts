import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/admin/owner-payouts?ownerId=...
 * Returns the owner's bookings enriched with their current payout status so an
 * admin can review and issue payouts.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const ownerId = new URL(req.url).searchParams.get("ownerId");
    if (!ownerId) {
      return NextResponse.json({ success: false, message: "ownerId is required" }, { status: 400 });
    }
    const { bookings } = await loadOwnerDataset(ownerId);
    return NextResponse.json(
      { success: true, data: bookings },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Admin owner-payouts GET error:", err);
    return NextResponse.json({ success: false, message: "Failed to load payouts" }, { status: 500 });
  }
}

/**
 * POST /api/admin/owner-payouts
 * Payouts are no longer recorded. Earnings are treated as already paid out.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  return NextResponse.json(
    {
      success: false,
      message: "Owner payouts are no longer recorded. Earnings are treated as already paid out.",
    },
    { status: 409 }
  );
}
