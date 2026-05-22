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
