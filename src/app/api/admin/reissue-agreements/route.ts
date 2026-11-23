import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import { regenerateSignedAgreementForBooking } from "@/lib/agreement/signed-agreement";

/**
 * Admin only. Re-issues already-signed agreements in the current PDF format.
 *
 * For each signed booking whose signature image is still on file, the original signed PDF is first
 * copied to `<bookingId>/original/` and only then replaced. A booking whose original cannot be
 * preserved is skipped untouched. Bookings already re-issued are skipped, so this can be run
 * repeatedly in small batches.
 *
 * POST { dryRun?: boolean, limit?: number (1-15, default 8) }
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean; limit?: number };
    const dryRun = body.dryRun === true;
    const limit = Math.min(15, Math.max(1, Math.floor(Number(body.limit) || 8)));

    const supabase = getServiceSupabase();
    const { data: signed, error } = await supabase
      .from("bookings")
      .select("id")
      .not("rental_agreement_url", "is", null)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const allIds = (signed ?? []).map((b: { id: string }) => b.id);

    const none = ["00000000-0000-0000-0000-000000000000"];
    // Only contracts whose signature image is still on file can be re-drawn.
    const { data: withSig } = await supabase
      .from("booking_activity")
      .select("booking_id")
      .eq("action", "agreement_signed")
      .not("details->signatures", "is", null)
      .in("booking_id", allIds.length ? allIds : none);
    const eligible = new Set((withSig ?? []).map((r: { booking_id: string }) => r.booking_id));

    // Already re-issued, or tried and skipped (so a problem contract never blocks the queue).
    const { data: done } = await supabase
      .from("booking_activity")
      .select("booking_id")
      .in("action", ["agreement_reissued", "agreement_reissue_skipped"])
      .in("booking_id", allIds.length ? allIds : none);
    const doneIds = new Set((done ?? []).map((r: { booking_id: string }) => r.booking_id));
    const pending = allIds.filter((id: string) => eligible.has(id) && !doneIds.has(id));

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        totalSigned: allIds.length,
        remaining: pending.length,
        withoutStoredSignature: allIds.length - eligible.size,
      });
    }

    const batch = pending.slice(0, limit);
    const results: { id: string; status: "reissued" | "skipped" | "failed" }[] = [];
    for (const id of batch) {
      try {
        const { data: booking } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
        if (!booking) {
          results.push({ id, status: "skipped" });
          continue;
        }
        const ok = await regenerateSignedAgreementForBooking(supabase, booking, { reissue: true });
        if (!ok) {
          await supabase.from("booking_activity").insert({
            booking_id: id,
            action: "agreement_reissue_skipped",
            details: { reason: "original_not_preserved_or_no_signature" },
          });
        }
        results.push({ id, status: ok ? "reissued" : "skipped" });
      } catch (err) {
        logger.error(`Re-issue failed for booking ${id}:`, err);
        results.push({ id, status: "failed" });
      }
    }

    const reissued = results.filter((r) => r.status === "reissued").length;
    return NextResponse.json({
      success: true,
      totalSigned: allIds.length,
      processed: results.length,
      reissued,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
      remaining: Math.max(0, pending.length - results.length),
      withoutStoredSignature: allIds.length - eligible.size,
    });
  } catch (error) {
    logger.error("Reissue agreements error:", error);
    return NextResponse.json({ success: false, error: "Could not re-issue agreements" }, { status: 500 });
  }
}
