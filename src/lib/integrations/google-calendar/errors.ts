export const GOOGLE_CALENDAR_RECONNECT_MESSAGE =
  "Google Calendar access expired or was revoked. Disconnect, then connect again.";

export const GOOGLE_CALENDAR_ENCRYPTION_MESSAGE =
  "Could not read the stored Google token. Confirm GOOGLE_CALENDAR_ENCRYPTION_KEY has not changed, then disconnect and connect again.";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Pull Google OAuth `error` / `error_description` off a googleapis/Gaxios error. */
export function extractGoogleOAuthError(err: unknown): {
  code: string | null;
  description: string | null;
} {
  const root = asRecord(err);
  const response = asRecord(root?.response);
  const data = asRecord(response?.data);
  const nestedError = asRecord(data?.error);

  const code =
    readString(data?.error) ||
    readString(nestedError?.code) ||
    readString(nestedError?.status) ||
    readString(root?.code) ||
    null;

  const description =
    readString(data?.error_description) ||
    readString(nestedError?.message) ||
    readString(root?.message) ||
    (err instanceof Error ? err.message : null);

  return { code: code?.toLowerCase() ?? null, description };
}

export function isReconnectRequiredMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("invalid_grant") ||
    m.includes("token has been expired or revoked") ||
    m.includes("expired or was revoked") ||
    m.includes("invalid encrypted refresh token") ||
    m.includes("unable to authenticate data") ||
    m.includes("google_calendar_encryption_key")
  );
}

export function isReconnectRequiredError(err: unknown): boolean {
  const { code, description } = extractGoogleOAuthError(err);
  if (code === "invalid_grant") return true;
  return isReconnectRequiredMessage(description);
}

export function formatGoogleCalendarError(err: unknown): string {
  if (typeof err === "string" && err.trim()) {
    return displayGoogleCalendarError(err) || err.trim();
  }

  const { code, description } = extractGoogleOAuthError(err);
  const combined = `${code || ""} ${description || ""}`.toLowerCase();

  if (code === "invalid_grant" || combined.includes("invalid_grant")) {
    return GOOGLE_CALENDAR_RECONNECT_MESSAGE;
  }
  if (code === "invalid_client" || combined.includes("invalid_client")) {
    return "Google OAuth client secret does not match (invalid_client). Update GOOGLE_CALENDAR_CLIENT_SECRET in Vercel, then reconnect.";
  }
  if (combined.includes("google_calendar_encryption_key") || combined.includes("unable to authenticate data")) {
    return GOOGLE_CALENDAR_ENCRYPTION_MESSAGE;
  }
  if (combined.includes("invalid encrypted refresh token")) {
    return GOOGLE_CALENDAR_ENCRYPTION_MESSAGE;
  }

  if (err instanceof Error && err.message.trim()) {
    return displayGoogleCalendarError(err.message) || err.message;
  }
  return description || "Google Calendar request failed";
}

/** Map a stored `last_error` (raw `invalid_grant` or already-friendly text) for the admin UI. */
export function displayGoogleCalendarError(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  if (isReconnectRequiredMessage(raw)) {
    if (raw.toLowerCase().includes("encryption") || raw.toLowerCase().includes("authenticate data")) {
      return GOOGLE_CALENDAR_ENCRYPTION_MESSAGE;
    }
    return GOOGLE_CALENDAR_RECONNECT_MESSAGE;
  }
  return raw.trim();
}
