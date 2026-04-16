/**
 * Server-only staff messaging feature flags (read `FF_*` from `process.env`).
 * API routes must use this instead of `feature-flags.ts` helpers so behavior
 * does not depend on `NEXT_PUBLIC_*` build-time values.
 */

function parseEnvBool(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.replace(/[\r\n]/g, "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function staffMessagingMasterEnabled(): boolean {
  return parseEnvBool(process.env.FF_STAFF_MESSAGING_ENABLED);
}

export function staffMessagingEmailChannelEnabled(): boolean {
  return staffMessagingMasterEnabled() && parseEnvBool(process.env.FF_STAFF_MESSAGING_EMAIL_ENABLED);
}

export function staffMessagingPushChannelEnabled(): boolean {
  return staffMessagingMasterEnabled() && parseEnvBool(process.env.FF_STAFF_MESSAGING_PUSH_ENABLED);
}
