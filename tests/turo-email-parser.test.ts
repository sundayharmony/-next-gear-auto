import test from "node:test";
import assert from "node:assert/strict";
import { parseTuroEmail, sanitizeLocation, buildTuroParseText } from "../src/lib/utils/turo-email-parser";

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

test("parseTuroEmail parses Tej Tesla booking confirmation email", () => {
  const subject = "Tej's trip with your Tesla Model 3 is booked!";
  const body = `
    ${subject}
    Tej's trip with your Tesla Model 3 at Newark Liberty International Airport is booked from Wednesday, June 17, 2026, 11:00 AM to Friday, June 19, 2026, 5:30 PM.
    You'll earn $145.56.
  `;
  const parsed = parseTuroEmail(body);
  assert.equal(parsed.isCancellation, false);
  assert.equal(parsed.isExtension, false);
  assert.equal(parsed.guestName, "Tej");
  assert.equal(parsed.vehicleDescription, "Tesla Model 3");
  assert.equal(parsed.pickupLocation, "Newark Liberty International Airport");
  assert.equal(parsed.location, "Newark Liberty International Airport");
  assert.equal(parsed.startDate, "2026-06-17");
  assert.equal(parsed.endDate, "2026-06-19");
  assert.equal(parsed.pickupTime, "11:00");
  assert.equal(parsed.returnTime, "17:30");
  assert.equal(parsed.earnings, 145.56);
  assert.equal(parsed.confidence, "high");
});

test("parseTuroEmail parses booking with location before from (no is booked)", () => {
  const text =
    "Tej's trip with your Tesla Model 3 at Newark Liberty International Airport from Wednesday, June 17, 2026, 11:00 AM to Friday, June 19, 2026, 5:30 PM. You'll earn $145.56.";
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.guestName, "Tej");
  assert.equal(parsed.pickupLocation, "Newark Liberty International Airport");
  assert.equal(parsed.startDate, "2026-06-17");
  assert.equal(parsed.endDate, "2026-06-19");
  assert.equal(parsed.pickupTime, "11:00");
  assert.equal(parsed.returnTime, "17:30");
  assert.equal(parsed.earnings, 145.56);
});

test("parseTuroEmail parses booking with location after date range", () => {
  const text =
    "Tej's trip with your Tesla Model 3 is booked from Wednesday, June 17, 2026, 11:00 AM to Friday, June 19, 2026, 5:30 PM at Newark Liberty International Airport. You'll earn $145.56.";
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.pickupLocation, "Newark Liberty International Airport");
  assert.equal(parsed.pickupTime, "11:00");
  assert.equal(parsed.returnTime, "17:30");
});

test("parseTuroEmail parses Tej booking from HTML email body", () => {
  const html = `<p>Tej's trip with your <strong>Tesla Model 3</strong> at Newark Liberty International Airport is booked from Wednesday, June 17, 2026, 11:00 AM to Friday, June 19, 2026, 5:30 PM.</p><p>You'll earn $145.56.</p>`;
  const parsed = parseTuroEmail(html);
  assert.equal(parsed.guestName, "Tej");
  assert.equal(parsed.pickupLocation, "Newark Liberty International Airport");
  assert.equal(parsed.startDate, "2026-06-17");
  assert.equal(parsed.endDate, "2026-06-19");
  assert.equal(parsed.pickupTime, "11:00");
  assert.equal(parsed.returnTime, "17:30");
  assert.equal(parsed.earnings, 145.56);
});

test("parseTuroEmail parses Runzhuo booked-by Gmail plain-text without garbage location", () => {
  const text =
    "Need delivery service by chance? Reply https://turo.com/trip/abc123 Jeep Grand Cherokee 2024 booked by Runzhuo Trip start: 6/26/26 5:00 PM Trip end: 6/28/26 5:00 PM You earn: $118.30 Mileage included: 600 miles";
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.isCancellation, false);
  assert.equal(parsed.guestName, "Runzhuo");
  assert.equal(parsed.vehicleDescription, "Jeep Grand Cherokee 2024");
  assert.equal(parsed.startDate, "2026-06-26");
  assert.equal(parsed.endDate, "2026-06-28");
  assert.equal(parsed.pickupTime, "17:00");
  assert.equal(parsed.returnTime, "17:00");
  assert.equal(parsed.earnings, 118.3);
  assert.equal(parsed.pickupLocation, null);
  assert.equal(parsed.location, null);
});

test("parseTuroEmail extracts delivery header location when present", () => {
  const text = `
    Delivery Newark, NJ Newark Liberty International Airport
    Guests Special requests
    Trip start: 6/26/26 5:00 PM Trip end: 6/28/26 5:00 PM
    Jeep Grand Cherokee 2024 booked by Runzhuo
  `;
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.pickupLocation, "Newark, NJ Newark Liberty International Airport");
  assert.equal(parsed.location, "Newark, NJ Newark Liberty International Airport");
});

test("sanitizeLocation rejects email boilerplate and keeps real addresses", () => {
  assert.equal(
    sanitizeLocation(
      "service by chance? Reply https://turo.com/trip Jeep Grand Cherokee booked by Runzhuo Trip start: 6/26/26"
    ),
    null
  );
  assert.equal(sanitizeLocation("Newark Liberty International Airport"), "Newark Liberty International Airport");
  assert.equal(sanitizeLocation("123 Main St, Hoboken, NJ"), "123 Main St, Hoboken, NJ");
  assert.equal(sanitizeLocation("Hoboken, NJ"), "Hoboken, NJ");
  assert.equal(sanitizeLocation("Terminal B Parking Garage, EWR"), "Terminal B Parking Garage, EWR");
});

test("parseTuroEmail reads pickup location from subject when body is booked-by only", () => {
  const subject = "Tej's trip with your Tesla Model 3 at Newark Liberty International Airport is booked!";
  const body =
    "Jeep Grand Cherokee 2024 booked by Tej Trip start: 6/17/26 11:00 AM Trip end: 6/19/26 5:30 PM You earn: $145.56";
  const parsed = parseTuroEmail(body, subject);
  assert.equal(parsed.pickupLocation, "Newark Liberty International Airport");
  assert.equal(parsed.guestName, "Tej");
});

test("parseTuroEmail parses Pick-up location hyphenated label", () => {
  const text = `
    Pick-up location: 123 Observer Highway, Hoboken, NJ 07030
    Trip start: 7/6/26 10:00 AM
    Trip end: 7/8/26 10:00 AM
  `;
  const parsed = parseTuroEmail(text);
  assert.equal(parsed.pickupLocation, "123 Observer Highway, Hoboken, NJ 07030");
});

test("buildTuroParseText prepends subject without duplicating body", () => {
  const subject = "Tej's trip with your Tesla Model 3 at Newark Airport is booked!";
  const body = subject + "\nTrip start: 6/17/26 11:00 AM Trip end: 6/19/26 5:30 PM";
  assert.equal(buildTuroParseText(body, subject), body);
  assert.ok(buildTuroParseText("Trip start: 6/17/26", subject).startsWith(subject));
});
