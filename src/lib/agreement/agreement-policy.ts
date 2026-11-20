/**
 * Business policy values that appear in the rental agreement, the booking flow and the public
 * site. Keep them here so the contract, the printed PDF template and the website cannot drift.
 */
import { CONTACT_INFO } from "@/lib/constants";

/** Flat, non-refundable fee charged to a renter who does not provide valid proof of insurance. */
export const UNINSURED_DRIVER_FEE_USD = 100;

/** Contact details printed on the agreement. Source of truth is CONTACT_INFO. */
export const AGREEMENT_CONTACT_PHONE = CONTACT_INFO.phone;
export const AGREEMENT_CONTACT_EMAIL = CONTACT_INFO.email;

/** One-line summary used wherever the policy is stated outside the full contract text. */
export const BYO_INSURANCE_SUMMARY =
  `Renters must bring their own valid auto insurance. Without proof of insurance, a flat ` +
  `$${UNINSURED_DRIVER_FEE_USD} uninsured driver fee applies and the renter pays out of pocket ` +
  `for any and all damage.`;
