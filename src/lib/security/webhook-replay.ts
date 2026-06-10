/**
 * Short-lived replay/idempotency guard for inbound webhooks.
 * Uses in-memory store (per-instance); pair with Upstash rate limits at the edge.
 */

const REPLAY_WINDOW_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 5000;

type ReplayEntry = { seenAt: number };

const seenKeys = new Map<string, ReplayEntry>();

function prune() {
  const now = Date.now();
  for (const [key, entry] of seenKeys) {
    if (now - entry.seenAt > REPLAY_WINDOW_MS) {
      seenKeys.delete(key);
    }
  }
  if (seenKeys.size > MAX_ENTRIES) {
    const sorted = [...seenKeys.entries()].sort((a, b) => a[1].seenAt - b[1].seenAt);
    for (const [key] of sorted.slice(0, Math.floor(seenKeys.size / 2))) {
      seenKeys.delete(key);
    }
  }
}

/** Reject timestamps outside the replay window (epoch ms). */
export function isWebhookTimestampFresh(
  timestampMs: number,
  windowMs = REPLAY_WINDOW_MS,
): boolean {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return false;
  const age = Math.abs(Date.now() - timestampMs);
  return age <= windowMs;
}

/**
 * Returns true when the idempotency key was already processed recently.
 * Call after auth passes; stores the key on first sight.
 */
export function isWebhookReplay(idempotencyKey: string): boolean {
  if (!idempotencyKey) return false;
  prune();
  if (seenKeys.has(idempotencyKey)) return true;
  seenKeys.set(idempotencyKey, { seenAt: Date.now() });
  return false;
}

export const WEBHOOK_REPLAY_WINDOW_MS = REPLAY_WINDOW_MS;
