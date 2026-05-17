import test from "node:test";
import assert from "node:assert/strict";
import {
  getEffectiveReturnDate,
  isActiveBookingOverdue,
  nextWeeklyDueOnOrAfter,
  upsertRecurringBookingMeta,
} from "@/lib/utils/recurring-booking";

const RECURRING_NOTES = upsertRecurringBookingMeta("", {
  isRecurringLongTerm: true,
  weeklyDueDay: "Thursday",
});

test("finds next Thursday on or after a date", () => {
  assert.equal(nextWeeklyDueOnOrAfter("2026-05-14", "Thursday"), "2026-05-14");
  assert.equal(nextWeeklyDueOnOrAfter("2026-05-15", "Thursday"), "2026-05-21");
});

test("rolls return date forward for recurring LT past stored period", () => {
  assert.equal(
    getEffectiveReturnDate("2026-05-14", RECURRING_NOTES, "2026-05-16"),
    "2026-05-21"
  );
});

test("does not mark recurring LT active booking overdue before next due", () => {
  assert.equal(
    isActiveBookingOverdue("2026-05-14", RECURRING_NOTES, "active", "2026-05-16"),
    false
  );
});

test("marks standard active booking overdue after return date", () => {
  assert.equal(
    isActiveBookingOverdue("2026-05-14", null, "active", "2026-05-16"),
    true
  );
});

test("never marks recurring LT with weekly due day as return overdue", () => {
  assert.equal(
    isActiveBookingOverdue("2026-05-14", RECURRING_NOTES, "active", "2026-05-29"),
    false
  );
});
