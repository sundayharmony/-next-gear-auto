import { google } from "googleapis";
import { logger } from "@/lib/utils/logger";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`;

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function createOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials not configured");
  }
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

export function getAuthorizationUrl(state: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent",
  });
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to obtain tokens from Google");
  }
  
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expiry_date: number }> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }
  
  return {
    access_token: credentials.access_token,
    expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
  };
}

export function getAuthenticatedClient(accessToken: string, refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  
  oauth2Client.on("tokens", (tokens) => {
    if (tokens.access_token) {
      logger.info("Google OAuth tokens refreshed automatically");
    }
  });
  
  return oauth2Client;
}
