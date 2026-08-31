import test from "node:test";
import assert from "node:assert/strict";
import {
  displayGoogleCalendarError,
  extractGoogleOAuthError,
  formatGoogleCalendarError,
  GOOGLE_CALENDAR_ENCRYPTION_MESSAGE,
  GOOGLE_CALENDAR_RECONNECT_MESSAGE,
  isReconnectRequiredError,
  isReconnectRequiredMessage,
} from "../src/lib/integrations/google-calendar/errors";

test("extractGoogleOAuthError reads Gaxios invalid_grant payload", () => {
  const err = Object.assign(new Error("invalid_grant"), {
    response: {
      data: {
        error: "invalid_grant",
        error_description: "Token has been expired or revoked.",
      },
    },
  });
  assert.deepEqual(extractGoogleOAuthError(err), {
    code: "invalid_grant",
    description: "Token has been expired or revoked.",
  });
});

test("formatGoogleCalendarError maps invalid_grant to reconnect copy", () => {
  const err = Object.assign(new Error("invalid_grant"), {
    response: { data: { error: "invalid_grant" } },
  });
  assert.equal(formatGoogleCalendarError(err), GOOGLE_CALENDAR_RECONNECT_MESSAGE);
  assert.equal(isReconnectRequiredError(err), true);
});

test("formatGoogleCalendarError maps invalid_client", () => {
  const err = Object.assign(new Error("invalid_client"), {
    response: { data: { error: "invalid_client" } },
  });
  assert.match(formatGoogleCalendarError(err), /GOOGLE_CALENDAR_CLIENT_SECRET/);
});

test("formatGoogleCalendarError maps encryption / decrypt failures", () => {
  assert.equal(
    formatGoogleCalendarError(new Error("GOOGLE_CALENDAR_ENCRYPTION_KEY is not configured")),
    GOOGLE_CALENDAR_ENCRYPTION_MESSAGE
  );
  assert.equal(
    formatGoogleCalendarError(new Error("Unsupported state or unable to authenticate data")),
    GOOGLE_CALENDAR_ENCRYPTION_MESSAGE
  );
});

test("displayGoogleCalendarError humanizes stored last_error values", () => {
  assert.equal(displayGoogleCalendarError("invalid_grant"), GOOGLE_CALENDAR_RECONNECT_MESSAGE);
  assert.equal(
    displayGoogleCalendarError("Token has been expired or revoked."),
    GOOGLE_CALENDAR_RECONNECT_MESSAGE
  );
  assert.equal(displayGoogleCalendarError("Rate Limit Exceeded"), "Rate Limit Exceeded");
  assert.equal(displayGoogleCalendarError(null), null);
  assert.equal(
    displayGoogleCalendarError("GOOGLE_CALENDAR_ENCRYPTION_KEY is not configured"),
    GOOGLE_CALENDAR_ENCRYPTION_MESSAGE
  );
});

test("isReconnectRequiredMessage matches raw and friendly invalid_grant text", () => {
  assert.equal(isReconnectRequiredMessage("invalid_grant"), true);
  assert.equal(isReconnectRequiredMessage(GOOGLE_CALENDAR_RECONNECT_MESSAGE), true);
  assert.equal(isReconnectRequiredMessage("Rate Limit Exceeded"), false);
});
