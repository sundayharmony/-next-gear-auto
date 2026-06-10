export interface BlockedDate {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  location: string | null;
  earnings: number | null;
  source: string;
  reason: string | null;
  is_extension: boolean | null;
  original_end_date: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface OverlapConflict {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface TuroSyncStatus {
  hasCancelledAt: boolean;
  total: number;
  active: number;
  cancelled: number;
}

export const TURO_RUNBOOK_URL =
  "https://github.com/sundayharmony/-next-gear-auto/blob/main/docs/turo-operations.md#operational-checklist";

export interface ParseResult {
  guestName: string | null;
  vehicleDescription: string | null;
  startDate: string | null;
  endDate: string | null;
  pickupTime: string | null;
  returnTime: string | null;
  location: string | null;
  earnings: number | null;
  isExtension: boolean;
  isCancellation: boolean;
  originalEndDate: string | null;
  confidence: "high" | "medium" | "low";
  rawMatches: string[];
}

export type BlockedDatesListTab = "all" | "manual" | "turo";

/** Format YYYY-MM-DD to human-readable "Apr 6, 2026" */
export function formatBlockedDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format YYYY-MM-DD to short "Apr 6" */
export function formatBlockedDateShort(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Format "HH:MM:SS" or "HH:MM" TIME value to "8:00 AM" display string */
export function formatBlockedTime(t: string | null): string {
  if (!t) return "";
  const parts = t.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

/** Strip seconds from "HH:MM:SS" for <input type="time"> which expects "HH:MM" */
export function toBlockedTimeInput(t: string | null): string {
  if (!t) return "";
  return t.substring(0, 5);
}
