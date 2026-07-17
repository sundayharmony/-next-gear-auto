export const PUBLIC_BOOKING_MIN_ADVANCE_HOURS = 24;
export const PUBLIC_BOOKING_TIME_ZONE = "America/New_York";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert a vehicle pickup wall-clock time in the business timezone to an instant. */
export function publicPickupInstant(
  pickupDate: string,
  pickupTime: string | null | undefined,
): Date | null {
  const dateMatch = DATE_RE.exec(pickupDate);
  const timeMatch = TIME_RE.exec(pickupTime?.trim() || "");
  if (!dateMatch || !timeMatch) return null;

  const desiredAsUtc = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3] || 0),
  );
  const firstOffset = timeZoneOffsetMs(new Date(desiredAsUtc), PUBLIC_BOOKING_TIME_ZONE);
  let instantMs = desiredAsUtc - firstOffset;
  const resolvedOffset = timeZoneOffsetMs(new Date(instantMs), PUBLIC_BOOKING_TIME_ZONE);
  if (resolvedOffset !== firstOffset) {
    instantMs = desiredAsUtc - resolvedOffset;
  }

  const instant = new Date(instantMs);
  return Number.isFinite(instant.getTime()) ? instant : null;
}

export function publicPickupMeetsMinimumAdvance(
  pickupDate: string,
  pickupTime: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const pickup = publicPickupInstant(pickupDate, pickupTime);
  if (!pickup || !Number.isFinite(now.getTime())) return false;
  const minimumMs = PUBLIC_BOOKING_MIN_ADVANCE_HOURS * 60 * 60 * 1000;
  return pickup.getTime() - now.getTime() >= minimumMs;
}

export const PUBLIC_BOOKING_ADVANCE_ERROR =
  "Public bookings must be made at least 24 hours before pickup.";
