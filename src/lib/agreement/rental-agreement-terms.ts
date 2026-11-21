// Legal text should be reviewed by licensed counsel before production use.

import {
  parseRecurringBookingMeta,
  type WeeklyDueDay,
} from "@/lib/utils/recurring-booking";
import { UNINSURED_DRIVER_FEE_USD } from "@/lib/agreement/agreement-policy";

export type AgreementTermsSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

/**
 * Additional protections: identification, vehicle condition evidence, non-return and recovery,
 * telematics/records, claims cooperation, extra prohibited conduct, violations/tolls,
 * liquidated damages, notices, and general terms.
 *
 * Single source: shown on screen (page 3, after Section 15) and appended to every signed PDF.
 * Sections refer to other sections by title, not number, because the printed PDF form and the
 * on-screen agreement number their sections differently.
 */
export const RENTAL_AGREEMENT_ADDITIONAL_SECTIONS: AgreementTermsSection[] = [
  {
    title: "16. RENTER IDENTIFICATION & DRIVER ELIGIBILITY",
    paragraphs: [
      "Renter represents that every identification, driver's license, insurance, address, and payment detail provided to Lessor is genuine, current, and belongs to Renter, and that Renter holds a valid, unexpired driver's license that is not suspended, revoked, or restricted in a way that prevents operating the vehicle. Renter must stop driving and notify Lessor immediately if Renter's license is suspended, revoked, or expires during the rental.",
      "Renter authorizes Lessor to verify Renter's identity, driver's license status, insurance, and payment information with the issuing agencies, insurers, payment processors, and identity-verification services, and to keep copies of Renter's identification, license, and insurance documents and booking records for as long as needed to enforce this Agreement or as required by law.",
      "Only the Primary Renter and any Additional Driver listed on this Agreement may drive the vehicle. An additional driver must be approved and verified by Lessor before driving.",
    ],
  },
  {
    title: "17. VEHICLE CONDITION & INSPECTION RECORDS",
    paragraphs: [
      "Lessor may record the vehicle's condition, odometer reading, and fuel level with photographs or video at pickup and at return. Those records, together with any telematics data, are evidence of the vehicle's condition.",
      "Renter must inspect the vehicle at pickup and report any damage that is not documented to Lessor in writing (text or email is sufficient) before driving the vehicle away or, for contactless pickups, as soon as practicable and before any other use. Damage that appears at return and is not documented at pickup is presumed to have occurred during the rental, unless Renter shows otherwise.",
      "The rental does not end, and Renter remains responsible for the vehicle, until Lessor has received and inspected it. Returns made after hours or by key drop are at Renter's risk until inspected. Renter is encouraged to photograph or video the vehicle at return.",
    ],
  },
  {
    title: "18. NON-RETURN, VEHICLE RECOVERY & LAW ENFORCEMENT REPORTING",
    paragraphs: [
      "Time is of the essence for return of the vehicle. If the vehicle is not returned by the scheduled return time and Renter has not received written approval (email or text is sufficient) of an extension, Renter is in breach, and late fees and rental charges continue to accrue until the vehicle is returned.",
      "If the vehicle is not returned within twenty-four (24) hours after the scheduled return time and Lessor has been unable to reach Renter, or sooner if there is evidence of abandonment, misuse, GPS tampering, or false information provided by Renter, Lessor may terminate the rental, treat further possession of the vehicle as unauthorized, and report the vehicle as stolen or unlawfully retained to law enforcement. Keeping a rented vehicle without the owner's permission may be a crime under New Jersey and other applicable law.",
      "Renter authorizes Lessor and its agents to locate the vehicle using its GPS/telematics and to recover it where lawfully permitted, without breach of the peace. Renter is responsible for all recovery costs, including towing, recovery-agent and travel costs, storage, impound, and loss of use. Renter agrees not to hide, abandon, or relocate the vehicle to evade recovery, or to transfer it to anyone else.",
      "Lessor may give law enforcement Renter's identity, contact, driver's license, payment, booking, and vehicle-location information in connection with any such report.",
    ],
  },
  {
    title: "19. TELEMATICS, RECORDS & EVIDENCE",
    paragraphs: [
      "Lessor may use GPS and telematics data (including location history, speed, mileage, and ignition or door events), booking records, photographs, video, communications, and electronic-signature records to enforce this Agreement, resolve disputes, defend or pursue claims, and recover the vehicle.",
      "Lessor may disclose that information to law enforcement, insurers, courts, toll and ticketing authorities, recovery agents, and collection agencies as permitted by law. Renter acknowledges that Lessor owns the vehicle and may monitor its location during the rental period. Lessor's Privacy Policy also describes how personal information is handled.",
      "When Renter signs electronically, Lessor records the signing date and time, IP address, device and browser information, the signed name, and the version of this Agreement presented. Renter agrees these records are part of the signed Agreement and may be used to show who signed and what Renter agreed to.",
    ],
  },
  {
    title: "20. ACCIDENTS, CLAIMS & COOPERATION",
    paragraphs: [
      "In addition to the steps in the Accident & Theft Procedures section, Renter must not leave the scene of an accident, admit fault, agree to a settlement, or authorize any repair. Renter should photograph the scene and the vehicle, collect the other party's name, contact, insurance, and license plate information, and keep the vehicle secure.",
      "Renter must give Lessor a written description of the incident and a copy of the police report (or report number) as soon as available, and must cooperate with Lessor's and any insurer's investigation, including giving statements and documents on request.",
      "Renter authorizes Lessor to share incident, driver, and insurance information with insurers, claimants, and law enforcement; to submit claims to Renter's insurer or any other responsible party; and to pursue Renter directly for any amount not paid by insurance.",
    ],
  },
  {
    title: "21. ADDITIONAL PROHIBITED USES & CONDUCT",
    paragraphs: [
      "In addition to the Prohibited Uses section, the following are also prohibited. Each is a violation of this Agreement with the consequences stated in the Prohibited Uses section:",
    ],
    bullets: [
      "Smoking, vaping, or burning any substance in the vehicle",
      "Possessing or transporting illegal drugs, unlawful weapons, stolen property, or other contraband",
      "Driving after consuming alcohol, cannabis, or any other impairing substance",
      "Towing or pushing any vehicle or trailer, or carrying hazardous materials",
      "Using the vehicle for driving instruction, testing, contests, or any competition",
      "Altering or modifying the vehicle, removing or swapping license plates, or installing devices that block or jam tracking",
      "Making or authorizing repairs without Lessor's written consent, or continuing to drive after a warning light or mechanical problem makes the vehicle unsafe instead of contacting Lessor",
      "Leaving keys in an unattended vehicle or leaving the vehicle unlocked",
    ],
  },
  {
    title: "22. VIOLATIONS, TOLLS & LATER-POSTING CHARGES",
    paragraphs: [
      "Renter is responsible for all tickets, tolls, parking charges, red-light or speed-camera notices, and other fines or violations incurred during the rental period, including those issued or posted after the vehicle is returned. Lessor may pay or respond to any such notice, identify Renter to the issuing authority, and charge the payment method on file for the amount plus Lessor's reasonable administrative costs of handling it.",
      "The Security Deposit is not a limit on Renter's liability. Lessor may apply it to any amount owed and will return any remaining balance after inspecting the vehicle and reconciling charges. Charges that post later, such as tolls, violations, and damage found after return, may be charged to the payment method on file.",
    ],
  },
  {
    title: "23. LIQUIDATED DAMAGES",
    paragraphs: [
      "Where this Agreement states a fixed amount for a violation (for example, unauthorized drivers, prohibited uses, or tampering with GPS equipment) and calls it a penalty, that amount is liquidated damages and not a penalty. Renter and Lessor agree that Lessor's investigative, administrative, and risk costs from these violations are difficult to measure in advance and that the stated amount is a reasonable estimate of them.",
      "These amounts are separate from, and do not replace, Renter's liability for actual repair costs, recovery costs, loss of use, and third-party claims, which are charged at actual cost and are not duplicated.",
    ],
  },
  {
    title: "24. NOTICES, CONTACT & ELECTRONIC RECORDS",
    paragraphs: [
      "Renter consents to receive notices, invoices, demands, and copies of this Agreement by email, text message, and phone at the contact information Renter provided, and agrees to keep it current. Notices sent to that contact information are treated as received when sent. Renter also consents to be contacted by call or text about this rental and any amounts owed.",
      "Lessor may keep this Agreement, the signed PDF, and its signing records electronically. An electronic copy is as valid as a paper original, and this Agreement and Renter's signature may not be denied legal effect only because they are electronic.",
    ],
  },
  {
    title: "25. GENERAL TERMS & ORDER OF PRECEDENCE",
    paragraphs: [
      "This Agreement, including the printed form, the Rental Summary, and these Supplemental Terms, is the entire agreement between Renter and Lessor for this rental. If the printed form conflicts with these Supplemental Terms or the Rental Summary, the Supplemental Terms and the Rental Summary control. References to a section mean the section with that title, regardless of its number.",
      "Changes to this Agreement must be in writing; a written extension or change from Lessor by email or text is sufficient. Lessor's delay or failure to enforce any term is not a waiver of it, and Lessor's remedies are cumulative. Renter may not assign this Agreement or transfer the vehicle. Provisions about payment, liability, indemnity, recovery, records, and dispute resolution continue after the vehicle is returned or the rental ends.",
      "If any provision of this Agreement is held unenforceable, it will be enforced to the greatest extent permitted by law and the remaining provisions stay in effect. Nothing in this Agreement is intended to waive any right of Renter that cannot lawfully be waived under New Jersey or federal law.",
      "Renter confirms that Renter has read this Agreement, has had the opportunity to ask questions before signing, and has received or will receive a copy.",
    ],
  },
];

