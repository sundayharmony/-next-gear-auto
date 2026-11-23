/**
 * The optional "Insurance Coverage" add-on (id "e1") is no longer sold: renters bring their own
 * insurance (see agreement-policy.ts). The entry stays in data/extras.json so older bookings that
 * reference it still display and price correctly, but it must never be offered or accepted again.
 */
export const LEGACY_COVERAGE_EXTRA_ID = "e1";

export function isSellableExtra(extra: { id: string }): boolean {
  return extra.id !== LEGACY_COVERAGE_EXTRA_ID;
}

/** True for older bookings that purchased the now-discontinued coverage add-on. */
export function hadLegacyCoverageExtra(extras: unknown): boolean {
  if (!Array.isArray(extras)) return false;
  return extras.some((e) => {
    if (e === LEGACY_COVERAGE_EXTRA_ID) return true;
    if (typeof e !== "object" || e === null) return false;
    const extra = e as { id?: unknown; selected?: unknown };
    return extra.id === LEGACY_COVERAGE_EXTRA_ID && extra.selected !== false;
  });
}
