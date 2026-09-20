import test from "node:test";
import assert from "node:assert/strict";
import {
  GCAL_RECONNECT_MESSAGE,
  isGoogleCalendarAuthError,
} from "@/lib/integrations/google-calendar/oauth-errors";
import { sourceDescriptionMarker } from "@/lib/integrations/google-calendar/event-builder";

test("isGoogleCalendarAuthError detects invalid_grant", () => {
  assert.equal(isGoogleCalendarAuthError("booking:bk1: invalid_grant"), true);
  assert.equal(isGoogleCalendarAuthError("invalid_client"), true);
  assert.equal(isGoogleCalendarAuthError("Rate Limit Exceeded"), false);
});

test("sourceDescriptionMarker is stable for recovery search", () => {
  assert.equal(sourceDescriptionMarker("booking", "bk1"), "Booking ID: bk1");
  assert.equal(sourceDescriptionMarker("turo", "t1"), "Turo trip ID: t1");
  assert.equal(sourceDescriptionMarker("blocked", "bd1"), "Blocked date ID: bd1");
});

test("GCAL_RECONNECT_MESSAGE tells admin to reconnect", () => {
  assert.match(GCAL_RECONNECT_MESSAGE, /reconnect/i);
});