/**
 * Long-form continuation of the insurance, liability, and indemnification sections.
 * The printed form carries a short version of each (its Sections 5, 6 and 7); these paragraphs
 * continue them. Shown on screen inside the matching sections and in the PDF's Additional Terms.
 */
export const RENTAL_AGREEMENT_EXTENDED_TERMS = {
  insurance: [
    "Qualifying coverage. Renter's policy must (a) be in force for the entire rental period, (b) apply to this vehicle as primary coverage, (c) cover Renter's use of the vehicle as a rental vehicle, with liability limits of at least the New Jersey minimums, and (d) cover Renter and any additional driver. Many personal auto policies and credit-card programs exclude or limit rental, peer-to-peer, or long-term rentals. Renter is solely responsible for confirming with Renter's insurer, before pickup, that the policy applies to this rental. Credit-card rental coverage alone is not accepted as insurance under this Agreement unless Lessor agrees in writing.",
    "Proof of insurance. Proof must be a legible, current insurance card, declarations page, or insurer-issued temporary ID that shows the named insured, policy number, policy dates, and the insurer's contact information, and that matches the name of Renter or an authorized driver. Lessor may keep a copy, may contact the insurer to verify coverage, and may reject proof it reasonably believes is invalid or insufficient. Lessor's acceptance of proof is not a statement that the coverage is adequate or that it applies to this rental.",
    `Changes during the rental. Renter must tell Lessor immediately if the policy is cancelled, lapses, is rescinded, or no longer covers the vehicle. From that moment the $${UNINSURED_DRIVER_FEE_USD} Uninsured Driver Fee applies, Renter is responsible for all damage as stated in this Agreement, and Lessor may terminate the rental and recover the vehicle. Proof provided after the rental begins does not waive the Uninsured Driver Fee unless Lessor agrees in writing.`,
    "Claims and denied coverage. If Renter's insurer pays less than the full amount, delays payment, or denies a claim for any reason, including because the policy excludes rental vehicles, Renter must pay the difference. Renter must pay Lessor's damage charges when due and seek reimbursement from Renter's own insurer afterward. Deductibles, loss of use, diminished value, towing, storage, and administrative costs that Renter's insurer does not pay remain Renter's responsibility. Lessor is not required to submit a claim to Renter's insurer, and may do so at Renter's expense.",
  ],
  liability: [
    "Period of responsibility. Renter is responsible for the vehicle from the moment Renter or any authorized driver takes possession or control of the vehicle or its keys until Lessor has received the vehicle and completed its return inspection. This includes any time the vehicle is parked, unattended, or stored, and any time after the scheduled return time.",
    "What is covered. Renter is responsible for loss of or damage to the vehicle, its keys and key fob, tires, wheels, glass, GPS/telematics equipment, interior, accessories, and documents, from any cause, including collision, rollover, theft or attempted theft (including when the vehicle is left unlocked or the keys are inside), vandalism, fire, flood, hail, falling objects, animals, road hazards, potholes, curb damage, smoke or odor, stains, burns, and unauthorized use by any person. This applies whether or not Renter or an authorized driver was at fault, and whether or not Renter was in the vehicle.",
    "How damages are measured. Repair costs are the actual or estimated cost to restore the vehicle to its pre-rental condition at a repair facility chosen by Lessor, including parts, labor, paint, taxes, towing, storage, and reasonable administrative costs, plus loss of use (the daily rental rate multiplied by the days the vehicle is unavailable for rental while it is repaired or replaced) and diminished value as stated in this Agreement. If the vehicle is stolen and not recovered, or is a total loss, Renter owes its fair market value immediately before the loss, plus towing, storage, administrative costs, and loss of use for the time reasonably needed to replace it.",
    "Payment and records. Damage charges are due when assessed. Lessor may apply the Security Deposit and charge the payment method on file for any amount owed; the Security Deposit does not limit Renter's liability. Lessor's inspection records, photographs, repair estimates, invoices, and telematics data are evidence of the vehicle's condition and the cost of repair. On written request, Lessor will give Renter a copy of the estimate or invoice supporting a damage charge.",
    "Other drivers, passengers, and belongings. Renter is responsible for the acts and omissions of every driver and passenger who is in or uses the vehicle with Renter's permission, express or implied, and for damage they cause. Lessor is not responsible for personal property left in or stolen from the vehicle.",
  ],
  indemnification: [
    "Who is protected. Renter's indemnity runs to Next Gear Auto LLC; its members, owners, managers, employees, contractors, and agents; the owner of the vehicle, if different from Lessor; and their insurers, successors, and assigns.",
    "What it covers. It covers claims, suits, judgments, settlements, fines, penalties, fees, costs, and expenses (including reasonable attorneys' fees and expert costs) arising from or related to: the use, operation, or possession of the vehicle by Renter or any driver or passenger; any breach of this Agreement; any violation of law; any ticket, toll, tow, impound, seizure, or forfeiture; and any bodily injury, death, or property damage to anyone, including Renter, passengers, and third parties.",
    "Defense and settlement. If a claim is made against a protected party, Renter must, at Renter's own expense, defend it with counsel reasonably acceptable to Lessor, or reimburse Lessor's defense costs as they are incurred. Renter may not settle any claim that names or affects a protected party without Lessor's written consent. Renter must notify Lessor immediately of any claim, demand, summons, or lawsuit concerning the vehicle and send Lessor a copy of all papers received.",
    "Limits and survival. This indemnity applies to the fullest extent permitted by New Jersey law. It does not apply to the extent a court finally determines that a claim resulted from the gross negligence or willful misconduct of a protected party. It continues after the vehicle is returned and after this Agreement ends.",
  ],
};

