// Signature fields embedded in the rental agreement PDF template.

// Legal text should be reviewed by licensed counsel before production use.

/** PDF form field ids → contract page (1–3). All receive the primary signature image at sign time. */
export const AGREEMENT_PDF_SIGNATURE_FIELD_IDS = [
  "t35",
  "t42",
  "t43",
  "t47",
  "t57",
] as const;

export const PRIMARY_AGREEMENT_SIGNATURE_ID = "t47";

export const AGREEMENT_PAGE_COUNT = 3;

export interface AgreementSignatureField {
  id: string;
  label: string;
  description: string;
  isInitials: boolean;
  /** Contract page (1–3) where this field appears */
  page: number;
  /** PDF AcroForm field name (for documentation) */
  pdfFieldId: string;
}

export const AGREEMENT_SIGNATURE_FIELDS: AgreementSignatureField[] = [
  {
    id: "t35",
    pdfFieldId: "t35",
    label: "Renter Signature — Page 1 (Terms & Conditions)",
    description: "Acknowledges vehicle condition, rental rates, and payment obligations on page 1.",
    isInitials: false,
    page: 1,
  },
  {
    id: "t42",
    pdfFieldId: "t42",
    label: "GPS Tracking Acknowledgement",
    description: "Confirms consent to GPS/telematics during the rental period.",
    isInitials: false,
    page: 2,
  },
  {
    id: "t43",
    pdfFieldId: "t43",
    label: "Renter Signature — Page 2 (Insurance & Liability)",
    description: "Acknowledges insurance, liability, and unpaid balance terms on page 2.",
    isInitials: false,
    page: 2,
  },
  {
    id: "t47",
    pdfFieldId: "t47",
    label: "Renter Full Signature",
    description: "Your full signature confirming agreement to all rental terms and conditions.",
    isInitials: false,
    page: 3,
  },
  {
    id: "t57",
    pdfFieldId: "t57",
    label: "Renter Signature — Page 3 (Final Acknowledgement)",
    description: "Confirms you have read and agree to all terms, including unpaid balance remedies.",
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

/** Customer flow: one primary signature is expanded server-side to all PDF fields. */
export function hasPrimaryAgreementSignature(
  signatures: Record<string, string | null | undefined>,
): boolean {
  return Boolean(signatures[PRIMARY_AGREEMENT_SIGNATURE_ID]);
}

export function getPageForStep(step: number): number {
  const field = AGREEMENT_SIGNATURE_FIELDS[step];
  return field?.page ?? 1;
}
