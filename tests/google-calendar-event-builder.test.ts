import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingCalendarEvent,
  buildManualBlockCalendarEvent,
  buildTuroCalendarEvent,
  formatLocationAddress,
  resolveBookingLocation,
} from "../src/lib/integrations/google-calendar/event-builder";

test("resolveBookingLocation prefers pickup_location_name", () => {
  const loc = resolveBookingLocation(
    {
      id: "bk1",
      vehicle_id: "v1",
      customer_name: "Alex",
      customer_email: null,
      customer_phone: null,
      pickup_date: "2026-07-10",
      return_date: "2026-07-12",
      pickup_time: "10:00",
      return_time: "18:00",
      pickup_location_name: "Newark Liberty International Airport",
      return_location_name: null,
      pickup_location_id: null,
      status: "confirmed",
      total_price: 200,
    },
    new Map()
  );
  assert.equal(loc, "Newark Liberty International Airport");
});

test("resolveBookingLocation falls back to locations table address", () => {
  const locations = new Map([
    [
      "loc1",
      {
        id: "loc1",
        name: "Jersey City",
        address: "31 Nunda Avenue",
        city: "Jersey City",
        state: "NJ",
        zip: "07306",
      },
    ],
  ]);
  const loc = resolveBookingLocation(
    {
      id: "bk1",
      vehicle_id: "v1",
      customer_name: "Alex",
      customer_email: null,
      customer_phone: null,
      pickup_date: "2026-07-10",
      return_date: "2026-07-12",
      pickup_time: null,
      return_time: null,
      pickup_location_name: null,
      return_location_name: null,
      pickup_location_id: "loc1",
      status: "confirmed",
      total_price: 200,
    },
    locations
  );
  assert.equal(loc, "31 Nunda Avenue, Jersey City, NJ, 07306");
});

test("buildBookingCalendarEvent marks cancelled bookings for deletion", () => {
  const built = buildBookingCalendarEvent(
    {
      id: "bk1",
      vehicle_id: "v1",
      customer_name: "Alex",
      customer_email: "alex@example.com",
      customer_phone: null,
      pickup_date: "2026-07-10",
      return_date: "2026-07-12",
      pickup_time: "10:00",
      return_time: "18:00",
      pickup_location_name: "Hoboken, NJ",
      return_location_name: null,
      pickup_location_id: null,
      status: "cancelled",
      total_price: 200,
    },
    { id: "v1", year: 2024, make: "Jeep", model: "Grand Cherokee" },
    new Map(),
    "2026-07-06"
  );
  assert.equal(built.shouldDelete, true);
  assert.equal(built.location, "Hoboken, NJ");
  assert.match(built.start.dateTime || "", /2026-07-10T10:00:00/);
});

test("buildTuroCalendarEvent includes sanitized location and skips past trips", () => {
  const upcoming = buildTuroCalendarEvent(
    {
      id: "t1",
      vehicle_id: "v1",
      start_date: "2026-07-10",
      end_date: "2026-07-12",
      pickup_time: "18:30",
      return_time: "18:00",
      location: "31 Nunda Avenue, Jersey City, NJ",
      reason: "Turo: Henry — $253.95",
      source: "turo-email",
      cancelled_at: null,
    },
    { id: "v1", year: 2019, make: "Ram", model: "1500" },
    "2026-07-06"
  );
  assert.ok(upcoming);
  assert.equal(upcoming?.location, "31 Nunda Avenue, Jersey City, NJ");
  assert.match(upcoming?.summary || "", /Henry \(Turo\)/);

  const past = buildTuroCalendarEvent(
    {
      id: "t2",
      vehicle_id: "v1",
      start_date: "2026-06-01",
      end_date: "2026-06-03",
      pickup_time: null,
      return_time: null,
      location: "Airport",
      reason: "Turo: Mario",
      source: "turo-email",
      cancelled_at: null,
    },
    { id: "v1", year: 2019, make: "Ram", model: "1500" },
    "2026-07-06"
  );
  assert.equal(past, null);
});

test("buildManualBlockCalendarEvent uses timed event when times exist", () => {
  const built = buildManualBlockCalendarEvent(
    {
      id: "b1",
      vehicle_id: "v1",
      start_date: "2026-07-08",
      end_date: "2026-07-09",
      pickup_time: "09:00",
      return_time: "17:00",
      location: "Shop",
      reason: "Maintenance",
      source: "manual",
    },
    { id: "v1", year: 2020, make: "Audi", model: "A6" }
  );
  assert.ok(built);
  assert.match(built?.summary || "", /Blocked/);
  assert.match((built?.start as { dateTime?: string }).dateTime || "", /T09:00:00/);
});

test("formatLocationAddress joins address parts", () => {
  assert.equal(
    formatLocationAddress({
      id: "loc1",
      name: "HQ",
      address: "123 Main St",
      city: "Newark",
      state: "NJ",
      zip: "07102",
    }),
    "123 Main St, Newark, NJ, 07102"
  );
});
