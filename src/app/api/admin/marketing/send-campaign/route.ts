import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { stripRichHtmlToText } from "@/lib/utils/validation";
import { sanitizeCampaignHtml } from "@/lib/email/sanitize-campaign-html";
import { buildMarketingCampaignHtml, type MarketingVehicle } from "@/lib/email/marketing-templates";
import { sendMarketingCampaignBatch } from "@/lib/email/send-marketing-campaign";
import {
  dedupeEmails,
  fetchAllClientEmails,
  fetchEmailsByCustomerIds,
  mapSupabaseRecipientError,
} from "@/lib/email/resolve-marketing-recipients";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_RECIPIENTS = 300;
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 50_000;

type RecipientMode = "all" | "selected" | "import";

interface SendCampaignBody {
  subject?: string;
  bodyHtml?: string;
  vehicleIds?: string[];
  recipientMode?: RecipientMode;
  customerIds?: string[];
  importEmails?: string[];
}

function mapVehicleRow(row: {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  daily_rate: number | null;
  is_available: boolean | null;
  images: string[] | null;
  category: string | null;
}): MarketingVehicle {
  return {
    id: row.id,
    year: row.year ?? 2024,
    make: row.make ?? "",
    model: row.model ?? "",
    dailyRate: row.daily_rate ?? 0,
    isAvailable: row.is_available ?? false,
    images: row.images ?? [],
    category: row.category ?? undefined,
  };
}

async function fetchMarketingVehicles(
  supabase: ReturnType<typeof getServiceSupabase>,
  vehicleIds: string[],
): Promise<MarketingVehicle[]> {
  if (vehicleIds.length === 0) return [];

  const { data, error } = await supabase
    .from("vehicles")
    .select("id, year, make, model, daily_rate, is_available, images, category")
    .in("id", vehicleIds);

  if (error) throw error;

  const byId = new Map((data || []).map((row) => [row.id, mapVehicleRow(row)]));
  return vehicleIds.map((id) => byId.get(id)).filter((v): v is MarketingVehicle => Boolean(v));
}

function smtpConfigured(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return Boolean(process.env.SMTP_PASS?.trim());
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!smtpConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message: "Email sending is not configured (SMTP_PASS missing)",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as SendCampaignBody;
    const subject = body.subject?.trim() ?? "";
    const rawBodyHtml = body.bodyHtml ?? "";
    const recipientMode = body.recipientMode;
    const vehicleIds = Array.isArray(body.vehicleIds)
      ? body.vehicleIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    if (!subject) {
      return NextResponse.json({ success: false, message: "Subject is required" }, { status: 400 });
    }
    if (subject.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json(
        { success: false, message: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer` },
        { status: 400 },
      );
    }

    const plainBody = stripRichHtmlToText(rawBodyHtml).trim();
    if (!plainBody) {
      return NextResponse.json({ success: false, message: "Email body is required" }, { status: 400 });
    }
    if (rawBodyHtml.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ success: false, message: "Email body is too long" }, { status: 400 });
    }

    if (!recipientMode || !["all", "selected", "import"].includes(recipientMode)) {
      return NextResponse.json({ success: false, message: "Invalid recipient mode" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    let recipients: string[] = [];

    try {
      if (recipientMode === "all") {
        recipients = await fetchAllClientEmails(supabase);
      } else if (recipientMode === "selected") {
        const customerIds = Array.isArray(body.customerIds)
          ? body.customerIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
          : [];
        if (customerIds.length === 0) {
          return NextResponse.json(
            { success: false, message: "Select at least one customer" },
            { status: 400 },
          );
        }
        recipients = await fetchEmailsByCustomerIds(supabase, customerIds);
      } else {
        const importEmails = Array.isArray(body.importEmails)
          ? body.importEmails.filter((e): e is string => typeof e === "string")
          : [];
        recipients = dedupeEmails(importEmails);
      }
    } catch (recipientErr) {
      logger.error("Marketing campaign recipient resolution failed:", recipientErr);
      const mapped =
        recipientErr &&
        typeof recipientErr === "object" &&
        "code" in recipientErr
          ? mapSupabaseRecipientError(recipientErr as { code?: string; message?: string })
          : "Failed to load recipient emails";
      return NextResponse.json({ success: false, message: mapped }, { status: 500 });
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid recipient email addresses" },
        { status: 400 },
      );
    }

    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many recipients (${recipients.length}). Maximum per campaign is ${MAX_RECIPIENTS}.`,
        },
        { status: 400 },
      );
    }

    let vehicles: MarketingVehicle[];
    try {
      vehicles = await fetchMarketingVehicles(supabase, vehicleIds);
    } catch (vehicleErr) {
      logger.error("Marketing campaign vehicle fetch failed:", vehicleErr);
      return NextResponse.json(
        { success: false, message: "Failed to load selected vehicles" },
        { status: 500 },
      );
    }

    let sanitizedBody: string;
    try {
      sanitizedBody = sanitizeCampaignHtml(rawBodyHtml);
    } catch (sanitizeErr) {
      logger.error("Marketing campaign HTML sanitize failed:", sanitizeErr);
      return NextResponse.json(
        { success: false, message: "Failed to prepare email content" },
        { status: 500 },
      );
    }

    const html = buildMarketingCampaignHtml(sanitizedBody, vehicles);

    let sent = 0;
    let failed: { email: string; error: string }[] = [];
    try {
      const result = await sendMarketingCampaignBatch(recipients, subject, html);
      sent = result.sent;
      failed = result.failed;
    } catch (sendErr) {
      logger.error("Marketing campaign send failed:", sendErr);
      const message =
        sendErr instanceof Error ? sendErr.message : "Failed to send campaign emails";
      return NextResponse.json(
        {
          success: false,
          message: message.includes("SMTP")
            ? "Email server error — check SMTP configuration"
            : "Failed to send campaign emails",
        },
        { status: 500 },
      );
    }

    logger.info("Marketing campaign sent", {
      adminId: auth.adminId,
      recipientMode,
      attempted: recipients.length,
      sent,
      failed: failed.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        attempted: recipients.length,
        sent,
        failed,
      },
      message:
        failed.length === 0
          ? `Campaign sent to ${sent} recipient${sent === 1 ? "" : "s"}.`
          : `Sent ${sent} of ${recipients.length}. ${failed.length} failed.`,
    });
  } catch (err) {
    logger.error("Marketing send-campaign error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to send campaign" },
      { status: 500 },
    );
  }
}
