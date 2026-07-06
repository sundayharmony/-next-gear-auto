import { getServiceSupabase } from "@/lib/db/supabase";
import { getBusinessTodayYyyyMmDd } from "@/lib/utils/booking-dates";
import { isBlockedDateCancelled, TURO_BLOCKED_SOURCE } from "@/lib/utils/blocked-dates";
import { logger } from "@/lib/utils/logger";
import { calendarClientFromRefreshToken } from "./client";
import { decryptRefreshToken, encryptRefreshToken } from "./crypto";
import {
  buildBookingCalendarEvent,
  buildManualBlockCalendarEvent,
  buildTuroCalendarEvent,
  type BlockedDateCalendarInput,
  type BookingCalendarInput,
  type LocationLookup,
  type VehicleLookup,
  toGoogleEventBody,
} from "./event-builder";
import { revokeRefreshToken } from "./oauth";
import {
  type BuiltGoogleCalendarEvent,
  GCAL_BUSINESS_TIMEZONE,
  type GoogleCalendarConnectionRow,
  type GoogleCalendarEventLinkRow,
  type GoogleCalendarPublicStatus,
  type GoogleCalendarSourceKind,
} from "./types";

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "active", "completed"];

type ReconcileResult = {
  upserted: number;
  deleted: number;
  skipped: number;
  errors: string[];
};

function isMissingTableError(error: { message?: string } | null): boolean {
  const msg = error?.message || "";
  return /google_calendar_/i.test(msg) && /does not exist|relation/i.test(msg);
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY?.trim()
  );
}

export async function getGoogleCalendarConnection(): Promise<GoogleCalendarConnectionRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(error.message);
  }
  return (data as GoogleCalendarConnectionRow | null) ?? null;
}

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarPublicStatus> {
  const connection = await getGoogleCalendarConnection();
  if (!connection) {
    return {
      connected: false,
      calendarId: null,
      calendarSummary: null,
      connectedAt: null,
      lastSyncAt: null,
      lastError: null,
    };
  }
  return {
    connected: true,
    calendarId: connection.calendar_id,
    calendarSummary: connection.calendar_summary,
    connectedAt: connection.connected_at,
    lastSyncAt: connection.last_sync_at,
    lastError: connection.last_error,
  };
}

