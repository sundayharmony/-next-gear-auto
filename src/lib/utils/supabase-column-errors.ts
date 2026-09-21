/** Postgres / PostgREST "column does not exist" — used for schema-drift fallbacks. */
export function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: string; message?: string };
  const message = anyErr.message || "";
  return (
    anyErr.code === "42703" ||
    anyErr.code === "PGRST204" ||
    /column\s+.+\s+does\s+not\s+exist/i.test(message) ||
    /could not find the '.+' column of '.+' in the schema cache/i.test(message)
  );
}

export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: string; message?: string };
  return (
    anyErr.code === "42P01" ||
    /relation\s+.+\s+does\s+not\s+exist/i.test(anyErr.message || "")
  );
}

/** Optional cleanup can skip missing tables/columns without aborting the parent action. */
export function isSkippableSchemaError(error: unknown): boolean {
  return isMissingColumnError(error) || isMissingRelationError(error);
}
