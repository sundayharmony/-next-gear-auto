import test from "node:test";
import assert from "node:assert/strict";
import { parseTuroEmail } from "../src/lib/utils/turo-email-parser";

test("parseTuroEmail detects cancellation emails", () => {
  const text = `
    Hi Host,
    Bob's trip with your 2020 Toyota Camry has been cancelled.
    is booked from Thursday, April 9, 2026, 8:00 AM to Friday, April 10, 2026, 10:00 AM
  `;
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.isCancellation, true);
  assert.equal(parsed.isExtension, false);
  assert.equal(parsed.startDate, "2026-04-09");
  assert.equal(parsed.endDate, "2026-04-10");
});

test("parseTuroEmail prefers cancellation over extension wording", () => {
  const text =
    "Your trip has been cancelled. The checkout date was changed from April 5 to April 8, 2026.";
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.isCancellation, true);
  assert.equal(parsed.isExtension, false);
});
