export type TripAssociation = {
  bookingId: string | null;
  blockedDateId: string | null;
};

export function parseTripAssociation(body: {
  bookingId?: unknown;
  blockedDateId?: unknown;
  tripBookingId?: unknown;
  tripBlockedDateId?: unknown;
}): TripAssociation {
  const bookingRaw = body.bookingId ?? body.tripBookingId;
  const blockedRaw = body.blockedDateId ?? body.tripBlockedDateId;
  const bookingId =
    typeof bookingRaw === "string" && bookingRaw.trim() ? bookingRaw.trim() : null;
  const blockedDateId =
    typeof blockedRaw === "string" && blockedRaw.trim() ? blockedRaw.trim() : null;
  if (bookingId && blockedDateId) {
    return { bookingId, blockedDateId: null };
  }
  return { bookingId, blockedDateId };
}
