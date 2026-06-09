export type TuroCancellationCandidate = {
  start_date: string;
  end_date: string;
  reason: string | null;
};

/** True when blocked_dates.reason contains the guest name from the cancellation email. */
export function reasonMatchesTuroGuest(
  reason: string | null | undefined,
  guestName: string | null | undefined
): boolean {
  if (!reason || !guestName) return false;
  const guest = guestName.trim().toLowerCase();
  if (!guest || guest === "your") return false;

  const normalized = reason.trim().toLowerCase();
  if (normalized.includes(`turo: ${guest}`)) return true;
  if (normalized.includes(`turo (${guest}`)) return true;

  const escaped = guest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`turo:?\\s*${escaped}\\b`, "i").test(reason);
}

/**
 * Pick the blocked_dates row to cancel. Prefers exact dates, then guest name in reason.
 * Refuses ambiguous overlap matches (prevents cancelling the wrong trip).
 */
export function pickTuroCancellationMatch(
  candidates: TuroCancellationCandidate[],
  startDate: string,
  endDate: string,
  guestName: string | null
): TuroCancellationCandidate | null {
  if (!candidates.length) return null;

  const exact = candidates.filter(
    (row) => row.start_date === startDate && row.end_date === endDate
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    if (!guestName) return null;
    const byGuest = exact.find((row) => reasonMatchesTuroGuest(row.reason, guestName));
    return byGuest ?? null;
  }

  if (guestName) {
    const byGuest = candidates.filter((row) =>
      reasonMatchesTuroGuest(row.reason, guestName)
    );
    if (byGuest.length === 1) return byGuest[0];
    if (byGuest.length > 1) {
      const exactGuest = byGuest.find(
        (row) => row.start_date === startDate && row.end_date === endDate
      );
      return exactGuest ?? null;
    }
  }

  if (candidates.length === 1) {
    const only = candidates[0];
    if (only.start_date === startDate && only.end_date === endDate) return only;
    if (guestName && reasonMatchesTuroGuest(only.reason, guestName)) return only;
  }

  return null;
}
