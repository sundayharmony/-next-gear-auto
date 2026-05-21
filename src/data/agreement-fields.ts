// Signature fields the renter must complete on the rental agreement PDF.
// Legal text should be reviewed by licensed counsel before production use.

export const AGREEMENT_PAGE_COUNT = 3;

export interface AgreementSignatureField {
  id: string;
  label: string;
  description: string;
  isInitials: boolean;
  /** Contract page (1–3) where this field appears */
  page: number;
}

export const AGREEMENT_SIGNATURE_FIELDS: AgreementSignatureField[] = [
  {
    id: "t35",
    label: "Renter Signature — Page 1 (Terms & Conditions)",
    description: "By signing, you acknowledge vehicle condition, rental rates, and payment obligations on page 1.",
    isInitials: false,
    page: 1,
  },
  {
    id: "t42",
    label: "GPS Tracking Acknowledgement Signature",
    description: "By signing, you acknowledge and consent to GPS tracking during the rental period.",
    isInitials: false,
    page: 2,
  },
  {
    id: "t43",
    label: "Renter Signature — Page 2 (Insurance & Liability)",
    description: "By signing, you acknowledge insurance, liability, and unpaid balance terms on page 2.",
    isInitials: false,
    page: 2,
  },
  {
    id: "t47",
    label: "Renter Full Signature",
    description: "Your full signature confirming agreement to all rental terms and conditions.",
    isInitials: false,
    page: 3,
  },
  {
    id: "t57",
    label: "Renter Signature — Page 3 (Final Acknowledgement)",
    description: "By signing, you confirm you have read and agree to all terms, including unpaid balance remedies.",
    isInitials: false,
    page: 3,
  },
];

export function getFieldsForPage(page: number): AgreementSignatureField[] {
  return AGREEMENT_SIGNATURE_FIELDS.filter((f) => f.page === page);
}

export function isPageComplete(
  page: number,
  signatures: Record<string, string | null | undefined>,
): boolean {
  return getFieldsForPage(page).every((f) => Boolean(signatures[f.id]));
}

export function getPageForStep(step: number): number {
  const field = AGREEMENT_SIGNATURE_FIELDS[step];
  return field?.page ?? 1;
}
