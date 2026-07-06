import { google } from "googleapis";
import type { GoogleOAuth2Client } from "./types";
import { oauthClientWithRefreshToken } from "./oauth";

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
