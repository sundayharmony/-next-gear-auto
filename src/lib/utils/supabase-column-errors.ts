/** Postgres / PostgREST "column does not exist" — used for schema-drift fallbacks. */
export function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: string; message?: string };
  return anyErr.code === "42703" || /column\s+.+\s+does\s+not\s+exist/i.test(anyErr.message || "");
}
