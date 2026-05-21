/** True when the rental agreement PDF was generated and stored. */
export function isAgreementComplete(booking: {
  rental_agreement_url?: string | null;
}): boolean {
  return Boolean(booking.rental_agreement_url?.trim());
}
