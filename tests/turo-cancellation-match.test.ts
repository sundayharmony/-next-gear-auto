import test from "node:test";
import assert from "node:assert/strict";
import {
  pickTuroCancellationMatch,
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
