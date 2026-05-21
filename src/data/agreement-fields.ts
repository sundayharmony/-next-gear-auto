// Signature fields the renter must complete on the rental agreement PDF.
// Legal text should be reviewed by licensed counsel before production use.
export const AGREEMENT_SIGNATURE_FIELDS = [
  {
    id: "t35",
    label: "Renter Initials — Page 1 (Terms & Conditions)",
    description: "By initialing, you acknowledge vehicle condition, rental rates, and payment obligations on page 1.",
    isInitials: true,
  },
  {
    id: "t42",
    label: "GPS Tracking Acknowledgement Initials",
    description: "By initialing, you acknowledge and consent to GPS tracking during the rental period.",
    isInitials: true,
  },
  {
    id: "t43",
    label: "Renter Initials — Page 2 (Insurance & Liability)",
    description: "By initialing, you acknowledge insurance, liability, and unpaid balance terms on page 2.",
    isInitials: true,
  },
  {
    id: "t47",
    label: "Renter Full Signature",
    description: "Your full signature confirming agreement to all rental terms and conditions.",
    isInitials: false,
  },
  {
    id: "t57",
    label: "Renter Initials — Page 3 (Final Acknowledgement)",
    description: "By initialing, you confirm you have read and agree to all terms, including unpaid balance remedies.",
    isInitials: true,
  },
];
