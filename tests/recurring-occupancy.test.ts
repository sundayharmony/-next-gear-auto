import test from "node:test";
import assert from "node:assert/strict";
import {
  getBookingOccupancyEndDate,
  upsertRecurringBookingMeta,
} from "@/lib/utils/recurring-booking";
import {
  bookingConflictsWithAny,
  filterOccupyingBookings,
  toBookingInterval,
  toOccupancyInterval,
} from "@/lib/utils/booking-overlap";

const RECURRING_NOTES = upsertRecurringBookingMeta("", {
  isRecurringLongTerm: true,
  weeklyDueDay: "Thursday",
});

test("active recurring uses rolled due when today is before next weekly due", () => {
  assert.equal(
    getBookingOccupancyEndDate(
      {
        pickup_date: "2026-05-07",
        return_date: "2026-05-14",
        admin_notes: RECURRING_NOTES,
        status: "active",
      },
      "2026-05-20"
    ),
    "2026-05-21"
  );
});

test("active recurring rolls forward to next weekly due on or after today", () => {
  assert.equal(
    getBookingOccupancyEndDate(
      {
        pickup_date: "2026-05-07",
        return_date: "2026-05-14",
        admin_notes: RECURRING_NOTES,
        status: "active",
      },
      "2026-05-22"
    ),
    "2026-05-28"
  );
});

test("confirmed recurring uses rolled due date not today", () => {
  assert.equal(
    getBookingOccupancyEndDate(
      {
        pickup_date: "2026-05-07",
        return_date: "2026-05-14",
        admin_notes: RECURRING_NOTES,
        status: "confirmed",
      },
      "2026-05-20"
    ),
    "2026-05-21"
  );
});

test("filterOccupyingBookings includes recurring active despite stale return_date", () => {
  const rows = [
    {
      pickup_date: "2026-05-07",
      return_date: "2026-05-14",
      pickup_time: "10:00",
      return_time: "12:00",
      admin_notes: RECURRING_NOTES,
      status: "active",
    },
  ];
  const filtered = filterOccupyingBookings(rows, "2026-05-15", "2026-05-18", "2026-05-20");
  assert.equal(filtered.length, 1);
});

test("proposed booking conflicts with active recurring LT occupancy", () => {
  const row = {
    pickup_date: "2026-05-07",
    return_date: "2026-05-14",
    pickup_time: "10:00",
    return_time: "12:00",
    admin_notes: RECURRING_NOTES,
    status: "active",
  };
  const proposed = toBookingInterval("2026-05-15", "2026-05-17", "10:00", "12:00");
  assert.equal(
    bookingConflictsWithAny(proposed, [row], 60, "2026-05-20"),
    true
  );
});

test("toOccupancyInterval uses rolled end for active recurring", () => {
  const interval = toOccupancyInterval(
    {
      pickup_date: "2026-05-07",
      return_date: "2026-05-14",
      pickup_time: "10:00",
      return_time: "23:59",
      admin_notes: RECURRING_NOTES,
      status: "active",
    },
    "2026-05-20"
  );
  const endKey = `${interval.end.getFullYear()}-${String(interval.end.getMonth() + 1).padStart(2, "0")}-${String(interval.end.getDate()).padStart(2, "0")}`;
  assert.equal(endKey, "2026-05-21");
});
