import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

type ReplayEmail = { subject?: string; emailText: string; emailHtml?: string };

/**
 * POST /api/admin/blocked-dates/replay-locations
 * Re-send booking emails as reconcile_refresh to fill missing pickup locations.
 * Body: { emails: [{ subject?, emailText }] }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const secret = process.env.TURO_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, message: "TURO_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const emails: ReplayEmail[] = Array.isArray(body.emails)
      ? body.emails
          .map((item: Record<string, unknown>) => ({
            subject: typeof item.subject === "string" ? item.subject : undefined,
            emailText: String(item.emailText || "").trim(),
            emailHtml:
              typeof item.emailHtml === "string"
                ? item.emailHtml
                : typeof item.email_html === "string"
                  ? item.email_html
                  : undefined,
          }))
          .filter((item: ReplayEmail) => item.emailText.length >= 20)
      : [];

    if (!emails.length) {
      return NextResponse.json(
        { success: false, message: "emails array with emailText (min 20 chars) is required" },
        { status: 400 }
      );
    }

    const origin = new URL(req.url).origin;
    const webhookUrl = `${origin}/api/webhooks/turo-email`;
    const results: Array<{
      ok: boolean;
      status: number;
      action?: string;
      message?: string;
      location?: string | null;
    }> = [];

    for (let i = 0; i < emails.length; i++) {
      const { emailText, subject, emailHtml } = emails[i];
      const ts = Date.now();
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
          "x-idempotency-key": `admin-replay-loc-${ts}-${i}`,
          "x-webhook-timestamp": String(ts),
        },
        body: JSON.stringify({
          emailText,
          emailHtml,
          subject,
          eventType: "reconcile_refresh",
          sourceMode: "location_backfill",
        }),
      });

      let payload: Record<string, unknown> = {};
      try {
        payload = (await res.json()) as Record<string, unknown>;
      } catch {
        payload = { message: await res.text() };
      }

      const parsed = payload.parsed as { location?: string | null } | undefined;
      const data = payload.data as { location?: string | null } | undefined;
      results.push({
        ok: res.ok,
        status: res.status,
        action: typeof payload.action === "string" ? payload.action : undefined,
        message: typeof payload.message === "string" ? payload.message : undefined,
        location: data?.location ?? parsed?.location ?? null,
      });
    }

    const applied = results.filter((r) => r.ok && r.action === "reconcile_metadata").length;
    return NextResponse.json({
      success: true,
      data: { processed: results.length, locationsUpdated: applied, results },
    });
  } catch (err) {
    logger.error("replay-locations error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to replay location emails" },
      { status: 500 }
    );
  }
}
