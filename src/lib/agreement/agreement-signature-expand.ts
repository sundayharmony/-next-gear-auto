import { AGREEMENT_SIGNATURE_FIELDS, PRIMARY_AGREEMENT_SIGNATURE_ID } from "@/data/agreement-fields";
import type { AgreementSignatureData } from "@/lib/agreement/signed-agreement";

/** Map a single primary signature onto all PDF signature fields. */
export function expandAgreementSignatures(
  input: Record<string, unknown>,
): AgreementSignatureData {
  const primary =
    (typeof input[PRIMARY_AGREEMENT_SIGNATURE_ID] === "string" &&
      input[PRIMARY_AGREEMENT_SIGNATURE_ID].trim()) ||
    AGREEMENT_SIGNATURE_FIELDS.map((f) => input[f.id]).find(
      (v) => typeof v === "string" && v.trim(),
    ) ||
    null;

  if (!primary || typeof primary !== "string") {
    throw new Error("Primary signature is required");
  }

  const expanded: AgreementSignatureData = {};
  for (const field of AGREEMENT_SIGNATURE_FIELDS) {
    expanded[field.id as keyof AgreementSignatureData] = primary;
  }
  return expanded;
}
