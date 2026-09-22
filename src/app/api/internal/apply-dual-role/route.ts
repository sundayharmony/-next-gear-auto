import { NextResponse } from "next/server";
import { asDualRoleDb, ensureNamedDualRole } from "@/lib/admin/ensure-named-dual-role";
import { getServiceSupabase } from "@/lib/db/supabase";
import { createRateLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";

const limiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 8, prefix: "apply-dual-role" });

/**
 * One-shot production grant. Uses the service role already configured on the
 * server so the account update runs against the app database.
 * Remove this route after the grant is confirmed.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = await limiter.check(`apply-dual-role:${ip}`);
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  try {
    const result = await ensureNamedDualRole(asDualRoleDb(getServiceSupabase()));
    logger.info("Named dual-role grant finished", {
      ok: result.ok,
      found: result.found,
      updated: result.updated,
      needsOwnerPortalColumn: result.needsOwnerPortalColumn,
    });
    return NextResponse.json(result, {
      status: result.ok ? 200 : result.found ? 409 : 404,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logger.error("Named dual-role grant failed", error);
    return NextResponse.json(
      { ok: false, message: "Grant failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
