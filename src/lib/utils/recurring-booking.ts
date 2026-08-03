import {
  addCalendarDaysYyyyMmDd,
  formatYyyyMmDdLocal,
  getBusinessTodayYyyyMmDd,
  localMidnightFromYyyyMmDd,
} from "@/lib/utils/booking-dates";

const RECURRING_FLAG_KEY = "RECURRING_LONG_TERM";
const WEEKLY_DUE_DAY_KEY = "WEEKLY_DUE_DAY";
const PERIOD_TYPE_KEY = "PERIOD_TYPE";
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
export type RecurringPeriodType = "weekly" | "daily";

export const RECURRING_PERIOD_TYPE_OPTIONS: RecurringPeriodType[] = ["weekly", "daily"];

const WEEKLY_DUE_JS_DAY: Record<WeeklyDueDay, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** Max roll iterations: ~10y weekly or ~10y daily. */
const MAX_PERIOD_ROLLS = 4000;

export interface RecurringBookingMeta {
  isRecurringLongTerm: boolean;
  /** Defaults to weekly when omitted (legacy notes). */
  periodType?: RecurringPeriodType;
  weeklyDueDay?: WeeklyDueDay;
}

function normalizeWeeklyDueDay(value: string | undefined): WeeklyDueDay | undefined {
  if (!value) return undefined;
  const matched = WEEKLY_DUE_DAY_OPTIONS.find(
    (day) => day.toLowerCase() === value.trim().toLowerCase()
  );
  return matched;
}

function normalizePeriodType(value: string | undefined): RecurringPeriodType | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "daily") return "daily";
  if (normalized === "weekly") return "weekly";
  return undefined;
}

/** Effective period type for a recurring booking (legacy notes without PERIOD_TYPE ⇒ weekly). */
export function getRecurringPeriodType(meta: RecurringBookingMeta): RecurringPeriodType {
  if (meta.periodType === "daily") return "daily";
  return "weekly";
}