/** Sections added or materially expanded — appended to signed/preview PDFs for parity with inline agreement. */
export const RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS: AgreementTermsSection[] = [
  {
    title: "4A. AUTHORIZED CHARGES & PAYMENT OBLIGATIONS",
    paragraphs: [
      "In addition to the rental rate and security deposit shown above, Renter authorizes Lessor to charge the payment method on file for all amounts owed under this Agreement, including extensions, late fees, mileage overage ($0.39/mile over 200/day), fuel charges, cleaning fees, tolls, parking or traffic violations, towing and impound fees, damage repairs, loss-of-use, key replacement, GPS recovery costs, the Uninsured Driver Fee (if Renter does not provide proof of insurance), and any other fees disclosed at booking or return.",
      "Renter must maintain a valid payment method for the entire rental period. Declined, reversed, or disputed charges do not relieve Renter of the underlying obligation to pay.",
    ],
  },
  {
    title: "5. INSURANCE REQUIREMENTS (CONTINUED)",
    paragraphs: RENTAL_AGREEMENT_EXTENDED_TERMS.insurance,
  },
  {
    // "5A" (not "5") because the printed PDF form already has its own Section 5 (Insurance).
    title: "5A. UNPAID BALANCES, DEFAULT & LEGAL REMEDIES",
    paragraphs: [
      "Upon return, early termination, or cancellation, Renter must pay all amounts owed in full. Any balance remaining unpaid after demand constitutes a default under this Agreement.",
      "Unpaid amounts continue to accrue until paid in full. To the extent permitted by applicable law, Renter is responsible for reasonable collection costs, court costs, and attorneys' fees incurred by Lessor in recovering amounts owed.",
      "If any balance remains unpaid, Lessor may pursue any remedies available under New Jersey law, including but not limited to: civil collection actions; filing in small claims or Superior Court in Hudson County; offset against the security deposit; reporting delinquent accounts to consumer reporting agencies where permitted by law; and recovery or repossession of the vehicle where lawfully permitted, without breach of the peace.",
      "Renter agrees that this Agreement is governed by the laws of the State of New Jersey. Venue for disputes arising from unpaid balances or breach lies in Hudson County, New Jersey, unless otherwise required by law.",
    ],
  },
  {
    title: "6. LIABILITY & DAMAGE RESPONSIBILITY (CONTINUED)",
    paragraphs: RENTAL_AGREEMENT_EXTENDED_TERMS.liability,
  },
  {
    title: "7. INDEMNIFICATION & HOLD HARMLESS (CONTINUED)",
    paragraphs: RENTAL_AGREEMENT_EXTENDED_TERMS.indemnification,
  },
  {
    title: "SECURITY & USE (SUPPLEMENTAL)",
    paragraphs: [
      `False, expired, or altered insurance proof is treated as no insurance: the $${UNINSURED_DRIVER_FEE_USD} Uninsured Driver Fee applies and Renter is fully liable for all damage and third-party claims. Permitting unauthorized drivers or using the vehicle in violation of the Prohibited Uses section may also void Renter's own insurance, and Renter remains fully liable regardless of insurance.`,
      "Tampering with, disabling, or removing GPS/telematics equipment is prohibited and may result in immediate termination, a penalty, and full liability for recovery costs.",
      "Initiating a payment chargeback or reversal without a bona fide billing error constitutes fraud; the disputed amount plus associated fees remain immediately due, and Lessor may terminate the rental and pursue legal remedies.",
    ],
  },
  ...RENTAL_AGREEMENT_ADDITIONAL_SECTIONS,
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
    "Renter authorizes Lessor to charge the payment method on file for all amounts owed under this Agreement, including extensions, late fees, mileage overage ($0.39/mile over 200/day), fuel, cleaning, tolls, parking or traffic violations, towing and impound fees, damage repairs, loss-of-use, key replacement ($350), GPS recovery costs, the Uninsured Driver Fee (if Renter does not provide proof of insurance), and fees disclosed at booking or return.",
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
      "Renter MUST carry their own valid, active auto insurance policy that covers the rented vehicle and meets at least New Jersey minimum requirements, and MUST provide proof of that coverage (insurance card or declarations page) before or at pickup. Next Gear Auto does not sell or provide insurance, collision damage waivers, or supplemental liability protection.",
      `If Renter does not provide valid, current proof of insurance, or the proof is false, expired, altered, or does not cover the vehicle, then (a) Renter owes a flat Uninsured Driver Fee of $${UNINSURED_DRIVER_FEE_USD} per rental, which is non-refundable and may be charged to the payment method on file, and (b) Renter is personally responsible, out of pocket, for any and all damage to or loss of the vehicle and all related costs and third-party claims, without limit and regardless of fault.`,
      ...RENTAL_AGREEMENT_EXTENDED_TERMS.insurance,
    ],
    emphasis: `Uninsured Driver Fee: $${UNINSURED_DRIVER_FEE_USD} per rental, plus full out-of-pocket responsibility for all damage.`,
  },
  {
    page: 2,
    title: "7. LIABILITY & DAMAGE RESPONSIBILITY",
    paragraphs: [
      "Renter is fully and completely responsible for ALL vehicle damage regardless of cause, fault, or insurance coverage. This includes but is not limited to: collision damage, theft, vandalism, weather damage, tire/rim/undercarriage damage, windshield damage, interior damage, lost or damaged keys ($350 replacement cost), towing and impound fees, storage charges, diminished vehicle value (up to $5,000), and loss-of-use charges (daily rental rate × days the vehicle is unavailable). Renter remains liable even if a third party or unauthorized driver caused the damage.",
      ...RENTAL_AGREEMENT_EXTENDED_TERMS.liability,
    ],
  },
  {
    page: 2,
    title: "8. INDEMNIFICATION & HOLD HARMLESS",
    paragraphs: [
      "Renter agrees to indemnify, defend, and hold harmless Next Gear Auto LLC, its owners, employees, and agents from and against any and all claims, demands, losses, liabilities, damages, costs, and expenses (including reasonable attorney fees) arising out of or related to Renter's use, operation, or possession of the vehicle during the rental period. This includes, without limitation, claims by third parties for bodily injury, property damage, or death resulting from any accident, incident, or occurrence involving the rented vehicle, regardless of fault.",
      ...RENTAL_AGREEMENT_EXTENDED_TERMS.indemnification,
    ],
  },
  {
    page: 2,
    title: "9. PROHIBITED USES",
    paragraphs: [
      "The following are strictly prohibited ($1,500 liquidated damages + full liability + immediate termination):",
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
  ...RENTAL_AGREEMENT_ADDITIONAL_SECTIONS.map((section) => ({ ...section, page: 3 as const })),
];

export function getInlineSectionsForPage(page: 2 | 3) {
  return RENTAL_AGREEMENT_INLINE_SECTIONS.filter((s) => s.page === page);
}

export const AGREEMENT_ESIGN_DISCLOSURE =
  "By signing electronically, you agree that your electronic signature is the legal equivalent of your manual signature on this Agreement, and that you consent to conduct this transaction electronically.";
