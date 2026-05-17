/** Booking rows that block marking a vehicle as sold. */

export const SALE_BLOCKING_STATUSES = ["pending", "confirmed", "active"] as const;

export type SaleBlockingBooking = {
  id: string;
  status: string | null;
  return_date: string | null;
};

/**
 * True when the vehicle still has an open rental (return on or after `todayYyyyMmDd`).
 */
export function hasBlockingBookingsForSale(
  bookings: SaleBlockingBooking[],
  todayYyyyMmDd: string,
): boolean {
  return bookings.some((b) => {
    const status = (b.status || "").toLowerCase();
    if (!(SALE_BLOCKING_STATUSES as readonly string[]).includes(status)) return false;
    const returnDate = b.return_date || "";
    if (!returnDate) return true;
    return returnDate >= todayYyyyMmDd;
  });
}
