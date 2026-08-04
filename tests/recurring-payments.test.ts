import test from "node:test";
import assert from "node:assert/strict";
import {
  getRecognizedRecurringPeriodEnds,
  listRecurringDailyDueDates,
  listRecurringWeeklyDueDates,
  isLegacyRecurringWeekPaymentNote,
  parseRecurringWeekPaymentNote,
  recurringDayPaymentNote,
  recurringPeriodPaymentNote,
  recurringWeekPaymentNote,
  upsertRecurringBookingMeta,
} from "@/lib/utils/recurring-booking";
import { isRecurringLongTermBooking } from "@/lib/bookings/recurring-payments";

const RECURRING_NOTES = upsertRecurringBookingMeta("", {
  isRecurringLongTerm: true,
  weeklyDueDay: "Thursday",
});

const DAILY_NOTES = upsertRecurringBookingMeta("", {
  isRecurringLongTerm: true,
  periodType: "daily",
});

test("recurringWeekPaymentNote uses stable period key", () => {
  assert.equal(recurringWeekPaymentNote("2026-05-14"), "recurring_week:2026-05-14");
  assert.equal(parseRecurringWeekPaymentNote("recurring_week:2026-05-14"), "2026-05-14");
  assert.equal(parseRecurringWeekPaymentNote("Recurring weekly payment (week 1)"), null);
});

test("recurringDayPaymentNote uses stable daily period key", () => {
  assert.equal(recurringDayPaymentNote("2026-05-14"), "recurring_day:2026-05-14");
  assert.equal(parseRecurringWeekPaymentNote("recurring_day:2026-05-14"), "2026-05-14");
  assert.equal(recurringPeriodPaymentNote("2026-05-14", "daily"), "recurring_day:2026-05-14");
  assert.equal(recurringPeriodPaymentNote("2026-05-14", "weekly"), "recurring_week:2026-05-14");
});

test("listRecurringWeeklyDueDates matches count through today", () => {
  const dates = listRecurringWeeklyDueDates("2026-05-07", "Thursday", "2026-05-16");
  assert.deepEqual(dates, ["2026-05-07", "2026-05-14"]);
});

test("listRecurringWeeklyDueDates aligns with billing weeks due", () => {
  const dates = listRecurringWeeklyDueDates("2026-05-07", "Thursday", "2026-05-21");
  assert.equal(dates.length, 3);
  assert.equal(dates[0], "2026-05-07");
  assert.equal(dates[2], "2026-05-21");
});

test("isLegacyRecurringWeekPaymentNote detects old sync format", () => {
  assert.equal(isLegacyRecurringWeekPaymentNote("Recurring weekly payment (week 2)"), true);
  assert.equal(isLegacyRecurringWeekPaymentNote("recurring_week:2026-05-14"), false);
});

test("getRecognizedRecurringPeriodEnds maps legacy notes to due dates in order", () => {
  const dueDates = listRecurringWeeklyDueDates("2026-05-07", "Thursday", "2026-05-16");
  const paid = getRecognizedRecurringPeriodEnds(
    [
      { note: "Recurring weekly payment (week 1)", amount: 325 },
      { note: "Recurring weekly payment (week 2)", amount: 325 },
    ],
    dueDates,
    325
  );
  assert.equal(paid.size, 2);
  assert.equal(paid.has("2026-05-07"), true);
  assert.equal(paid.has("2026-05-14"), true);
});

test("getRecognizedRecurringPeriodEnds prefers explicit week keys over legacy", () => {
  const dueDates = listRecurringWeeklyDueDates("2026-05-07", "Thursday", "2026-05-16");
  const paid = getRecognizedRecurringPeriodEnds(
    [
      { note: recurringWeekPaymentNote("2026-05-07"), amount: 325 },
      { note: "Recurring weekly payment (week 1)", amount: 325 },
    ],
    dueDates,
    325
  );
  assert.equal(paid.size, 1);
  assert.equal(paid.has("2026-05-07"), true);
  assert.equal(paid.has("2026-05-14"), false);
});

test("getRecognizedRecurringPeriodEnds recognizes daily payment notes", () => {
  const dueDates = listRecurringDailyDueDates("2026-05-07", "2026-05-09");
  const paid = getRecognizedRecurringPeriodEnds(
    [
      { note: recurringDayPaymentNote("2026-05-07"), amount: 85 },
      { note: recurringDayPaymentNote("2026-05-08"), amount: 85 },
    ],
    dueDates,
    85
  );
  assert.equal(paid.size, 2);
  assert.equal(paid.has("2026-05-09"), false);
});

test("isRecurringLongTermBooking accepts daily without weekly due day", () => {
  assert.equal(isRecurringLongTermBooking(DAILY_NOTES), true);
  assert.equal(isRecurringLongTermBooking(RECURRING_NOTES), true);
  assert.equal(isRecurringLongTermBooking("[RECURRING_LONG_TERM:true]"), false);
});
