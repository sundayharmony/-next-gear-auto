import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { parseTuroEmail } from "@/lib/utils/turo-email-parser";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/webhooks/turo-email
 *
 * Inbound webhook that receives Turo booking email text (forwarded
 * from Gmail via Google Apps Script), parses the booking details,
 * auto-matches the vehicle, and creates a blocked date entry.
 *
 * Auth: Bearer token must match TURO_WEBHOOK_SECRET env var.
 *
 * Body: { emailText: string }
 *
 * Responses:
 *   201 — blocked date created
 *   200 — skipped (duplicate / already blocked)
 *   400 — bad request (missing data or parse failure)
 *   401 — invalid or missing secret
 *   500 — server error
 */
export async function POST(req: NextRequest) {
  // ── Auth: verify shared secret ──
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
  if (!token || token !== secret) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const emailText: string = body.emailText || body.email_text || "";

    if (!emailText || emailText.length < 20) {
      return NextResponse.json(
        { success: false, message: "emailText is required (min 20 chars)" },
        { status: 400 }
      );
    }

    // ── Parse the Turo email ──
    const parsed = parseTuroEmail(emailText);

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

    let matchedVehicle = vehicles[0]; // fallback to first vehicle
    let matchScore = 0;

    // Escape special regex characters in a string
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (parsed.vehicleDescription) {
      const desc = parsed.vehicleDescription.toLowerCase();
      const fullText = emailText.toLowerCase();

      for (const v of vehicles) {
        let score = 0;
        const make = (v.make || "").toLowerCase();
        const model = (v.model || "").toLowerCase();
        const year = String(v.year || "");

        // Exact make match
        if (make && desc.includes(make)) score += 3;
        // Handle abbreviations (VW/Volkswagen, Chevy/Chevrolet, RAM/Ram)
        const aliases: Record<string, string[]> = {
          volkswagen: ["vw"],
          vw: ["volkswagen"],
          chevrolet: ["chevy"],
          chevy: ["chevrolet"],
          ram: ["dodge ram", "dodge"],
        };
        if (make && aliases[make]) {
          for (const alias of aliases[make]) {
            if (desc.includes(alias)) { score += 3; break; }
          }
        }

        // Model match (full match is mutually exclusive with partial word match)
        if (model && desc.includes(model)) {
          score += 4;
        } else if (model && model.length > 3) {
          // Partial model match (e.g. "Highlander" in "Toyota Highlander XLE")
          const modelWords = model.split(/\s+/);
          for (const w of modelWords) {
            if (w.length > 2 && desc.includes(w.toLowerCase())) score += 2;
          }
        }

        // Year match — check parsed description first, then full email text
        if (year && desc.includes(year)) {
          score += 3;
        } else if (year) {
          // Search full email text for year near make/model (e.g. "2018 Volkswagen Jetta")
          const makeOrModel = make || model;
          if (makeOrModel) {
            // Build regex-safe alternatives
            const alts = [make, model].filter(Boolean).map(escapeRegex);
            if (aliases[make]) {
              alts.push(...aliases[make].map(escapeRegex));
            }
            const altsPattern = alts.join("|");
            // Check for "2018 Volkswagen", "2018 VW", "Volkswagen Jetta 2018", etc.
            const yearNearVehicle = new RegExp(
              `${escapeRegex(year)}\\s{1,5}(?:${altsPattern})|(?:${altsPattern})\\s{1,5}${escapeRegex(year)}`,
              "i"
            );
            if (yearNearVehicle.test(fullText)) {
              score += 2;
            }
          }
        }

        if (score > matchScore) {
          matchScore = score;
          matchedVehicle = v;
        }
      }
    }

    const vehicleLabel = `${matchedVehicle.year} ${matchedVehicle.make} ${matchedVehicle.model}`;

    // ── Handle extension emails ──
    if (parsed.isExtension) {
      // Find existing blocked date for this vehicle with matching start date
      const { data: existingBlocks } = await supabase
        .from("blocked_dates")
        .select("id, start_date, end_date, earnings, reason")
        .eq("vehicle_id", matchedVehicle.id)
        .eq("start_date", parsed.startDate)
        .order("created_at", { ascending: false })
        .limit(5);

      // Also try finding by overlapping date range if exact start match fails
      let matchedBlock = existingBlocks?.[0] ?? null;
      if (!matchedBlock) {
        const { data: overlapBlocks } = await supabase
          .from("blocked_dates")
          .select("id, start_date, end_date, earnings, reason")
          .eq("vehicle_id", matchedVehicle.id)
          .lte("start_date", parsed.startDate)
          .gte("end_date", parsed.startDate)
          .order("created_at", { ascending: false })
          .limit(5);
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
        if (parsed.location) updateFields.location = parsed.location;

        // Update reason to reflect extension
        const guestNote = parsed.guestName ? `: ${parsed.guestName}` : "";
        const earningsNote = parsed.earnings ? ` — $${parsed.earnings}` : "";
        updateFields.reason = `Turo (extended)${guestNote}${earningsNote}`;

        const { data: updated, error: updateError } = await supabase
          .from("blocked_dates")
          .update(updateFields)
          .eq("id", matchedBlock.id)
          .select("id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason, is_extension, original_end_date")
          .maybeSingle();

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

    // ── Overlapping blocks: merge date range + refresh metadata (fixes calendar when Turo resends or dates shift) ──
    const { data: overlapping } = await supabase
      .from("blocked_dates")
      .select("id, start_date, end_date, source")
      .eq("vehicle_id", matchedVehicle.id)
      .lte("start_date", parsed.endDate)
      .gte("end_date", parsed.startDate);

    if (overlapping && overlapping.length > 0) {
      const row = overlapping[0];
      const mergedStart = parsed.startDate < row.start_date ? parsed.startDate : row.start_date;
      const mergedEnd = parsed.endDate > row.end_date ? parsed.endDate : row.end_date;
      const rangeWidened = mergedStart !== row.start_date || mergedEnd !== row.end_date;
      const reason = parsed.guestName
        ? `Turo: ${parsed.guestName}${parsed.earnings ? ` — $${parsed.earnings}` : ""}`
        : `Turo booking${parsed.earnings ? ` — $${parsed.earnings}` : ""}`;

      const updateFields: Record<string, string | number | boolean | null> = {
        start_date: mergedStart,
        end_date: mergedEnd,
        reason,
      };
      if (parsed.pickupTime != null) updateFields.pickup_time = parsed.pickupTime;
      if (parsed.returnTime != null) updateFields.return_time = parsed.returnTime;
      if (parsed.location != null) updateFields.location = parsed.location;
      if (parsed.earnings != null) updateFields.earnings = parsed.earnings;

      const { data: updated, error: mergeErr } = await supabase
        .from("blocked_dates")
        .update(updateFields)
        .eq("id", row.id)
        .select("id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason")
        .maybeSingle();

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

    // ── Create the blocked date ──
    const reason = parsed.guestName
      ? `Turo: ${parsed.guestName}${parsed.earnings ? ` — $${parsed.earnings}` : ""}`
      : `Turo booking${parsed.earnings ? ` — $${parsed.earnings}` : ""}`;

    const { data: created, error } = await supabase
      .from("blocked_dates")
      .insert({
        vehicle_id: matchedVehicle.id,
        start_date: parsed.startDate,
        end_date: parsed.endDate,
        pickup_time: parsed.pickupTime ?? null,
        return_time: parsed.returnTime ?? null,
        location: parsed.location ?? null,
        earnings: parsed.earnings ?? null,
        source: "turo-email",
        reason,
      })
      .select("id, vehicle_id, start_date, end_date, pickup_time, return_time, location, earnings, source, reason")
      .maybeSingle();

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
