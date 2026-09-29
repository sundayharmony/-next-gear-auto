// Legal text should be reviewed by licensed counsel before production use.

import {
  parseRecurringBookingMeta,
  type WeeklyDueDay,
} from "@/lib/utils/recurring-booking";

export type AgreementTermsSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

/** Sections added or materially expanded — appended to signed/preview PDFs for parity with inline agreement. */
export const RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS: AgreementTermsSection[] = [
  {
    title: "4A. AUTHORIZED CHARGES & PAYMENT OBLIGATIONS",
    paragraphs: [
      "In addition to the rental rate and security deposit shown above, Renter authorizes Lessor to charge the payment method on file for all amounts owed under this Agreement, including extensions, late fees, mileage overage ($0.39/mile over 200/day), fuel charges, cleaning fees, tolls, parking or traffic violations, towing and impound fees, damage repairs, loss-of-use, key replacement, GPS recovery costs, and any other fees disclosed at booking or return.",
      "Renter must maintain a valid payment method for the entire rental period. Declined, reversed, or disputed charges do not relieve Renter of the underlying obligation to pay.",
    ],
  },
  {
    title: "5. UNPAID BALANCES, DEFAULT & LEGAL REMEDIES",
    paragraphs: [
      "Upon return, early termination, or cancellation, Renter must pay all amounts owed in full. Any balance remaining unpaid after demand constitutes a default under this Agreement.",
      "Unpaid amounts continue to accrue until paid in full. To the extent permitted by applicable law, Renter is responsible for reasonable collection costs, court costs, and attorneys' fees incurred by Lessor in recovering amounts owed.",
      "If any balance remains unpaid, Lessor may pursue any remedies available under New Jersey law, including but not limited to: civil collection actions; filing in small claims or Superior Court in Hudson County; offset against the security deposit; reporting delinquent accounts to consumer reporting agencies where permitted by law; and recovery or repossession of the vehicle where lawfully permitted, without breach of the peace.",
      "Renter agrees that this Agreement is governed by the laws of the State of New Jersey. Venue for disputes arising from unpaid balances or breach lies in Hudson County, New Jersey, unless otherwise required by law.",
    ],
  },
  {
    title: "SECURITY & USE (SUPPLEMENTAL)",
    paragraphs: [
      "Insurance coverage is void if Renter provides false or expired insurance proof, permits unauthorized drivers, or uses the vehicle in violation of Section 9. Renter remains fully liable for all damage and third-party claims regardless of insurance.",
      "Tampering with, disabling, or removing GPS/telematics equipment is prohibited and may result in immediate termination, a penalty, and full liability for recovery costs.",
      "Initiating a payment chargeback or reversal without a bona fide billing error constitutes fraud; the disputed amount plus associated fees remain immediately due, and Lessor may terminate the rental and pursue legal remedies.",
    ],
  },
];

export const RENTAL_AGREEMENT_SECTION_4_PAYMENT_ADDENDUM = {
  title: "Payment & Balances",
  paragraphs: [
    "Renter agrees to pay the Total Rental Price, Security Deposit, Balance Due at Pickup, and any recurring weekly charges (if applicable) when due. All amounts shown above are part of the total obligation under this Agreement.",
  ],
};

export const RENTAL_AGREEMENT_SECTION_5_UNPAID: AgreementTermsSection = {
  title: "5. UNPAID BALANCES, DEFAULT & LEGAL REMEDIES",
  paragraphs: [
    "Upon return, early termination, extension, or cancellation, Renter must immediately pay all amounts owed under this Agreement, including rental charges, late fees, mileage overage, fuel, cleaning, damage, tolls, violations, towing, storage, loss-of-use, and any other authorized charges.",
    "Any amount that remains unpaid after Lessor's written or electronic demand constitutes default. Unpaid balances continue to accrue until paid in full.",
    "To the extent permitted by applicable law, Renter is liable for reasonable collection costs, court costs, and attorneys' fees incurred by Lessor in recovering amounts owed.",
    "Following default, Lessor may pursue any remedy available under New Jersey law, including civil collection; suit in small claims or Superior Court in Hudson County; offset against the security deposit; lawful vehicle recovery; suspension of future rentals; and reporting to consumer reporting agencies where permitted by law.",
  ],
};

