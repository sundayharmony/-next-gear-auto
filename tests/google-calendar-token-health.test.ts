import test from "node:test";
import assert from "node:assert/strict";
import {
  googleCalendarErrorMessage,
  isGoogleCalendarAuthErrorFromUnknown,
} from "../src/lib/integrations/google-calendar/oauth-errors";

test("isGoogleCalendarAuthErrorFromUnknown reads Gaxios invalid_grant", () => {
  const err = {
    response: { data: { error: "invalid_grant", error_description: "Token has been expired or revoked." } },
  };
  assert.equal(isGoogleCalendarAuthErrorFromUnknown(err), true);
  assert.match(googleCalendarErrorMessage(err), /invalid_grant/i);
});