export async function saveGoogleCalendarConnection(opts: {
  calendarId: string;
  calendarSummary: string | null;
  refreshToken: string;
  adminId: string;
}) {
  const supabase = getServiceSupabase();
  const refresh_token_enc = encryptRefreshToken(opts.refreshToken);
  const existing = await getGoogleCalendarConnection();
  const payload = {
    calendar_id: opts.calendarId,
    calendar_summary: opts.calendarSummary,
    refresh_token_enc,
    connected_by_admin_id: opts.adminId,
    connected_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("google_calendar_connections")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("google_calendar_connections").insert(payload);
  if (error) throw new Error(error.message);
}

export async function updateGoogleCalendarSelection(calendarId: string, calendarSummary: string | null) {
  const connection = await getGoogleCalendarConnection();
  if (!connection) throw new Error("Google Calendar is not connected");
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("google_calendar_connections")
    .update({
      calendar_id: calendarId,
      calendar_summary: calendarSummary,
      updated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", connection.id);
  if (error) throw new Error(error.message);
}

export async function disconnectGoogleCalendar() {
  const connection = await getGoogleCalendarConnection();
  if (!connection) return;
  try {
    const refreshToken = decryptRefreshToken(connection.refresh_token_enc);
    await revokeRefreshToken(refreshToken);
  } catch (err) {
    logger.warn("Google Calendar revoke failed:", err);
  }
  const supabase = getServiceSupabase();
  await supabase.from("google_calendar_event_links").delete().eq("google_calendar_id", connection.calendar_id);
  const { error } = await supabase.from("google_calendar_connections").delete().eq("id", connection.id);
  if (error) throw new Error(error.message);
}

async function setConnectionSyncMeta(opts: { lastError?: string | null; touched?: boolean }) {
  const connection = await getGoogleCalendarConnection();
  if (!connection) return;
  const supabase = getServiceSupabase();
  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };
  if (opts.touched) updates.last_sync_at = new Date().toISOString();
  if (opts.lastError !== undefined) updates.last_error = opts.lastError;
  await supabase.from("google_calendar_connections").update(updates).eq("id", connection.id);
}

async function getEventLink(
  sourceKind: GoogleCalendarSourceKind,
  sourceId: string
): Promise<GoogleCalendarEventLinkRow | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("google_calendar_event_links")
    .select("*")
    .eq("source_kind", sourceKind)
    .eq("source_id", sourceId)
    .maybeSingle();
  return (data as GoogleCalendarEventLinkRow | null) ?? null;
}

async function upsertEventLink(opts: {
  sourceKind: GoogleCalendarSourceKind;
  sourceId: string;
  googleEventId: string;
  googleCalendarId: string;
  syncHash: string;
}) {
  const supabase = getServiceSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase.from("google_calendar_event_links").upsert(
    {
      source_kind: opts.sourceKind,
      source_id: opts.sourceId,
      google_event_id: opts.googleEventId,
      google_calendar_id: opts.googleCalendarId,
      sync_hash: opts.syncHash,
      last_synced_at: now,
      updated_at: now,
    },
    { onConflict: "source_kind,source_id" }
  );
  if (error) throw new Error(error.message);
}

async function deleteEventLink(sourceKind: GoogleCalendarSourceKind, sourceId: string) {
  const supabase = getServiceSupabase();
  await supabase
    .from("google_calendar_event_links")
    .delete()
    .eq("source_kind", sourceKind)
    .eq("source_id", sourceId);
}

export async function syncBuiltEvent(built: BuiltGoogleCalendarEvent | null): Promise<void> {
  if (!built) return;
  if (!isGoogleCalendarConfigured()) return;
  const connection = await getGoogleCalendarConnection();
  if (!connection) return;

  try {
    const refreshToken = decryptRefreshToken(connection.refresh_token_enc);
    const calendar = calendarClientFromRefreshToken(refreshToken);
    const existing = await getEventLink(built.sourceKind, built.sourceId);

    if (built.shouldDelete) {
      if (existing) {
        await calendar.events.delete({
          calendarId: connection.calendar_id,
          eventId: existing.google_event_id,
        });
        await deleteEventLink(built.sourceKind, built.sourceId);
      }
      await setConnectionSyncMeta({ touched: true, lastError: null });
      return;
    }

    if (existing?.sync_hash === built.syncHash) {
      return;
    }

    const body = toGoogleEventBody(built);
    if (existing) {
      await calendar.events.update({
        calendarId: connection.calendar_id,
        eventId: existing.google_event_id,
        requestBody: body,
      });
      await upsertEventLink({
        sourceKind: built.sourceKind,
        sourceId: built.sourceId,
        googleEventId: existing.google_event_id,
        googleCalendarId: connection.calendar_id,
        syncHash: built.syncHash,
      });
    } else {
      const created = await calendar.events.insert({
        calendarId: connection.calendar_id,
        requestBody: body,
      });
      const eventId = created.data.id;
      if (!eventId) throw new Error("Google Calendar did not return an event id");
      await upsertEventLink({
        sourceKind: built.sourceKind,
        sourceId: built.sourceId,
        googleEventId: eventId,
        googleCalendarId: connection.calendar_id,
        syncHash: built.syncHash,
      });
    }
    await setConnectionSyncMeta({ touched: true, lastError: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Google Calendar sync error", {
      message,
      sourceKind: built.sourceKind,
      sourceId: built.sourceId,
    });
    await setConnectionSyncMeta({ lastError: message });
  }
}

async function loadLocationsMap(): Promise<Map<string, LocationLookup>> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("locations")
    .select("id, name, address, city, state, zip");
  const map = new Map<string, LocationLookup>();
  for (const row of data || []) {
    map.set(String(row.id), row as LocationLookup);
  }
  return map;
}

async function loadVehiclesMap(): Promise<Map<string, VehicleLookup>> {
  const supabase = getServiceSupabase();
  const { data } = await supabase.from("vehicles").select("id, year, make, model");
  const map = new Map<string, VehicleLookup>();
  for (const row of data || []) {
    map.set(String(row.id), row as VehicleLookup);
  }
  return map;
}

export async function deleteCalendarEventBySource(
  sourceKind: GoogleCalendarSourceKind,
  sourceId: string
): Promise<void> {
  if (!isGoogleCalendarConfigured()) return;
  const connection = await getGoogleCalendarConnection();
  if (!connection) return;
  const existing = await getEventLink(sourceKind, sourceId);
  if (!existing) return;
  try {
    const refreshToken = decryptRefreshToken(connection.refresh_token_enc);
    const calendar = calendarClientFromRefreshToken(refreshToken);
    await calendar.events.delete({
      calendarId: connection.calendar_id,
      eventId: existing.google_event_id,
    });
    await deleteEventLink(sourceKind, sourceId);
    await setConnectionSyncMeta({ touched: true, lastError: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Google Calendar delete error", { message, sourceKind, sourceId });
    await setConnectionSyncMeta({ lastError: message });
  }
}

export async function syncBookingById(bookingId: string): Promise<void> {
  const supabase = getServiceSupabase();
  const { data } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!data) {
    await deleteCalendarEventBySource("booking", bookingId);
    return;
  }
  const [locationsById, vehiclesById] = await Promise.all([loadLocationsMap(), loadVehiclesMap()]);
  const built = buildBookingCalendarEvent(
    data as BookingCalendarInput,
    vehiclesById.get(String(data.vehicle_id)),
    locationsById
  );
  await syncBuiltEvent(built);
}

export async function syncBlockedDateById(blockedDateId: string): Promise<void> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("blocked_dates")
    .select("id, vehicle_id, start_date, end_date, pickup_time, return_time, location, reason, source, earnings, cancelled_at")
    .eq("id", blockedDateId)
    .maybeSingle();
  if (!data) {
    await deleteCalendarEventBySource("turo", blockedDateId);
    await deleteCalendarEventBySource("blocked", blockedDateId);
    return;
  }
  const vehiclesById = await loadVehiclesMap();
  const row = data as BlockedDateCalendarInput;
  const vehicle = vehiclesById.get(String(row.vehicle_id));
  if (row.source === TURO_BLOCKED_SOURCE) {
    await syncBuiltEvent(buildTuroCalendarEvent(row, vehicle));
    return;
  }
  await syncBuiltEvent(buildManualBlockCalendarEvent(row, vehicle));
}

