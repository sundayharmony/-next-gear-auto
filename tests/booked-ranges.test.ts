import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rangesConflictWithSelection } from "../src/lib/booking/booked-ranges";

describe("rangesConflictWithSelection", () => {
  it("returns false when no ranges", () => {
    assert.equal(
      rangesConflictWithSelection([], "2026-06-10", "2026-06-12", "10:00", "10:00"),
      false
    );
  });

  it("detects overlap with 60-minute buffer", () => {
    const ranges = [
      {
        pickupDate: "2026-06-10",
        returnDate: "2026-06-12",
        pickupTime: "10:00",
        returnTime: "10:00",
      },
    ];
    assert.equal(
      rangesConflictWithSelection(ranges, "2026-06-12", "2026-06-14", "09:30", "10:00"),
      true
    );
  });

  it("allows gap beyond buffer", () => {
    const ranges = [
      {
        pickupDate: "2026-06-10",
        returnDate: "2026-06-12",
        pickupTime: "10:00",
        returnTime: "10:00",
      },
    ];
    assert.equal(
      rangesConflictWithSelection(ranges, "2026-06-12", "2026-06-14", "12:00", "10:00"),
      false
    );
  });
});
