import { syncBlockedDateById, syncBookingById } from "./sync";
import { scheduleGoogleCalendarWork } from "./schedule-after";

export { scheduleGoogleCalendarWork } from "./schedule-after";

export function queueGoogleCalendarBookingSync(bookingId: string): void {
  scheduleGoogleCalendarWork("booking sync", () => syncBookingById(bookingId));
}

export function queueGoogleCalendarBlockedDateSync(blockedDateId: string): void {
  scheduleGoogleCalendarWork("blocked date sync", () =>
    syncBlockedDateById(blockedDateId)
  );
}
