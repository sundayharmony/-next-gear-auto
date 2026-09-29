import { createHash } from "crypto";
import {
  RENTAL_AGREEMENT_INLINE_SECTIONS,
  RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS,
} from "@/lib/agreement/rental-agreement-terms";

/** Bump when legal/business terms change; stored on signed bookings. */
export const AGREEMENT_VERSION = "2026-03-29";

export function computeAgreementContentHash(): string {
  const payload = JSON.stringify({
    version: AGREEMENT_VERSION,
    inline: RENTAL_AGREEMENT_INLINE_SECTIONS,
    supplement: RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
