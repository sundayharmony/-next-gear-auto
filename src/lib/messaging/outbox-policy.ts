export type OutboxDecision = "retry" | "dead";

export function isTransientNotificationError(error: unknown): boolean {
  const code = (error as { code?: string })?.code || "";
  const statusCode = (error as { statusCode?: number })?.statusCode || 0;
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EHOSTUNREACH" ||
    code === "ECONNRESET" ||
    statusCode === 429 ||
    statusCode >= 500
  );
}

export function chooseOutboxDecision(error: unknown, attempt: number, maxAttempts: number): OutboxDecision {
  if (!isTransientNotificationError(error)) return "dead";
  if (attempt >= maxAttempts) return "dead";
  return "retry";
}
