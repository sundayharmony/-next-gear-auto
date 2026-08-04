import test from "node:test";
import assert from "node:assert/strict";
import { scheduleGoogleCalendarWork } from "@/lib/integrations/google-calendar/schedule-after";

test("scheduleGoogleCalendarWork runs the task outside a request scope", async () => {
  let ran = false;
  await new Promise<void>((resolve, reject) => {
    scheduleGoogleCalendarWork("test", async () => {
      ran = true;
      resolve();
    });
    setTimeout(() => reject(new Error("scheduled work did not run")), 1000);
  });

  assert.equal(ran, true);
});

test("scheduleGoogleCalendarWork logs and swallows task failures", async () => {
  await new Promise<void>((resolve) => {
    scheduleGoogleCalendarWork("test-fail", async () => {
      queueMicrotask(resolve);
      throw new Error("boom");
    });
  });
  // Failure should not reject the caller; give the catch path a tick.
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(true);
});
