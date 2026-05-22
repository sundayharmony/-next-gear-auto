import test from "node:test";
import assert from "node:assert/strict";
import {
  listRecurringWeeklyDueDates,
  parseRecurringWeekPaymentNote,
  recurringWeekPaymentNote,
  upsertRecurringBookingMeta,
} from "@/lib/utils/recurring-booking";

const RECURRING_NOTES = upsertRecurringBookingMeta("", {
  isRecurringLongTerm: true,
  weeklyDueDay: "Thursday",
});

test("recurringWeekPaymentNote uses stable period key", () => {
  assert.equal(recurringWeekPaymentNote("2026-05-14"), "recurring_week:2026-05-14");
  assert.equal(parseRecurringWeekPaymentNote("recurring_week:2026-05-14"), "2026-05-14");
  assert.equal(parseRecurringWeekPaymentNote("Recurring weekly payment (week 1)"), null);
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
