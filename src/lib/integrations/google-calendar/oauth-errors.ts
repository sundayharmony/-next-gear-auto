/** Google OAuth / token errors that require reconnecting the integration. */
export function isGoogleCalendarAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid_grant") ||
    lower.includes("invalid_client") ||
    lower.includes("token has been expired or revoked") ||
    lower.includes("token has been revoked")
  );
}

export const GCAL_RECONNECT_MESSAGE =
  "Google Calendar authorization expired. Disconnect and reconnect Google Calendar, then run Sync now.";
