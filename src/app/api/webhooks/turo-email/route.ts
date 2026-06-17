import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { parseTuroEmail, sanitizeLocation } from "@/lib/utils/turo-email-parser";
import { TURO_BLOCKED_SOURCE, CANCELLED_REASON_PREFIX } from "@/lib/utils/blocked-dates";
import { pickTuroCancellationMatch, reasonMatchesTuroGuest } from "@/lib/utils/turo-cancellation-match";
import { getTuroDriverFromReason } from "@/lib/utils/turo-blocked-date";
import { markTuroBlockedDateCancelled } from "@/lib/admin/turo-cancellation-sync";
import { logger } from "@/lib/utils/logger";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";
import { safeCompareSecret } from "@/lib/security/constant-time";
import {
  getClientIp,
  rateLimitResponse,
  turoWebhookLimiter,
} from "@/lib/security/rate-limit";
import {
  isWebhookReplay,
  isWebhookTimestampFresh,
} from "@/lib/security/webhook-replay";

type TuroBlockedRow = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  location: string | null;
  earnings: number | null;
  source: string;
  reason: string | null;
  is_extension: boolean;
  original_end_date: string | null;
  cancelled_at: string | null;
};

const TURO_SELECT_FULL =
  "id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason, is_extension, original_end_date, cancelled_at";
const TURO_SELECT_MINIMAL = "id, vehicle_id, start_date, end_date, source, reason";

function normalizeTuroRow(row: Record<string, unknown>): TuroBlockedRow {
  return {
    id: String(row.id),
    vehicle_id: String(row.vehicle_id),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    source: String(row.source ?? TURO_BLOCKED_SOURCE),
    reason: row.reason != null ? String(row.reason) : null,
    pickup_time: row.pickup_time != null ? String(row.pickup_time) : null,
    return_time: row.return_time != null ? String(row.return_time) : null,
    location: row.location != null ? String(row.location) : null,
    earnings: typeof row.earnings === "number" ? row.earnings : null,
    is_extension: Boolean(row.is_extension),
    original_end_date: row.original_end_date != null ? String(row.original_end_date) : null,
    cancelled_at: row.cancelled_at != null ? String(row.cancelled_at) : null,
  };
}

function asTuroRow(row: Record<string, unknown> | null | undefined): TuroBlockedRow | null {
  if (!row || row.id == null) return null;
  return normalizeTuroRow(row);
}

