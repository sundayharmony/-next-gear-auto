/** Sentinel `ownerId` value in admin assignment UI and PATCH body. */
export const COMPANY_OWNED_OWNER_ID = "__company__";

export function isCompanyOwnedOwnerId(ownerId: unknown): boolean {
  return ownerId === COMPANY_OWNED_OWNER_ID;
}
