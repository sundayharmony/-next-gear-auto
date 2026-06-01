/** Normalized occupancy range for fleet availability (bookings + blocks). */
export interface BookedRange {
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
}

const BUFFER_MS = 60 * 60 * 1000;

/**
 * True when selected pickup/return overlaps an existing range (60-minute gap for public checkout).
 */
export function rangesConflictWithSelection(
  ranges: BookedRange[] | undefined,
  pickupDate: string,
  returnDate: string,
  pickupTime: string,
  returnTime: string
): boolean {
  if (!ranges?.length || !pickupDate || !returnDate) return false;

  const selectedPickup = new Date(`${pickupDate}T${pickupTime || "10:00"}:00`).getTime();
  const selectedReturn = new Date(`${returnDate}T${returnTime || "10:00"}:00`).getTime();
  if (!Number.isFinite(selectedPickup) || !Number.isFinite(selectedReturn)) return false;

  for (const range of ranges) {
    const existingPickup = new Date(`${range.pickupDate}T${range.pickupTime || "10:00"}:00`).getTime();
    const existingReturn = new Date(`${range.returnDate}T${range.returnTime || "10:00"}:00`).getTime();
    if (!Number.isFinite(existingPickup) || !Number.isFinite(existingReturn)) continue;

    const bufferedStart = existingPickup - BUFFER_MS;
    const bufferedEnd = existingReturn + BUFFER_MS;

    if (selectedPickup < bufferedEnd && selectedReturn > bufferedStart) {
      return true;
    }
  }
  return false;
}
