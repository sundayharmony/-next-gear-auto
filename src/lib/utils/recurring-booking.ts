import {
  formatYyyyMmDdLocal,
  localMidnightFromYyyyMmDd,
} from "@/lib/utils/booking-dates";

const RECURRING_FLAG_KEY = "RECURRING_LONG_TERM";
const WEEKLY_DUE_DAY_KEY = "WEEKLY_DUE_DAY";
const META_LINE_REGEX = /^\[([A-Z_]+):(.*)\]$/;

export const WEEKLY_DUE_DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type WeeklyDueDay = (typeof WEEKLY_DUE_DAY_OPTIONS)[number];

const WEEKLY_DUE_JS_DAY: Record<WeeklyDueDay, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export interface RecurringBookingMeta {
  isRecurringLongTerm: boolean;
  weeklyDueDay?: WeeklyDueDay;
}

function normalizeWeeklyDueDay(value: string | undefined): WeeklyDueDay | undefined {
  if (!value) return undefined;
  const matched = WEEKLY_DUE_DAY_OPTIONS.find(
    (day) => day.toLowerCase() === value.trim().toLowerCase()
  );
  return matched;
}

export function parseRecurringBookingMeta(notes?: string | null): RecurringBookingMeta {
  if (!notes) return { isRecurringLongTerm: false };
  const lines = notes.split(/\r?\n/);
  const metadata = new Map<string, string>();

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(META_LINE_REGEX);
    if (!match) continue;
    metadata.set(match[1], match[2].trim());
  }

  const recurringRaw = metadata.get(RECURRING_FLAG_KEY);
  const isRecurringLongTerm = recurringRaw?.toLowerCase() === "true";
  const weeklyDueDay = normalizeWeeklyDueDay(metadata.get(WEEKLY_DUE_DAY_KEY));
  return { isRecurringLongTerm, weeklyDueDay };
}

export function stripRecurringBookingMeta(notes?: string | null): string {
  if (!notes) return "";
  const lines = notes.split(/\r?\n/);
  return lines
    .filter((line) => !line.trim().match(META_LINE_REGEX))
    .join("\n")
    .trim();
}

export function upsertRecurringBookingMeta(
  notes: string | null | undefined,
  meta: RecurringBookingMeta
): string {
  const lines = (notes || "").split(/\r?\n/);
  const nonMetaLines = lines.filter((line) => !line.trim().match(META_LINE_REGEX));
  const cleanedNotes = nonMetaLines.join("\n").trim();

  const metaLines: string[] = [];
  metaLines.push(`[${RECURRING_FLAG_KEY}:${meta.isRecurringLongTerm ? "true" : "false"}]`);
  if (meta.weeklyDueDay) {
    metaLines.push(`[${WEEKLY_DUE_DAY_KEY}:${meta.weeklyDueDay}]`);
  }

  if (!cleanedNotes) {
    return metaLines.join("\n");
  }
  return `${cleanedNotes}\n${metaLines.join("\n")}`;
}

function addCalendarDaysYyyyMmDd(iso: string, days: number): string {
  const d = localMidnightFromYyyyMmDd(iso);
  d.setDate(d.getDate() + days);
  return formatYyyyMmDdLocal(d);
}

/** First calendar date on or after `fromIso` that falls on `weeklyDueDay` (local calendar). */
export function nextWeeklyDueOnOrAfter(
  fromIso: string,
  weeklyDueDay: WeeklyDueDay
): string {
  const target = WEEKLY_DUE_JS_DAY[weeklyDueDay];
  const cursor = localMidnightFromYyyyMmDd(fromIso);
  for (let i = 0; i < 7; i++) {
    if (cursor.getDay() === target) return formatYyyyMmDdLocal(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  return formatYyyyMmDdLocal(cursor);
}

/**
 * For recurring long-term rentals, the stored `return_date` is the end of the current billing
 * period. After that day passes, the contract rolls forward to the next weekly due date.
 */
export function getEffectiveReturnDate(
  storedReturnDate: string,
  adminNotes?: string | null,
  todayYyyyMmDd: string = formatYyyyMmDdLocal(new Date())
): string {
  const meta = parseRecurringBookingMeta(adminNotes);
  if (!meta.isRecurringLongTerm || !meta.weeklyDueDay) {
    return storedReturnDate;
  }

  let effective = storedReturnDate;
  let guard = 0;
  while (effective < todayYyyyMmDd && guard < 520) {
    const next = nextWeeklyDueOnOrAfter(
      addCalendarDaysYyyyMmDd(effective, 1),
      meta.weeklyDueDay
    );
    if (next <= effective) break;
    effective = next;
    guard++;
  }
  return effective;
}

export function isActiveBookingOverdue(
  storedReturnDate: string,
  adminNotes: string | null | undefined,
  status: string,
  todayYyyyMmDd: string = formatYyyyMmDdLocal(new Date())
): boolean {
  if (status !== "active") return false;
  const meta = parseRecurringBookingMeta(adminNotes);
  if (meta.isRecurringLongTerm && meta.weeklyDueDay) {
    return false;
  }
  return storedReturnDate < todayYyyyMmDd;
}

/** Return date to show in admin lists (rolled forward for recurring LT). */
export function getDisplayReturnDate(
  storedReturnDate: string,
  adminNotes?: string | null,
  effectiveReturnDate?: string | null
): string {
  return effectiveReturnDate ?? getEffectiveReturnDate(storedReturnDate, adminNotes);
}

export function enrichBookingOverdueFields(
  booking: {
    return_date: string;
    status: string;
    admin_notes?: string | null;
  },
  todayYyyyMmDd: string
): { effective_return_date?: string; is_overdue: boolean } {
  const meta = parseRecurringBookingMeta(booking.admin_notes);
  const effectiveReturn = getEffectiveReturnDate(
    booking.return_date,
    booking.admin_notes,
    todayYyyyMmDd
  );
  return {
    ...(meta.isRecurringLongTerm ? { effective_return_date: effectiveReturn } : {}),
    is_overdue: isActiveBookingOverdue(
      booking.return_date,
      booking.admin_notes,
      booking.status,
      todayYyyyMmDd
    ),
  };
}
