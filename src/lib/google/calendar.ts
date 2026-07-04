import { google, calendar_v3 } from "googleapis";
import { getAuthenticatedClient, refreshAccessToken } from "./oauth";
import { logger } from "@/lib/utils/logger";
import { getServiceSupabase } from "@/lib/db/supabase";

interface GoogleTokenRow {
  customer_id: string;
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export interface CalendarEventData {
  summary: string;
  description: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  location?: string;
}

function formatDateTime(date: string, time?: string): string {
  if (!time) {
    return date;
  }
  return `${date}T${time}:00`;
}

async function getGoogleTokens(customerId: string): Promise<GoogleTokenRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await (supabase as any)
    .from("customer_google_tokens")
    .select("customer_id, access_token, refresh_token, expiry_date")
    .eq("customer_id", customerId)
    .single();
  
  if (error || !data) return null;
  return data as GoogleTokenRow;
}

async function updateGoogleTokens(customerId: string, accessToken: string, expiryDate: number): Promise<void> {
  const supabase = getServiceSupabase();
  await (supabase as any)
    .from("customer_google_tokens")
    .update({ access_token: accessToken, expiry_date: expiryDate })
    .eq("customer_id", customerId);
}

export async function createCalendarEvent(
  customerId: string,
  eventData: CalendarEventData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const tokenData = await getGoogleTokens(customerId);
    
    if (!tokenData) {
      logger.info(`No Google Calendar connected for customer ${customerId}`);
      return { success: false, error: "Google Calendar not connected" };
    }
    
    let { access_token, refresh_token, expiry_date } = tokenData;
    
    if (Date.now() >= expiry_date - 60000) {
      try {
        const refreshed = await refreshAccessToken(refresh_token);
        access_token = refreshed.access_token;
        expiry_date = refreshed.expiry_date;
        await updateGoogleTokens(customerId, access_token, expiry_date);
      } catch (refreshError) {
        logger.error("Failed to refresh Google token:", refreshError);
        return { success: false, error: "Failed to refresh Google authentication" };
      }
    }
    
    const auth = getAuthenticatedClient(access_token, refresh_token);
    const calendar = google.calendar({ version: "v3", auth });
    
    const hasStartTime = Boolean(eventData.startTime);
    const hasEndTime = Boolean(eventData.endTime);
    
    let event: calendar_v3.Schema$Event;
    
    if (hasStartTime && hasEndTime) {
      event = {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: formatDateTime(eventData.startDate, eventData.startTime),
          timeZone: "America/New_York",
        },
        end: {
          dateTime: formatDateTime(eventData.endDate, eventData.endTime),
          timeZone: "America/New_York",
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 60 },
          ],
        },
      };
    } else {
      event = {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: {
          date: eventData.startDate,
        },
        end: {
          date: addDays(eventData.endDate, 1),
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 60 },
          ],
        },
      };
    }
    
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });
    
    logger.info(`Created Google Calendar event ${response.data.id} for customer ${customerId}`);
    
    return { success: true, eventId: response.data.id || undefined };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to create Google Calendar event:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function deleteCalendarEvent(
  customerId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenData = await getGoogleTokens(customerId);
    
    if (!tokenData) {
      return { success: false, error: "Google Calendar not connected" };
    }
    
    let { access_token, refresh_token, expiry_date } = tokenData;
    
    if (Date.now() >= expiry_date - 60000) {
      const refreshed = await refreshAccessToken(refresh_token);
      access_token = refreshed.access_token;
      expiry_date = refreshed.expiry_date;
      await updateGoogleTokens(customerId, access_token, expiry_date);
    }
    
    const auth = getAuthenticatedClient(access_token, refresh_token);
    const calendar = google.calendar({ version: "v3", auth });
    
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
    
    logger.info(`Deleted Google Calendar event ${eventId} for customer ${customerId}`);
    
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to delete Google Calendar event:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function isGoogleCalendarConnected(customerId: string): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await (supabase as any)
      .from("customer_google_tokens")
      .select("customer_id")
      .eq("customer_id", customerId)
      .single();
    
    return !error && Boolean(data);
  } catch {
    return false;
  }
}

export async function disconnectGoogleCalendar(customerId: string): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();
    const { error } = await (supabase as any)
      .from("customer_google_tokens")
      .delete()
      .eq("customer_id", customerId);
    
    if (error) {
      logger.error("Failed to disconnect Google Calendar:", error);
      return false;
    }
    
    logger.info(`Disconnected Google Calendar for customer ${customerId}`);
    return true;
  } catch (error) {
    logger.error("Failed to disconnect Google Calendar:", error);
    return false;
  }
}
