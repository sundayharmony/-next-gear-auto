import test from "node:test";
import assert from "node:assert/strict";
import {
  addCalendarDaysYyyyMmDd,
  extensionCalendarDays,
} from "@/lib/utils/booking-dates";
import { suggestDailyExtensionAmount } from "@/lib/bookings/extension-pricing";

test("addCalendarDaysYyyyMmDd shifts local calendar days", () => {
  assert.equal(addCalendarDaysYyyyMmDd("2026-04-01", 3), "2026-04-04");
  assert.equal(addCalendarDaysYyyyMmDd("2026-04-01", 0), "2026-04-01");
});

test("extensionCalendarDays counts added days without a same-day minimum", () => {
  assert.equal(extensionCalendarDays("2026-04-01", "2026-04-01"), 0);
  assert.equal(extensionCalendarDays("2026-04-01", "2026-04-02"), 1);
  assert.equal(extensionCalendarDays("2026-04-01", "2026-04-04"), 3);
});

test("suggestDailyExtensionAmount multiplies days by daily rate", () => {
  assert.equal(suggestDailyExtensionAmount(3, 120), 360);
  assert.equal(suggestDailyExtensionAmount(1, 99.99), 99.99);
  assert.equal(suggestDailyExtensionAmount(0, 120), 0);
  assert.equal(suggestDailyExtensionAmount(-2, 120), 0);
});