export const RECURRING_WEEKLY_SUPPLEMENT_SECTIONS: AgreementTermsSection[] = [
  {
    title: "WEEK-TO-WEEK LONG-TERM RENTAL TERMS",
    paragraphs: [
      "This rental is structured as a recurring week-to-week long-term agreement. Each renewal period is seven (7) calendar days unless otherwise agreed in writing.",
      "The weekly recurring rate shown on the agreement form is due at the start of each new seven-day term. Failure to pay the weekly amount when due may result in default under Section 5 and suspension or termination of the rental.",
      "The return date on the form reflects the end of the current billing period and will roll forward while the rental remains active.",
    ],
  },
];

export function getAgreementSupplementSections(
  adminNotes?: string | null,
  weeklyDueDay?: WeeklyDueDay
): AgreementTermsSection[] {
  const meta = parseRecurringBookingMeta(adminNotes);
  const dueDay = weeklyDueDay ?? meta.weeklyDueDay;
  if (!meta.isRecurringLongTerm || !dueDay) {
    return RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS;
  }
  const dueLine = `Weekly payment is due every ${dueDay} at the start of each new seven-day term.`;
  return [
    ...RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS,
    ...RECURRING_WEEKLY_SUPPLEMENT_SECTIONS,
    {
      title: "WEEKLY DUE DAY",
      paragraphs: [dueLine],
    },
  ];
}

export const RENTAL_AGREEMENT_SECTION_4A_AUTHORIZED: AgreementTermsSection = {
  title: "4A. AUTHORIZED CHARGES",
  paragraphs: [
    "Renter authorizes Lessor to charge the payment method on file for all amounts owed under this Agreement, including extensions, late fees, mileage overage ($0.39/mile over 200/day), fuel, cleaning, tolls, parking or traffic violations, towing and impound fees, damage repairs, loss-of-use, key replacement ($350), GPS recovery costs, and fees disclosed at booking or return.",
    "Declined, reversed, or disputed charges do not relieve Renter of the obligation to pay the full amount owed.",
  ],
};

