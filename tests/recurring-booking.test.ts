import test from "node:test";
import assert from "node:assert/strict";
import {
  countRecurringWeeklyPaymentsDue,
  getEffectiveReturnDate,
  getRecurringBillingSummary,
  isActiveBookingOverdue,
  isRecurringPaymentOverdue,
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

test("counts weekly payments due from pickup through today", () => {
  assert.equal(
    countRecurringWeeklyPaymentsDue("2026-05-07", "Thursday", "2026-05-16"),
    2
  );
  assert.equal(
    countRecurringWeeklyPaymentsDue("2026-05-07", "Thursday", "2026-05-21"),
    3
  );
});

test("charges zero weeks before the first weekly due date", () => {
  assert.equal(
    countRecurringWeeklyPaymentsDue("2026-05-08", "Thursday", "2026-05-08"),
    0
  );
});

test("flags recurring payment overdue when balance due is positive", () => {
  assert.equal(
    isRecurringPaymentOverdue(
      {
        pickup_date: "2026-05-07",
        total_price: 325,
        deposit: 325,
        admin_notes: RECURRING_NOTES,
        status: "active",
      },
      "2026-05-16"
    ),
    true
  );
  assert.equal(
    isRecurringPaymentOverdue(
      {
        pickup_date: "2026-05-07",
        total_price: 325,
        deposit: 650,
        admin_notes: RECURRING_NOTES,
        status: "active",
      },
      "2026-05-16"
    ),
    false
  );
});

test("recurring billing summary multiplies weekly rate by weeks due", () => {
  const summary = getRecurringBillingSummary(
    {
      pickup_date: "2026-05-07",
      total_price: 325,
      deposit: 325,
      admin_notes: RECURRING_NOTES,
    },
    "2026-05-16"
  );
  assert.ok(summary);
  assert.equal(summary!.weeksDue, 2);
  assert.equal(summary!.contractTotalToDate, 650);
  assert.equal(summary!.balanceDue, 325);
});
