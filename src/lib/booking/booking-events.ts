import { logger } from "@/lib/utils/logger";

/** Structured booking funnel events for logs / monitoring. */
export function logBookingEvent(
  event:
    | "checkout_start"
    | "checkout_success"
    | "checkout_failed"
    | "checkout_overlap"
    | "checkout_price_mismatch"
    | "checkout_matched_existing_customer"
    | "availability_batch_failed"
    | "abandoned_step",
  meta?: Record<string, unknown>
): void {
  logger.warn(`[booking:${event}]`, meta ?? {});
}
