import test from "node:test";
import assert from "node:assert/strict";
import {
  pickTuroCancellationMatch,
  pickTuroTripForMetadataRefresh,
  reasonMatchesTuroGuest,
} from "../src/lib/utils/turo-cancellation-match";

test("reasonMatchesTuroGuest matches standard Turo reason lines", () => {
  assert.equal(reasonMatchesTuroGuest("Turo: Mario — $100.70", "Mario"), true);
  assert.equal(reasonMatchesTuroGuest("Turo: Brent — $94.50", "Brent"), true);
  assert.equal(reasonMatchesTuroGuest("Turo: Mario", "Brent"), false);
  assert.equal(reasonMatchesTuroGuest("Turo: your Ram — $93.8", "your Ram"), true);
  assert.equal(reasonMatchesTuroGuest("Turo: Dominik", "Dominik"), true);
});

test("pickTuroCancellationMatch matches $0 guest-only reason on exact dates", () => {
  const picked = pickTuroCancellationMatch(
    [
      {
        id: "jeep-dominik",
        start_date: "2026-06-18",
        end_date: "2026-06-21",
        reason: "Turo: Dominik",
      },
    ],
    "2026-06-18",
    "2026-06-21",
    "Dominik"
  );
  assert.equal(picked?.id, "jeep-dominik");
});

test("pickTuroCancellationMatch prefers exact date match", () => {
  const picked = pickTuroCancellationMatch(
    [
      { id: "a", start_date: "2026-06-01", end_date: "2026-06-03", reason: "Turo: Mario" },
      { id: "b", start_date: "2026-06-02", end_date: "2026-06-04", reason: "Turo: Brent — $94.50" },
    ],
    "2026-06-02",
    "2026-06-04",
    "Brent"
  );
  assert.equal(picked?.reason, "Turo: Brent — $94.50");
});

test("pickTuroCancellationMatch refuses overlapping wrong guest (Brent vs Mario)", () => {
  const picked = pickTuroCancellationMatch(
    [{ id: "c", start_date: "2026-06-01", end_date: "2026-06-03", reason: "Turo: Mario" }],
    "2026-06-02",
    "2026-06-04",
    "Brent"
  );
  assert.equal(picked, null);
});

test("pickTuroCancellationMatch matches guest when only overlapping row exists", () => {
  const picked = pickTuroCancellationMatch(
    [{ id: "d", start_date: "2026-06-01", end_date: "2026-06-03", reason: "Turo: Mario" }],
    "2026-06-01",
    "2026-06-03",
    "Mario"
  );
  assert.equal(picked?.reason, "Turo: Mario");
});

test("pickTuroCancellationMatch refuses exact dates when guest name does not match reason", () => {
  const picked = pickTuroCancellationMatch(
    [
      {
        id: "henry",
        start_date: "2026-06-18",
        end_date: "2026-06-21",
        reason: "Turo: Henry — $193.18",
      },
    ],
    "2026-06-18",
    "2026-06-21",
    "Dominik"
  );
  assert.equal(picked, null);
});

test("pickTuroTripForMetadataRefresh matches guest when DB start date differs by one day", () => {
  const picked = pickTuroTripForMetadataRefresh(
    [{ id: "chevon", start_date: "2026-06-18", end_date: "2026-06-21", reason: "Turo: Chevon — $127.4" }],
    "2026-06-19",
    "2026-06-21",
    "Chevon"
  );
  assert.equal(picked?.id, "chevon");
});

test("pickTuroTripForMetadataRefresh matches sole overlapping trip without guest name", () => {
  const picked = pickTuroTripForMetadataRefresh(
    [
      { id: "a", start_date: "2026-06-01", end_date: "2026-06-03", reason: "Turo: Mario" },
      { id: "solo", start_date: "2026-07-01", end_date: "2026-07-05", reason: "Turo booking" },
    ],
    "2026-07-01",
    "2026-07-05",
    null
  );
  assert.equal(picked?.id, "solo");
});

test("pickTuroTripForMetadataRefresh matches by earnings when guest is absent", () => {
  const picked = pickTuroTripForMetadataRefresh(
    [
      { id: "henry", start_date: "2026-07-01", end_date: "2026-07-05", reason: "Turo: Henry — $253.95" },
      { id: "other", start_date: "2026-07-01", end_date: "2026-07-07", reason: "Turo: Graham — $339.95" },
    ],
    "2026-07-01",
    "2026-07-05",
    null,
    253.95
  );
  assert.equal(picked?.id, "henry");
});
