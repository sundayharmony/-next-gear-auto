/**
 * Server-only staff messaging feature flags (read `FF_*` from `process.env`).
 * API routes must use this instead of `feature-flags.ts` helpers so behavior
 * does not depend on `NEXT_PUBLIC_*` build-time values alone.
 */

function parseEnvBool(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.replace(/[\r\n]/g, "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function staffMessagingMasterEnabled(): boolean {
  return parseEnvBool(process.env.FF_STAFF_MESSAGING_ENABLED);
}

/**
 * Whether email notifications are desired for staff messaging (before the master gate).
 * Resolution order:
 * 1. `FF_STAFF_MESSAGING_EMAIL_ENABLED` if set (non-empty) — explicit on/off.
 * 2. Else `NEXT_PUBLIC_FF_STAFF_MESSAGING_EMAIL_ENABLED` if set — aligns server with client bundle flags.
 * 3. Else default **true** (opt out with `FF_STAFF_MESSAGING_EMAIL_ENABLED=false`).
 */
export function resolveStaffMessagingEmailNotificationsEnabled(): boolean {
  const server = process.env.FF_STAFF_MESSAGING_EMAIL_ENABLED;
  if (server !== undefined && server !== "") {
    return parseEnvBool(server);
  }
  const pub = process.env.NEXT_PUBLIC_FF_STAFF_MESSAGING_EMAIL_ENABLED;
  if (pub !== undefined && pub !== "") {
    return parseEnvBool(pub);
  }
  return true;
}

export function staffMessagingEmailChannelEnabled(): boolean {
  return staffMessagingMasterEnabled() && resolveStaffMessagingEmailNotificationsEnabled();
}

export function staffMessagingPushChannelEnabled(): boolean {
  return staffMessagingMasterEnabled() && parseEnvBool(process.env.FF_STAFF_MESSAGING_PUSH_ENABLED);
}

/** Effective notification channels when messaging is on (for API/UI diagnostics). */
export function staffMessagingNotificationChannels(): { email: boolean; push: boolean } {
  return {
    email: staffMessagingEmailChannelEnabled(),
    push: staffMessagingPushChannelEnabled(),
  };
}
