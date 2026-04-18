export type OutboxDecision = "retry" | "dead";

/** True when the failure should not be retried (bad credentials, bad address, gone subscription, etc.). */
export function isPermanentNotificationError(error: unknown): boolean {
  const statusCode = (error as { statusCode?: number })?.statusCode ?? 0;
  // Web Push: subscription invalid
  if (statusCode === 410 || statusCode === 404) return true;

  const responseCode = (error as { responseCode?: number })?.responseCode;
  if (typeof responseCode === "number") {
    // SMTP auth / policy (do not retry without config change)
    if (responseCode === 535 || responseCode === 534) return true;
    // Typical permanent recipient/content rejections
    if (responseCode >= 550 && responseCode <= 554) return true;
  }

  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (msg.includes("smtp_pass") && msg.includes("required")) return true;
  if (msg.includes("recipient has no email")) return true;
  if (msg.includes("no active push subscriptions")) return true;
  if (msg.includes("email notifications disabled")) return true;
  if (msg.includes("push notifications disabled")) return true;

  return false;
}

/** @deprecated Prefer isPermanentNotificationError; kept for tests and call sites that reason about "transient". */
export function isTransientNotificationError(error: unknown): boolean {
  return !isPermanentNotificationError(error);
}

/**
 * Prefer retry for unknown failures (many nodemailer errors lack stable `code` but are recoverable).
 * Only mark dead when the error is clearly permanent or max attempts exhausted.
 */
export function chooseOutboxDecision(error: unknown, attempt: number, maxAttempts: number): OutboxDecision {
  if (attempt >= maxAttempts) return "dead";
  if (isPermanentNotificationError(error)) return "dead";
  return "retry";
}
