/** Shared allowlist for staff message file uploads (API + client validation). */

export const STAFF_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const STAFF_ATTACHMENT_RULES: ReadonlyArray<{ mime: string; exts: readonly string[] }> = [
  { mime: "image/jpeg", exts: ["jpg", "jpeg"] },
  { mime: "image/png", exts: ["png"] },
  { mime: "image/webp", exts: ["webp"] },
  { mime: "image/gif", exts: ["gif"] },
  { mime: "application/pdf", exts: ["pdf"] },
  { mime: "text/plain", exts: ["txt"] },
  { mime: "text/csv", exts: ["csv"] },
  { mime: "application/msword", exts: ["doc"] },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    exts: ["docx"],
  },
  { mime: "application/vnd.ms-excel", exts: ["xls"] },
  {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    exts: ["xlsx"],
  },
  { mime: "application/vnd.ms-powerpoint", exts: ["ppt"] },
  {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    exts: ["pptx"],
  },
];

export const STAFF_ATTACHMENT_ALLOWED_MIMES = new Set(STAFF_ATTACHMENT_RULES.map((r) => r.mime));

export function staffAttachmentExtAllowedForMime(mime: string, ext: string): boolean {
  const rule = STAFF_ATTACHMENT_RULES.find((r) => r.mime === mime);
  return rule ? rule.exts.includes(ext) : false;
}

export function staffAttachmentPrimaryExtForMime(mime: string): string {
  const rule = STAFF_ATTACHMENT_RULES.find((r) => r.mime === mime);
  return rule?.exts[0] ?? "bin";
}

/** Comma-separated list for HTML `accept` on file inputs. */
export const STAFF_ATTACHMENT_ACCEPT_ATTR = [...STAFF_ATTACHMENT_ALLOWED_MIMES].join(",");