/**
 * POST /api/webhooks/turo-email
 *
 * Inbound webhook that receives Turo booking email text (forwarded
 * from Gmail via Google Apps Script), parses the booking details,
 * auto-matches the vehicle, and creates a blocked date entry.
 *
 * Auth: Bearer token must match TURO_WEBHOOK_SECRET env var.
 *
 * Body: { emailText: string, eventType?: "booking"|"extension"|"cancellation"|"reconcile_refresh" }
 *
 * Responses:
 *   201 — blocked date created
 *   200 — skipped (duplicate / already blocked)
 *   400 — bad request (missing data or parse failure)
 *   401 — invalid or missing secret
 *   500 — server error
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = await turoWebhookLimiter.check(ip);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetAt);
  }

  const secret = process.env.TURO_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("TURO_WEBHOOK_SECRET env var is not configured");
    return NextResponse.json(
      { success: false, message: "Webhook not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || !safeCompareSecret(token, secret)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const timestampHeader =
    req.headers.get("x-turo-timestamp") ||
    req.headers.get("x-webhook-timestamp") ||
    req.headers.get("x-idempotency-timestamp");
  if (timestampHeader) {
    const ts = parseInt(timestampHeader, 10);
    if (!isWebhookTimestampFresh(ts)) {
      return NextResponse.json(
        { success: false, message: "Request timestamp outside replay window" },
        { status: 401 }
      );
    }
  }

  const idempotencyKey =
    req.headers.get("x-idempotency-key") ||
    req.headers.get("x-turo-idempotency-key") ||
    "";
  if (idempotencyKey && isWebhookReplay(idempotencyKey)) {
    return NextResponse.json(
      { success: true, action: "duplicate", message: "Already processed" },
      { status: 200 }
    );
  }

  try {
    const body = await req.json();
    const emailText: string = String(body.emailText || body.email_text || "").slice(0, 65536);
    const explicitEventType =
      typeof body.eventType === "string" ? String(body.eventType).toLowerCase() : "";

    if (!emailText || emailText.length < 20) {
      return NextResponse.json(
        { success: false, message: "emailText is required (min 20 chars)" },
        { status: 400 }
      );
    }

    // ── Parse the Turo email ──
    const parsed = parseTuroEmail(emailText);
    const tripLocation = sanitizeLocation(parsed.location);
    const isReconcileRefresh = explicitEventType === "reconcile_refresh";
    const isCancellationEvent =
      explicitEventType === "cancellation" || (explicitEventType !== "booking" && parsed.isCancellation);

    if (!parsed.startDate || !parsed.endDate) {
      logger.warn("Turo webhook: could not extract dates", {
        confidence: parsed.confidence,
        rawMatches: parsed.rawMatches,
      });
      return NextResponse.json(
        {
          success: false,
          message: "Could not extract booking dates from email",
          parsed: {
            confidence: parsed.confidence,
            rawMatches: parsed.rawMatches,
            guestName: parsed.guestName,
            vehicleDescription: parsed.vehicleDescription,
          },
        },
        { status: 400 }
      );
    }

    // ── Match vehicle ──
    const supabase = getServiceSupabase();
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, year, make, model")
      .order("year", { ascending: false });

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json(
        { success: false, message: "No vehicles in database" },
        { status: 400 }
      );
    }

    let matchedVehicle: (typeof vehicles)[number] | null = null;
    let matchScore = 0;
    let secondBestScore = 0;

    const desc = (parsed.vehicleDescription || "").toLowerCase();
    const fullText = emailText.slice(0, 65536).toLowerCase();

    for (const v of vehicles) {
      let score = 0;
      const make = (v.make || "").toLowerCase();
      const model = (v.model || "").toLowerCase();
      const year = String(v.year || "");

      const aliases: Record<string, string[]> = {
        volkswagen: ["vw"],
        vw: ["volkswagen"],
        chevrolet: ["chevy"],
        chevy: ["chevrolet"],
        ram: ["dodge ram", "dodge"],
      };

      // Strong make/model/year signals from parsed vehicle description when available
      if (desc) {
        if (make && desc.includes(make)) score += 4;
        if (model && desc.includes(model)) score += 5;
        if (year && desc.includes(year)) score += 3;
      }

      // Full email body fallback matching (handles template variations)
      if (make && fullText.includes(make)) score += 2;
      if (model && fullText.includes(model)) score += 3;
      if (make && aliases[make]) {
        for (const alias of aliases[make]) {
          if (fullText.includes(alias)) {
            score += 2;
            break;
          }
        }
      }

      if (model && model.length > 3) {
        const modelWords = model.split(/\s+/).filter((w: string) => w.length > 2);
        for (const w of modelWords) {
          if (fullText.includes(w.toLowerCase())) score += 1;
        }
      }

      // Bonus when year appears in the same email as make/model (no dynamic RegExp on body).
      if (year && fullText.includes(year)) {
        if (make && fullText.includes(make)) score += 3;
        if (model && fullText.includes(model)) score += 3;
        if (make && aliases[make]?.some((alias) => fullText.includes(alias))) score += 1;
      }

      if (score > matchScore) {
        secondBestScore = matchScore;
        matchScore = score;
        matchedVehicle = v;
      } else if (score > secondBestScore) {
        secondBestScore = score;
      }
    }

    // Avoid silent wrong-vehicle inserts when match quality is weak/ambiguous.
    if (!matchedVehicle || matchScore < 4 || matchScore === secondBestScore) {
      logger.warn("Turo webhook: vehicle match confidence too low", {
        vehicleDescription: parsed.vehicleDescription,
        matchScore,
        secondBestScore,
      });
      return NextResponse.json(
        {
          success: false,
          message: "Could not confidently match this Turo trip to a fleet vehicle",
          parsed: {
            confidence: parsed.confidence,
            guestName: parsed.guestName,
            vehicleDescription: parsed.vehicleDescription,
            matchScore,
            secondBestScore,
          },
        },
        { status: 400 }
      );
    }

    const vehicleLabel = `${matchedVehicle.year} ${matchedVehicle.make} ${matchedVehicle.model}`;

    /** Active Turo trips only — never merge/update manual blocks or cancelled rows. */
    async function findActiveTuroTrips(filters: {
      startDate?: string;
      overlapStart?: string;
      overlapEnd?: string;
    }): Promise<{ data: TuroBlockedRow[]; error: { message: string } | null }> {
      let q = supabase
        .from("blocked_dates")
        .select(TURO_SELECT_FULL)
        .eq("vehicle_id", matchedVehicle!.id)
        .eq("source", TURO_BLOCKED_SOURCE);

      if (filters.startDate) q = q.eq("start_date", filters.startDate);
      if (filters.overlapStart && filters.overlapEnd) {
        q = q.lte("start_date", filters.overlapEnd).gte("end_date", filters.overlapStart);
      }

      let { data, error } = await q.is("cancelled_at", null).order("created_at", { ascending: false }).limit(10);

      if (error && isMissingColumnError(error)) {
        let fb = supabase
          .from("blocked_dates")
          .select(TURO_SELECT_MINIMAL)
          .eq("vehicle_id", matchedVehicle!.id)
          .eq("source", TURO_BLOCKED_SOURCE)
          .order("created_at", { ascending: false })
          .limit(10);
        if (filters.startDate) fb = fb.eq("start_date", filters.startDate);
        if (filters.overlapStart && filters.overlapEnd) {
          fb = fb.lte("start_date", filters.overlapEnd).gte("end_date", filters.overlapStart);
        }
        const res = await fb;
        let rows = (res.data || [])
          .map((r) => normalizeTuroRow(r as Record<string, unknown>))
          .filter((r) => !r.reason?.trimStart().startsWith(CANCELLED_REASON_PREFIX));
        if (filters.startDate) {
          rows = rows.filter((r) => r.start_date === filters.startDate);
        }
        if (filters.overlapStart && filters.overlapEnd) {
          rows = rows.filter(
            (r) =>
              r.start_date <= filters.overlapEnd! &&
              r.end_date >= filters.overlapStart!
          );
        }
        return { data: rows, error: res.error };
      }

      if (error) return { data: [], error };

      let rows = (data || []).map((r) => normalizeTuroRow(r as Record<string, unknown>));
      if (filters.startDate) {
        rows = rows.filter((r) => r.start_date === filters.startDate);
      }
      if (filters.overlapStart && filters.overlapEnd) {
        rows = rows.filter(
          (r) =>
            r.start_date <= filters.overlapEnd! &&
            r.end_date >= filters.overlapStart!
        );
      }
      return { data: rows, error: null };
    }

    // ── Handle cancellation emails ──
    if (isCancellationEvent) {
      const { data: candidates, error: findErr } = await findActiveTuroTrips({
        overlapStart: parsed.startDate!,
        overlapEnd: parsed.endDate!,
      });

      if (findErr) {
        logger.error("Turo webhook: cancellation lookup error", findErr);
        return NextResponse.json({ success: false, message: findErr.message }, { status: 500 });
      }

      const matchedTrip = pickTuroCancellationMatch(
        candidates,
        parsed.startDate!,
        parsed.endDate!,
        parsed.guestName
      );

      if (!matchedTrip) {
        logger.warn("Turo webhook: cancellation email but no matching active Turo trip", {
          vehicle: vehicleLabel,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          guest: parsed.guestName,
        });
        return NextResponse.json(
          {
            success: false,
            message: "Could not find an active Turo trip to cancel for these dates",
            parsed: {
              confidence: parsed.confidence,
              guestName: parsed.guestName,
              isCancellation: true,
            },
          },
          { status: 404 }
        );
      }

      const cancelledAt = new Date().toISOString();
      const cancelRes = await supabase
        .from("blocked_dates")
        .update({ cancelled_at: cancelledAt })
        .eq("id", matchedTrip.id)
        .select(TURO_SELECT_FULL)
        .maybeSingle();
      let cancelled: TuroBlockedRow | null = asTuroRow(cancelRes.data as Record<string, unknown>);
      let cancelErr = cancelRes.error;

      if (cancelErr && isMissingColumnError(cancelErr)) {
        const cancelledAtFallback = new Date().toISOString();
        const reason = matchedTrip.reason?.startsWith(CANCELLED_REASON_PREFIX)
          ? matchedTrip.reason
          : `${CANCELLED_REASON_PREFIX} ${cancelledAtFallback} — ${matchedTrip.reason || "Turo trip"}`;
        const fallback = await supabase
          .from("blocked_dates")
          .update({ reason })
          .eq("id", matchedTrip.id)
          .select(TURO_SELECT_MINIMAL)
          .maybeSingle();
        cancelled = asTuroRow(fallback.data as Record<string, unknown>);
        cancelErr = fallback.error;
        if (!cancelErr) {
          logger.info("Turo webhook: trip cancelled via reason prefix (run supabase-turo-cancellations.sql for cancelled_at)", {
            id: matchedTrip.id,
          });
          return NextResponse.json({
            success: true,
            action: "cancelled",
            message: `Marked Turo trip cancelled for ${vehicleLabel} (${matchedTrip.start_date} → ${matchedTrip.end_date})`,
            data: cancelled,
            parsed: {
              confidence: parsed.confidence,
              guestName: parsed.guestName,
              vehicleMatched: vehicleLabel,
              isCancellation: true,
              usedReasonFallback: true,
            },
          });
        }
      }

      if (cancelErr) {
        logger.error("Turo webhook: cancellation update error", cancelErr);
        return NextResponse.json({ success: false, message: cancelErr.message }, { status: 500 });
      }

      logger.info("Turo webhook: trip cancelled", {
        id: matchedTrip.id,
        vehicle: vehicleLabel,
        dates: `${matchedTrip.start_date} → ${matchedTrip.end_date}`,
        guest: parsed.guestName,
      });

      return NextResponse.json({
        success: true,
        action: "cancelled",
        message: `Marked Turo trip cancelled for ${vehicleLabel} (${matchedTrip.start_date} → ${matchedTrip.end_date})`,
        data: cancelled,
        parsed: {
          confidence: parsed.confidence,
          guestName: parsed.guestName,
          vehicleMatched: vehicleLabel,
          isCancellation: true,
        },
      });
    }

    // ── Handle extension emails ──
    if (explicitEventType === "extension" || parsed.isExtension) {
      const { data: existingBlocks } = await findActiveTuroTrips({ startDate: parsed.startDate! });

      // Also try finding by overlapping date range if exact start match fails
      let matchedBlock = existingBlocks?.[0] ?? null;
      if (!matchedBlock) {
        const { data: overlapBlocks } = await findActiveTuroTrips({
          overlapStart: parsed.startDate!,
          overlapEnd: parsed.startDate!,
        });
        matchedBlock = overlapBlocks?.[0] ?? null;
      }

      if (matchedBlock) {
        // Update existing record in-place
        const updateFields: Record<string, string | number | boolean | null> = {
          end_date: parsed.endDate,
          is_extension: true,
          original_end_date: matchedBlock.end_date,
        };
        if (parsed.earnings != null) updateFields.earnings = parsed.earnings;
        if (parsed.returnTime) updateFields.return_time = parsed.returnTime;
        if (tripLocation) updateFields.location = tripLocation;

        // Update reason to reflect extension
        const guestNote = parsed.guestName ? `: ${parsed.guestName}` : "";
        const earningsNote = parsed.earnings ? ` — $${parsed.earnings}` : "";
        updateFields.reason = `Turo (extended)${guestNote}${earningsNote}`;

        const updateRes = await supabase
          .from("blocked_dates")
          .update(updateFields)
          .eq("id", matchedBlock.id)
          .select("id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason, is_extension, original_end_date")
          .maybeSingle();
        let updated: TuroBlockedRow | null = asTuroRow(updateRes.data as Record<string, unknown>);
        let updateError = updateRes.error;

        if (updateError && isMissingColumnError(updateError)) {
          const fallbackFields: Record<string, string | number | boolean | null> = {
            end_date: parsed.endDate,
            reason: updateFields.reason ?? null,
          };
          const fallback = await supabase
            .from("blocked_dates")
            .update(fallbackFields)
            .eq("id", matchedBlock.id)
            .select(TURO_SELECT_MINIMAL)
            .maybeSingle();
          updated = asTuroRow(fallback.data as Record<string, unknown>);
          updateError = fallback.error;
        }

        if (updateError) {
          logger.error("Turo webhook: extension update error", updateError);
          return NextResponse.json(
            { success: false, message: updateError.message },
            { status: 500 }
          );
        }

        logger.info("Turo webhook: trip extended", {
          id: matchedBlock.id,
          vehicle: vehicleLabel,
          previousEnd: matchedBlock.end_date,
          newEnd: parsed.endDate,
          guest: parsed.guestName,
        });

        return NextResponse.json({
          success: true,
          action: "extended",
          message: `Extended ${vehicleLabel} from ${matchedBlock.end_date} to ${parsed.endDate}`,
          data: updated,
          parsed: {
            confidence: parsed.confidence,
            guestName: parsed.guestName,
            vehicleDescription: parsed.vehicleDescription,
            vehicleMatched: vehicleLabel,
            vehicleMatchScore: matchScore,
            isExtension: true,
            previousEndDate: matchedBlock.end_date,
          },
        });
      } else {
        // No matching block found — fall through to create new one
        logger.warn("Turo webhook: extension email but no matching block found, creating new", {
          vehicle: vehicleLabel,
          startDate: parsed.startDate,
        });
      }
    }

    // ── Overlapping Turo trips only: merge date range + refresh metadata ──
    const { data: overlapping } = await findActiveTuroTrips({
      overlapStart: parsed.startDate!,
      overlapEnd: parsed.endDate!,
    });

    if (overlapping && overlapping.length > 0) {
      const row = overlapping[0];
      const existingGuest = getTuroDriverFromReason(row.reason);
      const newGuest = parsed.guestName?.trim() || null;
      const isDifferentGuest =
        Boolean(newGuest && existingGuest && !reasonMatchesTuroGuest(row.reason, newGuest));

      if (isDifferentGuest) {
        try {
          await markTuroBlockedDateCancelled(supabase, row);
          logger.info("Turo webhook: superseded prior guest with new booking (prior trip marked cancelled)", {
            id: row.id,
            vehicle: vehicleLabel,
            previousGuest: existingGuest,
            newGuest,
            dates: `${row.start_date} → ${row.end_date}`,
          });
        } catch (supersedeErr) {
          logger.error("Turo webhook: failed to supersede prior guest trip", supersedeErr);
          return NextResponse.json(
            { success: false, message: "Could not supersede prior Turo trip for new guest" },
            { status: 500 }
          );
        }
      } else {
        const sameGuest =
          Boolean(newGuest) &&
          (!existingGuest || reasonMatchesTuroGuest(row.reason, newGuest!));
        const useParsedDates = isReconcileRefresh && sameGuest;
        const mergedStart = useParsedDates
          ? parsed.startDate!
          : parsed.startDate! < row.start_date
            ? parsed.startDate!
            : row.start_date;
        const mergedEnd = useParsedDates
          ? parsed.endDate!
          : parsed.endDate! > row.end_date
            ? parsed.endDate!
            : row.end_date;
        const rangeWidened = mergedStart !== row.start_date || mergedEnd !== row.end_date;
        const reason = parsed.guestName
          ? `Turo: ${parsed.guestName}${parsed.earnings ? ` — $${parsed.earnings}` : ""}`
          : `Turo booking${parsed.earnings ? ` — $${parsed.earnings}` : ""}`;
        const shouldUpdateReason =
          Boolean(parsed.guestName) || typeof parsed.earnings === "number" || !row.reason;

        const updateFields: Record<string, string | number | boolean | null> = {
          start_date: mergedStart,
          end_date: mergedEnd,
        };
        if (shouldUpdateReason) updateFields.reason = reason;
        if (parsed.pickupTime != null) updateFields.pickup_time = parsed.pickupTime;
        if (parsed.returnTime != null) updateFields.return_time = parsed.returnTime;
        if (tripLocation != null) updateFields.location = tripLocation;
        if (parsed.earnings != null) updateFields.earnings = parsed.earnings;

        const mergeRes = await supabase
          .from("blocked_dates")
          .update(updateFields)
          .eq("id", row.id)
          .select("id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason")
          .maybeSingle();
        let updated: TuroBlockedRow | null = asTuroRow(mergeRes.data as Record<string, unknown>);
        let mergeErr = mergeRes.error;

        if (mergeErr && isMissingColumnError(mergeErr)) {
          const fallbackFields = {
            start_date: mergedStart,
            end_date: mergedEnd,
            reason: shouldUpdateReason ? reason : row.reason,
          };
          const fallback = await supabase
            .from("blocked_dates")
            .update(fallbackFields)
            .eq("id", row.id)
            .select(TURO_SELECT_MINIMAL)
            .maybeSingle();
          updated = asTuroRow(fallback.data as Record<string, unknown>);
          mergeErr = fallback.error;
        }

        if (mergeErr) {
          logger.error("Turo webhook: merge update error", mergeErr);
          return NextResponse.json({ success: false, message: mergeErr.message }, { status: 500 });
        }

        logger.info("Turo webhook: merged blocked_dates row", {
          id: row.id,
          vehicle: vehicleLabel,
          previous: `${row.start_date} → ${row.end_date}`,
          merged: `${mergedStart} → ${mergedEnd}`,
          rangeWidened,
        });

        return NextResponse.json({
          success: true,
          action: rangeWidened ? "merged_widened" : "merged_refresh",
          message: rangeWidened
            ? `Updated block for ${vehicleLabel} to ${mergedStart} → ${mergedEnd}`
            : `Refreshed Turo block for ${vehicleLabel} (${mergedStart} → ${mergedEnd})`,
          data: updated,
          parsed: {
            confidence: parsed.confidence,
            guestName: parsed.guestName,
            vehicleDescription: parsed.vehicleDescription,
            vehicleMatched: vehicleLabel,
            vehicleMatchScore: matchScore,
          },
        });
      }
    }

    if (isReconcileRefresh) {
      // Prior trip may already be cancelled (e.g. guest swap) — create if missing.
      logger.info("Turo webhook: reconcile refresh had no active trip; creating", {
        vehicle: vehicleLabel,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        guest: parsed.guestName,
      });
    }

    // ── Create the blocked date ──
    const reason = parsed.guestName
      ? `Turo: ${parsed.guestName}${parsed.earnings ? ` — $${parsed.earnings}` : ""}`
      : `Turo booking${parsed.earnings ? ` — $${parsed.earnings}` : ""}`;

    const createRes = await supabase
      .from("blocked_dates")
      .insert({
        vehicle_id: matchedVehicle.id,
        start_date: parsed.startDate,
        end_date: parsed.endDate,
        pickup_time: parsed.pickupTime ?? null,
        return_time: parsed.returnTime ?? null,
        location: tripLocation ?? null,
        earnings: parsed.earnings ?? null,
        source: TURO_BLOCKED_SOURCE,
        reason,
      })
      .select("id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason")
      .maybeSingle();
    let created: TuroBlockedRow | null = asTuroRow(createRes.data as Record<string, unknown>);
    let error = createRes.error;

    if (error && isMissingColumnError(error)) {
      const fallback = await supabase
        .from("blocked_dates")
        .insert({
          vehicle_id: matchedVehicle.id,
          start_date: parsed.startDate,
          end_date: parsed.endDate,
          source: TURO_BLOCKED_SOURCE,
          reason,
        })
        .select(TURO_SELECT_MINIMAL)
        .maybeSingle();
      created = asTuroRow(fallback.data as Record<string, unknown>);
      error = fallback.error;
    }

    if (error) {
      logger.error("Turo webhook: insert error", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    logger.info("Turo webhook: blocked dates created", {
      id: created?.id,
      vehicle: vehicleLabel,
      dates: `${parsed.startDate} → ${parsed.endDate}`,
      guest: parsed.guestName,
      confidence: parsed.confidence,
      vehicleMatchScore: matchScore,
    });

    return NextResponse.json(
      {
        success: true,
        action: "created",
        message: `Blocked ${vehicleLabel} from ${parsed.startDate} to ${parsed.endDate}`,
        data: created,
        parsed: {
          confidence: parsed.confidence,
          guestName: parsed.guestName,
          vehicleDescription: parsed.vehicleDescription,
          vehicleMatched: vehicleLabel,
          vehicleMatchScore: matchScore,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("Turo webhook error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
