import test from "node:test";
import assert from "node:assert/strict";
import {
  countRecurringPaymentsDue,
  countRecurringWeeklyPaymentsDue,
  getEffectiveReturnDate,
  getNextRecurringPeriodEnd,
  getRecurringBillingSummary,
  getRecurringPeriodType,
  getStagedRecurringReturnDate,
  isActiveBookingOverdue,
  isRecurringConfigured,
  isRecurringPaymentDueOnDate,
  isRecurringPaymentOverdue,
  listRecurringDailyDueDates,
  nextWeeklyDueOnOrAfter,
  parseRecurringBookingMeta,
  upsertRecurringBookingMeta,
} from "@/lib/utils/recurring-booking";

const RECURRING_NOTES = upsertRecurringBookingMeta("", {
  isRecurringLongTerm: true,
  weeklyDueDay: "Thursday",
});

const DAILY_NOTES = upsertRecurringBookingMeta("", {
  isRecurringLongTerm: true,
  periodType: "daily",
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
  assert.equal(summary!.periodType, "weekly");
  assert.equal(summary!.weeksDue, 2);
  assert.equal(summary!.contractTotalToDate, 650);
  assert.equal(summary!.balanceDue, 325);
});

test("next recurring period end works on or before the due day", () => {
  // Stored period ends Thursday 2026-05-14; next week is 2026-05-21 even before that day passes.
  assert.equal(
    getNextRecurringPeriodEnd("2026-05-14", RECURRING_NOTES),
    "2026-05-21"
  );
  assert.equal(
    getStagedRecurringReturnDate("2026-05-14", RECURRING_NOTES, "2026-05-14"),
    null
  );
});

test("staged recurring return still only appears after the period has passed", () => {
  assert.equal(
    getStagedRecurringReturnDate("2026-05-14", RECURRING_NOTES, "2026-05-16"),
    "2026-05-21"
  );
});

test("daily recurring meta does not require a weekly due day", () => {
  const meta = parseRecurringBookingMeta(DAILY_NOTES);
  assert.equal(meta.isRecurringLongTerm, true);
  assert.equal(getRecurringPeriodType(meta), "daily");
  assert.equal(isRecurringConfigured(meta), true);
  assert.match(DAILY_NOTES, /\[PERIOD_TYPE:daily\]/);
  assert.doesNotMatch(DAILY_NOTES, /WEEKLY_DUE_DAY/);
});

test("legacy recurring notes without PERIOD_TYPE default to weekly", () => {
  const legacy = "[RECURRING_LONG_TERM:true]\n[WEEKLY_DUE_DAY:Monday]";
  const meta = parseRecurringBookingMeta(legacy);
  assert.equal(getRecurringPeriodType(meta), "weekly");
  assert.equal(isRecurringConfigured(meta), true);
});

test("listRecurringDailyDueDates includes every day from pickup through today", () => {
  assert.deepEqual(listRecurringDailyDueDates("2026-05-07", "2026-05-09"), [
    "2026-05-07",
    "2026-05-08",
    "2026-05-09",
  ]);
  assert.equal(
    countRecurringPaymentsDue(
      "2026-05-07",
      parseRecurringBookingMeta(DAILY_NOTES),
      "2026-05-09"
    ),
    3
  );
});

test("daily billing summary multiplies daily rate by days due", () => {
  const summary = getRecurringBillingSummary(
    {
      pickup_date: "2026-05-07",
      total_price: 85,
      deposit: 85,
      admin_notes: DAILY_NOTES,
    },
    "2026-05-09"
  );
  assert.ok(summary);
  assert.equal(summary!.periodType, "daily");
  assert.equal(summary!.weeksDue, 3);
  assert.equal(summary!.contractTotalToDate, 255);
  assert.equal(summary!.balanceDue, 170);
});

test("daily period rolls one calendar day at a time", () => {
  assert.equal(getEffectiveReturnDate("2026-05-07", DAILY_NOTES, "2026-05-10"), "2026-05-10");
  assert.equal(getNextRecurringPeriodEnd("2026-05-07", DAILY_NOTES), "2026-05-08");
  assert.equal(getStagedRecurringReturnDate("2026-05-07", DAILY_NOTES, "2026-05-07"), null);
  assert.equal(getStagedRecurringReturnDate("2026-05-07", DAILY_NOTES, "2026-05-08"), "2026-05-08");
});

test("daily recurring is payment-due every day once configured", () => {
  const meta = parseRecurringBookingMeta(DAILY_NOTES);
  assert.equal(isRecurringPaymentDueOnDate(meta, "2026-05-07"), true);
  assert.equal(isRecurringPaymentDueOnDate(meta, "2026-05-08"), true);
  assert.equal(
    isRecurringPaymentDueOnDate(parseRecurringBookingMeta(RECURRING_NOTES), "2026-05-07"),
    true
  );
  assert.equal(
    isRecurringPaymentDueOnDate(parseRecurringBookingMeta(RECURRING_NOTES), "2026-05-08"),
    false
  );
});
