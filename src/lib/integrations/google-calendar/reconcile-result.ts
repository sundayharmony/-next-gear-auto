export type ReconcileResult = {
  upserted: number;
  deleted: number;
  skipped: number;
  errors: string[];
};

export function formatReconcileSummary(result: ReconcileResult): string {
  const base = `Sync complete — ${result.upserted} updated, ${result.deleted} removed, ${result.skipped} unchanged`;
  if (!result.errors.length) return base;
  const preview = result.errors.slice(0, 2).join("; ");
  const suffix = result.errors.length > 2 ? "…" : "";
  return `${base}. ${result.errors.length} item(s) failed: ${preview}${suffix}`;
}
