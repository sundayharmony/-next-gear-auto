import seed from "./municipal-requirements.json";

/** Per-municipality requirements. Edit municipal-requirements.json to update; no code change needed. */
export interface MunicipalRequirement {
  id: string;
  municipality: string;
  aliases: string[];
  court: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null; hours?: string | null };
  authority_note?: string | null;
  ticket_categories: string[];
  forms: { name: string; url: string | null }[];
  supporting_documents: string[];
  notarization: "required" | "may_be_required" | "not_stated" | "unverified" | string;
  deadlines?: string | null;
  instructions: string[];
  links: { label: string; url: string }[];
  contact_notes?: string | null;
  last_verified: string;
  verified_fields_note?: string | null;
}

export const MUNICIPAL_REQUIREMENTS = seed as unknown as MunicipalRequirement[];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export function findMunicipalRequirement(municipality: string | null | undefined): MunicipalRequirement | null {
  const key = norm(municipality || "");
  if (!key) return null;
  return (
    MUNICIPAL_REQUIREMENTS.find(
      (m) => norm(m.municipality) === key || m.aliases.some((a) => norm(a) === key),
    ) ?? null
  );
}

/** Notarization wording shown to staff. Never states more than what was verified. */
export function notarizationLabel(n: string): string {
  switch (n) {
    case "required":
      return "Notarized statement required";
    case "may_be_required":
      return "Notarization may be required";
    case "not_stated":
      return "Notarization not stated by the court";
    default:
      return "Notarization requirement unverified: confirm with the court clerk";
  }
}