/** Sections 6–15 rendered on agreement pages 2–3 (single source for inline UI + supplements). */
export const RENTAL_AGREEMENT_INLINE_SECTIONS: (AgreementTermsSection & {
  page: 2 | 3;
  bullets?: string[];
  emphasis?: string;
})[] = [
  {
    page: 2,
    title: RENTAL_AGREEMENT_SECTION_5_UNPAID.title,
    paragraphs: RENTAL_AGREEMENT_SECTION_5_UNPAID.paragraphs,
  },
  {
    page: 2,
    title: "6. INSURANCE REQUIREMENTS",
    paragraphs: [
      "Renter MUST provide proof of active auto insurance meeting New Jersey minimum requirements before or at pickup. False, expired, or incomplete insurance proof voids coverage under this Agreement.",
      "If proof of insurance is not provided, temporary Non-Owned Auto Coverage will be added at $9/day.",
    ],
    emphasis: "Optional Supplemental Liability Protection (SLP): $11.25/day (up to $1M)",
  },
  {
    page: 2,
    title: "7. LIABILITY & DAMAGE RESPONSIBILITY",
    paragraphs: [
      "Renter is fully and completely responsible for ALL vehicle damage regardless of cause, fault, or insurance coverage. This includes but is not limited to: collision damage, theft, vandalism, weather damage, tire/rim/undercarriage damage, windshield damage, interior damage, lost or damaged keys ($350 replacement cost), towing and impound fees, storage charges, diminished vehicle value (up to $5,000), and loss-of-use charges (daily rental rate × days the vehicle is unavailable). Renter remains liable even if a third party or unauthorized driver caused the damage.",
    ],
  },
  {
    page: 2,
    title: "8. INDEMNIFICATION & HOLD HARMLESS",
    paragraphs: [
      "Renter agrees to indemnify, defend, and hold harmless Next Gear Auto LLC, its owners, employees, and agents from and against any and all claims, demands, losses, liabilities, damages, costs, and expenses (including reasonable attorney fees) arising out of or related to Renter's use, operation, or possession of the vehicle during the rental period. This includes, without limitation, claims by third parties for bodily injury, property damage, or death resulting from any accident, incident, or occurrence involving the rented vehicle, regardless of fault.",
    ],
  },
  {
    page: 2,
    title: "9. PROHIBITED USES",
    paragraphs: [
      "The following are strictly prohibited ($1,500 penalty + full liability + immediate termination):",
    ],
    bullets: [
      "Operation by unauthorized drivers or while impaired",
      "Commercial use (Uber, Lyft, DoorDash, delivery, etc.)",
      "Off-road driving, racing, drifting, or reckless/aggressive driving",
      "Exceeding passenger or cargo capacity",
      "Leaving vehicle running and unattended",
      "Crossing U.S. borders (Canada/Mexico prohibited)",
      "Subleasing, transferring possession, or using the vehicle for illegal activity",
    ],
  },
  {
    page: 2,
    title: "10. GPS / VEHICLE TRACKING DISCLOSURE",
    paragraphs: [
      "Renter acknowledges that the vehicle may be equipped with GPS or telematics that record location, speed, mileage, and operational data for recovery, mileage verification, safety, and fleet management. Tampering with, disabling, or removing such equipment is prohibited and may result in penalties and full recovery costs.",
    ],
    emphasis: "I acknowledge and consent to GPS/vehicle tracking during the rental period.",
  },
  {
    page: 3,
    title: "11. PETS & CLEANLINESS",
    paragraphs: [
      "Pets are allowed ONLY if the vehicle is returned in completely clean condition with no pet hair, odors, or damage. Pet-related cleaning charges: $150-$350 depending on condition.",
    ],
  },
  {
    page: 3,
    title: "12. VEHICLE RETURN CONDITIONS",
    paragraphs: [
      "Vehicle must be returned: (1) Clean inside and out (2) Full fuel tank (3) Without any new damage (4) With all original accessories and documentation (5) At or before scheduled return time",
    ],
  },
  {
    page: 3,
    title: "13. ACCIDENT & THEFT PROCEDURES",
    paragraphs: [
      "In the event of any accident or theft, Renter MUST immediately: (1) Call 911 (2) Contact Next Gear Auto at (551) 429-3472 (3) File a police report the same day. Failure to follow these steps immediately may void all insurance coverage and result in renter liability for full replacement value.",
    ],
  },
  {
    page: 3,
    title: "14. FRAUD, CHARGEBACKS & MISREPRESENTATION",
    paragraphs: [
      "Providing false identification, fraudulent insurance, invalid payment methods, or initiating a chargeback or payment reversal without a bona fide billing error will result in immediate termination, full liability for all amounts owed (including vehicle value where applicable), and potential civil or criminal prosecution. Disputed charges remain due until resolved in Lessor's favor.",
    ],
  },
  {
    page: 3,
    title: "15. GOVERNING LAW & DISPUTE RESOLUTION",
    paragraphs: [
      "This Agreement is governed by the laws of the State of New Jersey. Venue for disputes, including collection of unpaid balances, is Hudson County Superior Court or small claims court in Hudson County, unless otherwise required by law. Both parties waive jury trial and class action rights to the extent permitted by law. The prevailing party in any action to enforce this Agreement is entitled to reasonable attorneys' fees and costs.",
    ],
  },
];

export function getInlineSectionsForPage(page: 2 | 3) {
  return RENTAL_AGREEMENT_INLINE_SECTIONS.filter((s) => s.page === page);
}

export const AGREEMENT_ESIGN_DISCLOSURE =
  "By signing electronically, you agree that your electronic signature is the legal equivalent of your manual signature on this Agreement, and that you consent to conduct this transaction electronically.";