export async function reconcileFleetCalendar(opts?: {
  pastDays?: number;
  futureDays?: number;
}): Promise<ReconcileResult> {
  const result: ReconcileResult = { upserted: 0, deleted: 0, skipped: 0, errors: [] };
  if (!isGoogleCalendarConfigured()) return result;
  const connection = await getGoogleCalendarConnection();
  if (!connection) return result;

  const pastDays = opts?.pastDays ?? 30;
  const futureDays = opts?.futureDays ?? 180;
  const today = getBusinessTodayYyyyMmDd(GCAL_BUSINESS_TIMEZONE);
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - pastDays);
  const end = new Date(`${today}T12:00:00`);
  end.setDate(end.getDate() + futureDays);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  const supabase = getServiceSupabase();
  const [bookingsRes, blockedRes, locationsById, vehiclesById] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .in("status", ACTIVE_BOOKING_STATUSES)
      .lte("pickup_date", to)
      .gte("return_date", from),
    supabase
      .from("blocked_dates")
      .select("id, vehicle_id, start_date, end_date, pickup_time, return_time, location, reason, source, earnings, cancelled_at")
      .lte("start_date", to)
      .gte("end_date", from),
    loadLocationsMap(),
    loadVehiclesMap(),
  ]);

  const desired = new Map<string, BuiltGoogleCalendarEvent>();
  for (const booking of bookingsRes.data || []) {
    const built = buildBookingCalendarEvent(
      booking as BookingCalendarInput,
      vehiclesById.get(String(booking.vehicle_id)),
      locationsById
    );
    desired.set(`booking:${booking.id}`, built);
  }

  for (const row of blockedRes.data || []) {
    const typed = row as BlockedDateCalendarInput;
    if (typed.source === TURO_BLOCKED_SOURCE) {
      if (isBlockedDateCancelled(typed)) {
        desired.set(`turo:${typed.id}`, {
          sourceKind: "turo",
          sourceId: typed.id,
          shouldDelete: true,
          syncHash: "cancelled",
          summary: "",
          description: "",
          location: null,
          start: { dateTime: "", timeZone: GCAL_BUSINESS_TIMEZONE },
          end: { dateTime: "", timeZone: GCAL_BUSINESS_TIMEZONE },
        });
        continue;
      }
      const built = buildTuroCalendarEvent(typed, vehiclesById.get(String(typed.vehicle_id)));
      if (built) desired.set(`turo:${typed.id}`, built);
      continue;
    }
    const built = buildManualBlockCalendarEvent(typed, vehiclesById.get(String(typed.vehicle_id)));
    if (built) desired.set(`blocked:${typed.id}`, built);
  }

  for (const built of desired.values()) {
    try {
      const before = await getEventLink(built.sourceKind, built.sourceId);
      await syncBuiltEvent(built);
      const after = await getEventLink(built.sourceKind, built.sourceId);
      if (built.shouldDelete) {
        if (before) result.deleted++;
        else result.skipped++;
      } else if (!before && after) {
        result.upserted++;
      } else if (before && before.sync_hash !== built.syncHash) {
        result.upserted++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const { data: links } = await supabase
    .from("google_calendar_event_links")
    .select("source_kind, source_id")
    .eq("google_calendar_id", connection.calendar_id);

  for (const link of links || []) {
    const key = `${link.source_kind}:${link.source_id}`;
    if (!desired.has(key)) {
      try {
        await deleteCalendarEventBySource(
          link.source_kind as GoogleCalendarSourceKind,
          link.source_id
        );
        result.deleted++;
      } catch (err) {
        result.errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  await setConnectionSyncMeta({
    touched: true,
    lastError: result.errors.length ? result.errors[0] : null,
  });
  return result;
}
