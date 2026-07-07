import { google } from "googleapis";

export type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export type GoogleCalendarSourceKind = "booking" | "turo" | "blocked";

export const GCAL_BUSINESS_TIMEZONE = "America/New_York";

/** Events CRUD + calendar list (callback/admin picker use calendarList.list). */
export const GCAL_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export type GoogleCalendarConnectionRow = {
  id: string;
  calendar_id: string;
  calendar_summary: string | null;
  refresh_token_enc: string;
  connected_by_admin_id: string | null;
  connected_at: string;
  last_sync_at: string | null;
  last_error: string | null;
  updated_at: string;
};

export type GoogleCalendarEventLinkRow = {
  id: string;
  source_kind: GoogleCalendarSourceKind;
  source_id: string;
  google_event_id: string;
  google_calendar_id: string;
  last_synced_at: string;
  sync_hash: string | null;
};

export type BuiltGoogleCalendarEvent = {
  sourceKind: GoogleCalendarSourceKind;
  sourceId: string;
  shouldDelete: boolean;
  syncHash: string;
  summary: string;
  description: string;
  location: string | null;
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
};

export type GoogleCalendarPublicStatus = {
  connected: boolean;
  calendarId: string | null;
  calendarSummary: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  primary?: boolean;
};
