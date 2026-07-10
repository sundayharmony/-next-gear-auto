import type { BookingDbRow } from "@/lib/types";

export type CustomerBookingRow = BookingDbRow;

export type CustomerTicketRow = {
  id: string;
  ticketType: string;
  violationDate: string;
  municipality: string;
  state: string;
  prefix: string;
  ticketNumber: string;
  amountDue: number;
  status: string;
  vehicleName: string;
};

export type CustomerStats = {
  totalSpent: number;
  completedTrips: number;
  activeTrips: number;
  cancelledTrips: number;
  totalBookings: number;
  totalDays: number;
  avgBookingValue: number;
  hasSignedAgreement: boolean;
  lastBooking?: CustomerBookingRow;
  firstBooking?: CustomerBookingRow;
};

export function computeCustomerStats(bookings: CustomerBookingRow[]): CustomerStats {
  const nonCancelled = bookings.filter((b) => b.status !== "cancelled");
  const totalSpent = nonCancelled.reduce((sum, b) => sum + (b.total_price ?? 0), 0);
  const completedTrips = bookings.filter((b) => b.status === "completed").length;
  const activeTrips = bookings.filter((b) => b.status === "active" || b.status === "confirmed").length;
  const cancelledTrips = bookings.filter((b) => b.status === "cancelled").length;
  const totalBookings = bookings.length;

  const totalDays = nonCancelled.reduce((sum, b) => {
    if (!b.pickup_date || !b.return_date) return sum;
    const pParts = b.pickup_date.split("-").map(Number);
    const rParts = b.return_date.split("-").map(Number);
    if (pParts.length < 3 || rParts.length < 3) return sum;
    const [py, pm, pd] = pParts;
    const [ry, rm, rd] = rParts;
    const pickup = new Date(py, pm - 1, pd);
    const ret = new Date(ry, rm - 1, rd);
    const diff = ret.getTime() - pickup.getTime();
    if (isNaN(diff)) return sum;
    return sum + Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, 0);

  const avgBookingValue = nonCancelled.length > 0 ? totalSpent / nonCancelled.length : 0;
  const hasSignedAgreement = bookings.some((b) => b.agreement_signed_at);
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
  );

  return {
    totalSpent,
    completedTrips,
    activeTrips,
    cancelledTrips,
    totalBookings,
    totalDays,
    avgBookingValue,
    hasSignedAgreement,
    lastBooking: sortedBookings[0],
    firstBooking: sortedBookings[sortedBookings.length - 1],
  };
}
