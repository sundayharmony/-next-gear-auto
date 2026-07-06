import { logger } from "@/lib/utils/logger";
import { syncBlockedDateById, syncBookingById } from "./sync";

export function queueGoogleCalendarBookingSync(bookingId: string): void {
  void syncBookingById(bookingId).catch((err) => {
    logger.error("Google Calendar booking sync failed:", err);
  });
}

export function queueGoogleCalendarBlockedDateSync(blockedDateId: string): void {
  void syncBlockedDateById(blockedDateId).catch((err) => {
    logger.error("Google Calendar blocked date sync failed:", err);
  });
}
