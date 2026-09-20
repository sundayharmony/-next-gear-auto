import { google, type calendar_v3 } from "googleapis";
import { sourceDescriptionMarker } from "./event-builder";
import { oauthClientWithRefreshToken } from "./oauth";
import type { GoogleCalendarSourceKind, GoogleOAuth2Client } from "./types";

export function getCalendarApi(auth: GoogleOAuth2Client) {
  return google.calendar({ version: "v3", auth });
}

export async function listWritableCalendars(auth: GoogleOAuth2Client) {
  const calendar = getCalendarApi(auth);
  const res = await calendar.calendarList.list({ minAccessRole: "writer" });
  return (res.data.items || []).map((item) => ({
    id: item.id || "",
    summary: item.summary || item.id || "Calendar",
    primary: Boolean(item.primary),
  })).filter((item) => item.id);
}

export async function getPrimaryCalendarId(auth: GoogleOAuth2Client): Promise<string | null> {
  const calendars = await listWritableCalendars(auth);
  return calendars.find((c) => c.primary)?.id || calendars[0]?.id || null;
}

export function calendarClientFromRefreshToken(refreshToken: string) {
  const auth = oauthClientWithRefreshToken(refreshToken);
  return getCalendarApi(auth);
}

function collectEventIds(
  items: calendar_v3.Schema$Event[] | null | undefined,
  seen: Set<string>,
  ids: string[],
  descriptionMarker?: string
) {
  for (const item of items || []) {
    if (!item.id || seen.has(item.id)) continue;
    if (descriptionMarker) {
      const desc = item.description || "";
      if (!desc.includes(descriptionMarker)) continue;
    }
    seen.add(item.id);
    ids.push(item.id);
  }
}

/**
 * Find Google Calendar events for a fleet item, including orphans left after reconnect.
 * Matches extendedProperties first, then description markers for legacy events.
 */
export async function findCalendarEventsBySource(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  sourceKind: GoogleCalendarSourceKind,
  sourceId: string
): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();
  const marker = sourceDescriptionMarker(sourceKind, sourceId);

  try {
    const byProps = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [`nga_source_kind=${sourceKind}`, `nga_source_id=${sourceId}`],
      singleEvents: true,
      maxResults: 50,
    });
    collectEventIds(byProps.data.items, seen, ids);
  } catch {
    // Fall through to description search.
  }

  const byText = await calendar.events.list({
    calendarId,
    q: marker,
    singleEvents: true,
    maxResults: 50,
  });
  collectEventIds(byText.data.items, seen, ids, marker);

  return ids;
}
