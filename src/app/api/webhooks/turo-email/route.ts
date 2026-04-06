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

    if (parsed.vehicleDescription) {
      const desc = parsed.vehicleDescription.toLowerCase();

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

        // Model match
        if (model && desc.includes(model)) score += 4;
        // Partial model match (e.g. "Highlander" in "Toyota Highlander")
        if (model && model.length > 3) {
          const modelWords = model.split(/\s+/);
          for (const w of modelWords) {
            if (w.length > 2 && desc.includes(w.toLowerCase())) score += 2;
          }
        }

        // Year match
        if (year && desc.includes(year)) score += 2;

        if (score > matchScore) {
          matchScore = score;
          matchedVehicle = v;
        }
      }
    }

    const vehicleLabel = `${matchedVehicle.year} ${matchedVehicle.make} ${matchedVehicle.model}`;

    // ── Check for existing overlapping blocks ──
    const { data: existing } = await supabase
      .from("blocked_dates")
      .select("id, start_date, end_date")
      .eq("vehicle_id", matchedVehicle.id)
      .lte("start_date", parsed.endDate)
      .gte("end_date", parsed.startDate);

    if (existing && existing.length > 0) {
      logger.info("Turo webhook: dates already blocked", {
        vehicle: vehicleLabel,
        dates: `${parsed.startDate} → ${parsed.endDate}`,
        existingId: existing[0].id,
      });
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Dates already blocked for ${vehicleLabel} (${existing[0].start_date} to ${existing[0].end_date})`,
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
        source: "turo-email",
        reason,
      })
      .select("id, vehicle_id, start_date, end_date, source, reason")
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
