import { NextRequest, NextResponse } from "next/server";
import { verifyOwnerWithPortalAccess } from "@/lib/owner/owner-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { isRevenueBooking } from "@/lib/owner/finance";
import { logger } from "@/lib/utils/logger";

export async function GET(req: NextRequest) {
  const auth = await verifyOwnerWithPortalAccess(req);
  if (!auth.authorized) return auth.response;

  try {
    const { vehicles, bookings } = await loadOwnerDataset(auth.ownerId, { ownerPortalOnly: true });

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let currentMonthRevenue = 0;
    let currentMonthPayout = 0;
    let lifetimeRevenue = 0;
    let lifetimePayouts = 0;
    let pendingPayouts = 0;

    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      if (!isRevenueBooking(b.rawStatus)) continue;

      lifetimeRevenue += b.grossRevenue;
      if (b.payoutStatus === "paid") lifetimePayouts += b.ownerPayout;
      else if (b.status === "completed") pendingPayouts += b.ownerPayout;

      if ((b.pickupDate || "").slice(0, 7) === currentMonthKey) {
        currentMonthRevenue += b.grossRevenue;
        currentMonthPayout += b.ownerPayout;
      }
    }

    const round = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            currentMonthRevenue: round(currentMonthRevenue),
            currentMonthPayout: round(currentMonthPayout),
            lifetimeRevenue: round(lifetimeRevenue),
            lifetimePayouts: round(lifetimePayouts),
            pendingPayouts: round(pendingPayouts),
          },
          vehicles,
          bookings,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Owner finance error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load finance data" },
      { status: 500 }
    );
  }
}
