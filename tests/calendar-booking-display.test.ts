import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingActiveOnDateKey,
  filterTimelineVehicles,
  getCalendarReturnDateKey,
} from "@/app/admin/calendar/calendar-booking-display";
import { upsertRecurringBookingMeta } from "@/lib/utils/recurring-booking";

const RECURRING_NOTES = upsertRecurringBookingMeta("", {
  isRecurringLongTerm: true,
  weeklyDueDay: "Thursday",
});

test("filterTimelineVehicles hides unavailable fleet rows", () => {
  const rows = filterTimelineVehicles([
    { isAvailable: true },
    { isAvailable: false },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].isAvailable, true);
});

test("recurring active booking uses rolled return date on calendar", () => {
  const end = getCalendarReturnDateKey({
    pickup_date: "2026-05-07",
    return_date: "2026-05-14",
    admin_notes: RECURRING_NOTES,
    status: "active",
  });
  assert.equal(end >= "2026-05-21", true);
});

test("recurring booking fills days through rolled return", () => {
  const booking = {
    pickup_date: "2026-05-07",
    return_date: "2026-05-14",
    admin_notes: RECURRING_NOTES,
    status: "active",
  };
  assert.equal(bookingActiveOnDateKey(booking, "2026-05-16"), true);
  assert.equal(bookingActiveOnDateKey(booking, "2026-05-06"), false);
});
