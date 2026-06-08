import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { listTuroCancellationStatus, syncTuroCancellations } from "@/lib/admin/turo-cancellation-sync";
import { logger } from "@/lib/utils/logger";

/** GET /api/admin/blocked-dates/sync-cancellations — audit active vs cancelled Turo trips. */
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const data = await listTuroCancellationStatus();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("Turo cancellation audit GET error:", err);
    return NextResponse.json({ success: false, message: "Failed to audit Turo cancellations" }, { status: 500 });
  }
}

/** POST /api/admin/blocked-dates/sync-cancellations — match cancellation emails / trip ids. */
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const emails = Array.isArray(body.emails)
      ? body.emails.map((e: unknown) => String(e || "").slice(0, 65536)).filter((e: string) => e.length > 20)
      : body.emailText
        ? [String(body.emailText).slice(0, 65536)]
        : undefined;
    const tripIds = Array.isArray(body.tripIds)
      ? body.tripIds.map((id: unknown) => String(id)).filter(Boolean)
      : undefined;

    const result = await syncTuroCancellations({
      emails,
      tripIds,
      deleteRows: Boolean(body.delete),
      purgeAlreadyCancelled: body.purgeAlreadyCancelled !== false,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    logger.error("Turo cancellation sync POST error:", err);
    return NextResponse.json({ success: false, message: "Failed to sync Turo cancellations" }, { status: 500 });
  }
}