/** True when recurring LT is fully configured for billing/roll. */
export function isRecurringConfigured(meta: RecurringBookingMeta): boolean {
  if (!meta.isRecurringLongTerm) return false;
  if (getRecurringPeriodType(meta) === "daily") return true;
  return Boolean(meta.weeklyDueDay);
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
  const periodType = normalizePeriodType(metadata.get(PERIOD_TYPE_KEY));
  return { isRecurringLongTerm, weeklyDueDay, periodType };
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
  if (meta.isRecurringLongTerm) {
    const periodType = getRecurringPeriodType(meta);
    metaLines.push(`[${PERIOD_TYPE_KEY}:${periodType}]`);
    if (periodType === "weekly" && meta.weeklyDueDay) {
      metaLines.push(`[${WEEKLY_DUE_DAY_KEY}:${meta.weeklyDueDay}]`);
    }
  }

  if (!cleanedNotes) {
    return metaLines.join("\n");
  }
  return `${cleanedNotes}\n${metaLines.join("\n")}`;
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

/** Next period end after `fromIso` for the given recurring configuration. */
export function nextRecurringPeriodEndOnOrAfter(
  fromIso: string,
  meta: RecurringBookingMeta
): string | null {
  if (!isRecurringConfigured(meta)) return null;
  if (getRecurringPeriodType(meta) === "daily") {
    return fromIso.split("T")[0];
  }
  if (!meta.weeklyDueDay) return null;
  return nextWeeklyDueOnOrAfter(fromIso, meta.weeklyDueDay);
}

/**
 * For recurring long-term rentals, the stored `return_date` is the end of the current billing
 * period. After that day passes, the contract rolls forward to the next period end.
 */
export function getEffectiveReturnDate(
  storedReturnDate: string,
  adminNotes?: string | null,
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): string {
  const meta = parseRecurringBookingMeta(adminNotes);
  if (!isRecurringConfigured(meta)) {
    return storedReturnDate;
  }

  let effective = storedReturnDate.split("T")[0];
  let guard = 0;
  while (effective < todayYyyyMmDd && guard < MAX_PERIOD_ROLLS) {
    const next =
      getRecurringPeriodType(meta) === "daily"
        ? addCalendarDaysYyyyMmDd(effective, 1)
        : nextWeeklyDueOnOrAfter(addCalendarDaysYyyyMmDd(effective, 1), meta.weeklyDueDay!);
    if (next <= effective) break;
    effective = next;
    guard++;
  }
  return effective;
}

/** True when recurring contract balance due through today is unpaid. */
export function isRecurringPaymentOverdue(
  booking: {
    pickup_date: string;
    total_price?: number | null;
    deposit?: number | null;
    admin_notes?: string | null;
    status?: string;
  },
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): boolean {
  const occupyStatuses = ["active", "confirmed"];
  if (booking.status && !occupyStatuses.includes(booking.status)) {
    return false;
  }
  const billing = getRecurringBillingSummary(
    { ...booking, total_price: booking.total_price ?? null },
    todayYyyyMmDd
  );
  if (!billing) return false;
  return billing.balanceDue > 0;
}

export function isActiveBookingOverdue(
  storedReturnDate: string,
  adminNotes: string | null | undefined,
  status: string,
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): boolean {
  if (status !== "active") return false;
  const meta = parseRecurringBookingMeta(adminNotes);
  if (isRecurringConfigured(meta)) {
    return false;
  }
  return storedReturnDate < todayYyyyMmDd;
}

export function getBookingDisplayTotal(
  booking: {
    total_price?: number | null;
    effective_total_price?: number | null;
  }
): number {
  if (
    typeof booking.effective_total_price === "number" &&
    booking.effective_total_price > 0
  ) {
    return booking.effective_total_price;
  }
  return Math.max(0, Number(booking.total_price) || 0);
}

export function getBookingBalanceDue(
  booking: {
    total_price?: number | null;
    deposit?: number | null;
    effective_total_price?: number | null;
    admin_notes?: string | null;
    pickup_date?: string;
  }
): number {
  const billing =
    booking.pickup_date != null
      ? getRecurringBillingSummary({
          pickup_date: booking.pickup_date,
          total_price: booking.total_price,
          deposit: booking.deposit,
          admin_notes: booking.admin_notes,
        })
      : null;
  if (billing) return billing.balanceDue;
  const total = getBookingDisplayTotal(booking);
  return Math.max(0, total - (Number(booking.deposit) || 0));
}

/** Stored return_date to persist when the rolled billing period has moved forward. */
export function getStagedRecurringReturnDate(
  storedReturnDate: string,
  adminNotes?: string | null,
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): string | null {
  const meta = parseRecurringBookingMeta(adminNotes);
  if (!isRecurringConfigured(meta)) return null;

  const storedKey = storedReturnDate.split("T")[0];
  const effective = getEffectiveReturnDate(storedKey, adminNotes, todayYyyyMmDd);
  return effective > storedKey ? effective : null;
}

/**
 * Next period end after the current stored return_date.
 * Works on/before/after the due day (unlike getStagedRecurringReturnDate).
 */
export function getNextRecurringPeriodEnd(
  storedReturnDate: string,
  adminNotes?: string | null,
): string | null {
  const meta = parseRecurringBookingMeta(adminNotes);
  if (!isRecurringConfigured(meta)) return null;

  const storedKey = storedReturnDate.split("T")[0];
  const next =
    getRecurringPeriodType(meta) === "daily"
      ? addCalendarDaysYyyyMmDd(storedKey, 1)
      : nextWeeklyDueOnOrAfter(addCalendarDaysYyyyMmDd(storedKey, 1), meta.weeklyDueDay!);
  return next > storedKey ? next : null;
}

export function isWeeklyDueOnDate(
  weeklyDueDay: WeeklyDueDay,
  dateIso: string
): boolean {
  return nextWeeklyDueOnOrAfter(dateIso, weeklyDueDay) === dateIso.split("T")[0];
}

/** True when a recurring payment reminder should fire for `dateIso`. */
export function isRecurringPaymentDueOnDate(
  meta: RecurringBookingMeta,
  dateIso: string
): boolean {
  if (!isRecurringConfigured(meta)) return false;
  if (getRecurringPeriodType(meta) === "daily") return true;
  return Boolean(meta.weeklyDueDay && isWeeklyDueOnDate(meta.weeklyDueDay, dateIso));
}

export function getBookingOccupancyEndDate(
  booking: {
    pickup_date: string;
    return_date: string;
    admin_notes?: string | null;
    status?: string;
  },
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): string {
  const pickupKey = (booking.pickup_date || "").split("T")[0];
  const storedReturnKey = (booking.return_date || "").split("T")[0];
  const meta = parseRecurringBookingMeta(booking.admin_notes);

  if (!isRecurringConfigured(meta)) {
    return storedReturnKey;
  }

  let endKey = getEffectiveReturnDate(
    storedReturnKey,
    booking.admin_notes,
    todayYyyyMmDd
  ).split("T")[0];

  if (booking.status === "active" && todayYyyyMmDd > pickupKey && todayYyyyMmDd > endKey) {
    endKey = todayYyyyMmDd;
  }

  return endKey;
}

/** True when rental span overlaps [rangeStart, rangeEnd] (inclusive, YYYY-MM-DD). */
export function bookingIntersectsRange(
  booking: {
    pickup_date: string;
    return_date: string;
    admin_notes?: string | null;
    status?: string;
  },
  rangeStart: string,
  rangeEnd: string,
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): boolean {
  const pickupKey = (booking.pickup_date || "").split("T")[0];
  const endKey = getBookingOccupancyEndDate(booking, todayYyyyMmDd);
  const startKey = rangeStart.split("T")[0];
  const endRangeKey = rangeEnd.split("T")[0];
  return pickupKey <= endRangeKey && endKey >= startKey;
}

/** Active/upcoming for manager lists: occupancy extends through today or later. */
export function bookingIsCurrentlyOccupying(
  booking: {
    pickup_date: string;
    return_date: string;
    admin_notes?: string | null;
    status?: string;
  },
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): boolean {
  return bookingIntersectsRange(booking, todayYyyyMmDd, "9999-12-31", todayYyyyMmDd);
}

/** Return date to show in admin lists (rolled forward for recurring LT). */
export function getDisplayReturnDate(
  storedReturnDate: string,
  adminNotes?: string | null,
  effectiveReturnDate?: string | null
): string {
  return effectiveReturnDate ?? getEffectiveReturnDate(storedReturnDate, adminNotes);
}

export interface RecurringBillingSummary {
  periodType: RecurringPeriodType;
  /** Period rate (daily or weekly). Kept as weeklyRate for back-compat callers. */
  weeklyRate: number;
  /** Periods due (days or weeks). Kept as weeksDue for back-compat callers. */
  weeksDue: number;
  contractTotalToDate: number;
  amountReceived: number;
  balanceDue: number;
}

export const RECURRING_WEEK_NOTE_PREFIX = "recurring_week:";
export const RECURRING_DAY_NOTE_PREFIX = "recurring_day:";

export function recurringWeekPaymentNote(periodEndIso: string): string {
  return `${RECURRING_WEEK_NOTE_PREFIX}${periodEndIso}`;
}

export function recurringDayPaymentNote(periodEndIso: string): string {
  return `${RECURRING_DAY_NOTE_PREFIX}${periodEndIso}`;
}

export function recurringPeriodPaymentNote(
  periodEndIso: string,
  periodType: RecurringPeriodType
): string {
  return periodType === "daily"
    ? recurringDayPaymentNote(periodEndIso)
    : recurringWeekPaymentNote(periodEndIso);
}

export function parseRecurringWeekPaymentNote(
  note: string | null | undefined
): string | null {
  if (!note) return null;
  if (note.startsWith(RECURRING_WEEK_NOTE_PREFIX)) {
    const key = note.slice(RECURRING_WEEK_NOTE_PREFIX.length).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
  }
  if (note.startsWith(RECURRING_DAY_NOTE_PREFIX)) {
    const key = note.slice(RECURRING_DAY_NOTE_PREFIX.length).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
  }
  return null;
}

const LEGACY_RECURRING_WEEK_NOTE_RE = /^recurring weekly payment \(week (\d+)\)$/i;

export function isLegacyRecurringWeekPaymentNote(note: string | null | undefined): boolean {
  if (!note) return false;
  return LEGACY_RECURRING_WEEK_NOTE_RE.test(note.trim());
}

export function parseLegacyRecurringWeekNumber(
  note: string | null | undefined
): number | null {
  if (!note) return null;
  const match = note.trim().match(LEGACY_RECURRING_WEEK_NOTE_RE);
  if (!match) return null;
  const week = Number(match[1]);
  return Number.isFinite(week) && week > 0 ? week : null;
}

/** Map each due period end to at most one payment (new note key, then legacy week notes in order). */
export function getRecognizedRecurringPeriodEnds(
  payments: Array<{ note?: string | null; amount?: number | null }>,
  dueDates: string[],
  weeklyRate: number
): Set<string> {
  const paid = new Set<string>();
  const legacyPool: Array<{ note?: string | null; amount?: number | null }> = [];

  for (const p of payments) {
    const key = parseRecurringWeekPaymentNote(p.note);
    if (key) {
      paid.add(key);
      continue;
    }
    if (isLegacyRecurringWeekPaymentNote(p.note)) {
      legacyPool.push(p);
    }
  }

  for (const legacy of legacyPool) {
    const weekNum = parseLegacyRecurringWeekNumber(legacy.note);
    if (!weekNum) continue;
    const due = dueDates[weekNum - 1];
    if (!due || paid.has(due)) continue;
    const amount = Number(legacy.amount);
    if (!Number.isFinite(amount) || Math.abs(amount - weeklyRate) >= 0.02) {
      continue;
    }
    paid.add(due);
  }

  return paid;
}

/** Daily due dates from pickup through throughDate (inclusive). */
export function listRecurringDailyDueDates(
  pickupDate: string,
  throughDate: string
): string[] {
  const dates: string[] = [];
  let due = pickupDate.split("T")[0];
  const end = throughDate.split("T")[0];
  let guard = 0;
  while (due <= end && guard < MAX_PERIOD_ROLLS) {
    dates.push(due);
    due = addCalendarDaysYyyyMmDd(due, 1);
    guard++;
  }
  return dates;
}

/** Weekly due dates from pickup through throughDate (inclusive). */
export function listRecurringWeeklyDueDates(
  pickupDate: string,
  weeklyDueDay: WeeklyDueDay,
  throughDate: string
): string[] {
  const dates: string[] = [];
  let due = nextWeeklyDueOnOrAfter(pickupDate, weeklyDueDay);
  let guard = 0;
  while (due <= throughDate && guard < MAX_PERIOD_ROLLS) {
    dates.push(due);
    due = nextWeeklyDueOnOrAfter(addCalendarDaysYyyyMmDd(due, 1), weeklyDueDay);
    guard++;
  }
  return dates;
}

export function listRecurringDueDates(
  pickupDate: string,
  meta: RecurringBookingMeta,
  throughDate: string
): string[] {
  if (!isRecurringConfigured(meta)) return [];
  if (getRecurringPeriodType(meta) === "daily") {
    return listRecurringDailyDueDates(pickupDate, throughDate);
  }
  return listRecurringWeeklyDueDates(pickupDate, meta.weeklyDueDay!, throughDate);
}

export function countRecurringWeeklyPaymentsDue(
  pickupDate: string,
  weeklyDueDay: WeeklyDueDay,
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): number {
  return listRecurringWeeklyDueDates(pickupDate, weeklyDueDay, todayYyyyMmDd).length;
}

export function countRecurringPaymentsDue(
  pickupDate: string,
  meta: RecurringBookingMeta,
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): number {
  return listRecurringDueDates(pickupDate, meta, todayYyyyMmDd).length;
}

export function getRecurringBillingSummary(
  booking: {
    pickup_date: string;
    total_price: number | null | undefined;
    deposit?: number | null;
    admin_notes?: string | null;
  },
  todayYyyyMmDd: string = getBusinessTodayYyyyMmDd()
): RecurringBillingSummary | null {
  const meta = parseRecurringBookingMeta(booking.admin_notes);
  if (!isRecurringConfigured(meta)) return null;

  const periodType = getRecurringPeriodType(meta);
  const weeklyRate = Math.max(0, Number(booking.total_price) || 0);
  const weeksDue = countRecurringPaymentsDue(booking.pickup_date, meta, todayYyyyMmDd);
  const contractTotalToDate = Math.round(weeklyRate * weeksDue * 100) / 100;
  const amountReceived = Math.max(0, Number(booking.deposit) || 0);
  const balanceDue = Math.max(0, Math.round((contractTotalToDate - amountReceived) * 100) / 100);

  return {
    periodType,
    weeklyRate,
    weeksDue,
    contractTotalToDate,
    amountReceived,
    balanceDue,
  };
}

export function enrichBookingOverdueFields(
  booking: {
    pickup_date?: string;
    return_date: string;
    status: string;
    total_price?: number | null;
    deposit?: number | null;
    admin_notes?: string | null;
  },
  todayYyyyMmDd: string
): {
  effective_return_date?: string;
  effective_total_price?: number;
  recurring_weeks_due?: number;
  recurring_weekly_rate?: number;
  recurring_balance_due?: number;
  is_overdue: boolean;
  is_payment_overdue: boolean;
} {
  const meta = parseRecurringBookingMeta(booking.admin_notes);
  const effectiveReturn = getEffectiveReturnDate(
    booking.return_date,
    booking.admin_notes,
    todayYyyyMmDd
  );

  const billing =
    isRecurringConfigured(meta) && booking.pickup_date
      ? getRecurringBillingSummary(
          {
            pickup_date: booking.pickup_date,
            total_price: booking.total_price,
            deposit: booking.deposit,
            admin_notes: booking.admin_notes,
          },
          todayYyyyMmDd
        )
      : null;

  return {
    ...(isRecurringConfigured(meta) ? { effective_return_date: effectiveReturn } : {}),
    ...(billing
      ? {
          effective_total_price: billing.contractTotalToDate,
          recurring_weeks_due: billing.weeksDue,
          recurring_weekly_rate: billing.weeklyRate,
          recurring_balance_due: billing.balanceDue,
        }
      : {}),
    is_overdue: isActiveBookingOverdue(
      booking.return_date,
      booking.admin_notes,
      booking.status,
      todayYyyyMmDd
    ),
    is_payment_overdue: booking.pickup_date
      ? isRecurringPaymentOverdue(
          {
            pickup_date: booking.pickup_date,
            total_price: booking.total_price,
            deposit: booking.deposit,
            admin_notes: booking.admin_notes,
            status: booking.status,
          },
          todayYyyyMmDd
        )
      : false,
  };
}
