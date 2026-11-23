"use client";

import React, { useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";

interface RunResult {
  totalSigned?: number;
  processed?: number;
  reissued?: number;
  skipped?: number;
  failed?: number;
  remaining?: number;
  withoutStoredSignature?: number;
  error?: string;
}

export default function AdminAgreementsPage() {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<RunResult | null>(null);
  const [totals, setTotals] = useState({ reissued: 0, skipped: 0, failed: 0 });

  const run = async (dryRun: boolean) => {
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/reissue-agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, limit: 8 }),
      });
      const data: RunResult & { success?: boolean } = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        setLast({ error: data.error || "Request failed" });
      } else {
        setLast(data);
        if (!dryRun) {
          setTotals((t) => ({
            reissued: t.reissued + (data.reissued ?? 0),
            skipped: t.skipped + (data.skipped ?? 0),
            failed: t.failed + (data.failed ?? 0),
          }));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Re-issue signed agreements</h1>
        <p className="mt-1 text-sm text-gray-600">
          Rebuilds previously signed agreements in the current format using each customer&apos;s original
          signature. The original PDF is saved first (in the same storage folder, under
          &quot;original&quot;) and the new copy is marked as re-issued. Contracts without a stored signature
          are left as they are.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(true)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Count what is left
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(false)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Working..." : "Re-issue next 8"}
        </button>
      </div>

      {last?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{last.error}</p>}
      {last && !last.error && (
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-800">
          <p>Signed agreements on file: {last.totalSigned}</p>
          <p>Waiting to be re-issued: {last.remaining}</p>
          <p>Cannot be re-issued (no stored signature): {last.withoutStoredSignature}</p>
          {last.processed !== undefined && (
            <p className="mt-2">
              This run: {last.reissued} re-issued, {last.skipped} skipped, {last.failed} failed.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Session total: {totals.reissued} re-issued, {totals.skipped} skipped, {totals.failed} failed. Skipped
            contracts (the original could not be saved first) are left unchanged. Keep pressing the button
            until &quot;Waiting&quot; reaches 0.
          </p>
        </div>
      )}
    </div>
  );
}
