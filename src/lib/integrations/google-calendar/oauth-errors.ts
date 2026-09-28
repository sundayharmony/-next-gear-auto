import { oauthClientWithRefreshToken } from "./oauth";

/** Google OAuth / token errors that require reconnecting the integration. */
export function isGoogleCalendarAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid_grant") ||
    lower.includes("invalid_client") ||
    lower.includes("invalid_token") ||
    lower.includes("unauthorized_client") ||
    lower.includes("token has been expired or revoked") ||
    lower.includes("token has been revoked")
  );
}

export function googleCalendarErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { error?: string; error_description?: string } } })
      .response?.data;
    const parts = [data?.error, data?.error_description].filter(Boolean);
    if (parts.length) return parts.join(": ");
  }
  return String(err);
}

export function isGoogleCalendarAuthErrorFromUnknown(err: unknown): boolean {
  return isGoogleCalendarAuthError(googleCalendarErrorMessage(err));
}

export const GCAL_RECONNECT_MESSAGE =
  "Google Calendar authorization expired. In Google Cloud Console set OAuth consent screen to In production (Testing refresh tokens expire in about 7 days). Revoke this app at myaccount.google.com/permissions, then click Reconnect Google Calendar.";

export async function refreshGoogleCalendarAccessToken(
  refreshToken: string
): Promise<{ ok: true } | { ok: false; needsReauth: boolean; error: string }> {
  try {
    const client = oauthClientWithRefreshToken(refreshToken);
    const token = await client.getAccessToken();
    if (!token.token) {
      return { ok: false, needsReauth: true, error: "Google did not return an access token" };
    }
    return { ok: true };
  } catch (err) {
    const error = googleCalendarErrorMessage(err);
    return {
      ok: false,
      needsReauth: isGoogleCalendarAuthErrorFromUnknown(err),
      error,
    };
  }
}
