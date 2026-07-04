import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, isGoogleOAuthConfigured } from "@/lib/google/oauth";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.redirect(`${SITE_URL}/account?error=google_not_configured`);
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      logger.warn("Google OAuth error:", error);
      return NextResponse.redirect(`${SITE_URL}/account?error=google_auth_denied`);
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${SITE_URL}/account?error=google_invalid_callback`);
    }

    let state: { customerId: string; timestamp: number };
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    } catch {
      return NextResponse.redirect(`${SITE_URL}/account?error=google_invalid_state`);
    }

    if (Date.now() - state.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(`${SITE_URL}/account?error=google_state_expired`);
    }

    const tokens = await exchangeCodeForTokens(code);

    const supabase = getServiceSupabase();
    
    const { error: upsertError } = await (supabase as any)
      .from("customer_google_tokens")
      .upsert({
        customer_id: state.customerId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "customer_id",
      });

    if (upsertError) {
      logger.error("Failed to store Google tokens:", upsertError);
      return NextResponse.redirect(`${SITE_URL}/account?error=google_storage_failed`);
    }

    logger.info(`Google Calendar connected for customer ${state.customerId}`);
    
    return NextResponse.redirect(`${SITE_URL}/account?google_connected=true`);
  } catch (error) {
    logger.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${SITE_URL}/account?error=google_auth_failed`);
  }
}
