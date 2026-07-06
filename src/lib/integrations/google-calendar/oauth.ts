import { google } from "googleapis";
import { GCAL_SCOPES, type GoogleOAuth2Client } from "./types";

export function getGoogleCalendarOAuthConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth is not configured");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${siteUrl}/api/admin/integrations/google-calendar/callback`,
  };
}

export function createOAuthClient(): GoogleOAuth2Client {
  const { clientId, clientSecret, redirectUri } = getGoogleCalendarOAuthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildGoogleAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GCAL_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeAuthCode(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token; revoke app access and reconnect");
  }
  return tokens;
}

export function oauthClientWithRefreshToken(refreshToken: string): GoogleOAuth2Client {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const client = oauthClientWithRefreshToken(refreshToken);
  try {
    await client.revokeToken(refreshToken);
  } catch {
    // Best effort — token may already be invalid.
  }
}
