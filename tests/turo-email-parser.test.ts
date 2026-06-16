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

test("parseTuroEmail parses Gmail plain-text Trip start/end on one line", () => {
  const text = `
    Zhao has cancelled their trip with your Ram 1500
    Trip start: 7/6/26 10:00 AM Trip end: 7/8/26 10:00 AM Zhao Reservation ID #57917243
    Vehicle Ram 1500 2019
  `;
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.isCancellation, true);
  assert.equal(parsed.startDate, "2026-07-06");
  assert.equal(parsed.endDate, "2026-07-08");
  assert.equal(parsed.guestName, "Zhao");
  assert.equal(parsed.pickupTime, "10:00");
  assert.equal(parsed.returnTime, "10:00");
});

test("parseTuroEmail parses cancellation with M/D/YY dates from message thread", () => {
  const text =
    "Marcus has cancelled their trip with your Jeep Grand Cherokee Trip start: 6/11/26 7:00 PM Trip end: 6/14/26 9:00 PM Marcus Reservation ID #56788081 Vehicle: Jeep Grand Cherokee 2024";
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.isCancellation, true);
  assert.equal(parsed.startDate, "2026-06-11");
  assert.equal(parsed.endDate, "2026-06-14");
  assert.equal(parsed.guestName, "Marcus");
});

test("parseTuroEmail detects host cancellation (You've cancelled guest trip)", () => {
  const text =
    "You've cancelled Mario's trip with your Ram 1500 Trip start: 6/1/26 6:00 PM Trip end: 6/3/26 6:00 PM Mario Reservation ID #57830782 Vehicle: Ram 1500 2019";
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.isCancellation, true);
  assert.equal(parsed.startDate, "2026-06-01");
  assert.equal(parsed.endDate, "2026-06-03");
  assert.equal(parsed.guestName, "Mario");
});

test("parseTuroEmail prefers cancellation over extension wording", () => {
  const text =
    "Your trip has been cancelled. The checkout date was changed from April 5 to April 8, 2026.";
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.isCancellation, true);
  assert.equal(parsed.isExtension, false);
});

test("parseTuroEmail captures pickup and dropoff locations", () => {
  const text = `
    Pickup location: Newark Liberty International Airport
    Drop-off location: Hoboken, NJ
    Trip start: 7/6/26 10:00 AM
    Trip end: 7/8/26 10:00 AM
  `;
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.pickupLocation, "Newark Liberty International Airport");
  assert.equal(parsed.dropoffLocation, "Hoboken, NJ");
  assert.equal(parsed.location, "Newark Liberty International Airport -> Hoboken, NJ");
});
