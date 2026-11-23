"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileWarning, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/components/admin/admin-shell";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { TicketRecord } from "./tickets-shared";

interface Item { key: string; section: string; label: string; status: "included" | "missing" | "manual"; note?: string }
interface Guidance {
  municipality: string;
  court: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null; hours?: string | null };
  notarization: string;
  deadlines: string | null;
  forms: { name: string; url: string | null }[];
  instructions: string[];
  links: { label: string; url: string }[];
  lastVerified: string;
  note: string | null;
}
interface Doc { id: string; kind: string; file_name: string; ticket_id: string | null; vehicle_id: string | null }

const STYLE: Record<Item["status"], { cls: string; text: string }> = {
  included: { cls: "bg-green-50 text-green-700 border-green-200", text: "Included" },
  manual: { cls: "bg-amber-50 text-amber-700 border-amber-200", text: "Upload needed" },
  missing: { cls: "bg-red-50 text-red-700 border-red-200", text: "Missing" },
};

export function TicketDisputePanel({ ticket }: { ticket: TicketRecord }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const busyRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<string>("citation");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const q = new URLSearchParams({ ticket_id: ticket.id });
      if (ticket.vehicleId) q.set("vehicle_id", ticket.vehicleId);
      const [s, e] = await Promise.all([
        adminFetch(`/api/admin/tickets/dispute-packet?id=${encodeURIComponent(ticket.id)}&mode=summary`),
        adminFetch(`/api/admin/tickets/evidence?${q}`),
      ]);
      const sj = await s.json();
      if (!s.ok || !sj.success) throw new Error(sj.message || "Could not load packet status");
      setItems(sj.checklist);
      setGuidance(sj.guidance);
      const ej = await e.json();
      setDocs(ej.success ? ej.documents : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load packet status");
    }
  }, [ticket.id, ticket.vehicleId]);

  useEffect(() => { void load(); }, [load, ticket.bookingId, ticket.vehicleId, ticket.municipality]);

  const download = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminFetch(`/api/admin/tickets/dispute-packet?id=${encodeURIComponent(ticket.id)}`, { timeoutMs: 60000 });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || "Could not build the packet");
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `NextGearAuto_DisputePacket_${(ticket.ticketNumber || ticket.id).replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10000);
      setMessage({ ok: true, text: "Packet downloaded. Review the checklist page before using it." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Could not build the packet" });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const pick = (kind: string) => { kindRef.current = kind; fileRef.current?.click(); };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const kind = kindRef.current;
    if (kind === "registration" && !ticket.vehicleId) {
      setMessage({ ok: false, text: "Link a vehicle to this ticket before uploading a registration." });
      return;
    }
    setUploading(kind);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      if (kind === "registration") fd.append("vehicleId", ticket.vehicleId || "");
      else fd.append("ticketId", ticket.id);
      const res = await adminFetch("/api/admin/tickets/evidence", { method: "POST", body: fd, timeoutMs: 60000 });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.message || "Upload failed");
      setMessage({ ok: true, text: "Document added." });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this document from the packet?")) return;
    const res = await adminFetch(`/api/admin/tickets/evidence?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) await load();
    else setMessage({ ok: false, text: "Could not remove the document." });
  };

  const missing = items?.filter((i) => i.status !== "included").length ?? 0;

  return (
    <AdminCard className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Dispute packet</h3>
          <p className="text-xs text-gray-500 mt-1">
            Compiles the signed agreement, renter ID, citation, registration and rental records into one PDF. It is evidence only; nothing is filed or sent for you.
          </p>
        </div>
        <Button onClick={download} disabled={busy || !items} className="w-full sm:w-auto">
          {busy ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Building packet...</>) : (<><Download className="h-4 w-4 mr-2" />Download Dispute Packet</>)}
        </Button>
      </div>

      {message && (
        <div role="status" className={`text-sm rounded-lg border px-3 py-2 ${message.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}
      {loadError && (
        <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 flex items-center justify-between gap-2">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
        </div>
      )}
      {!items && !loadError && (
        <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Checking documents...</p>
      )}

      {items && (
        <>
          {missing > 0 ? (
            <p className="text-sm text-amber-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{missing} item{missing === 1 ? "" : "s"} missing or needing upload. The packet can still be downloaded; gaps are flagged inside it.</p>
          ) : (
            <p className="text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />All documents are on file.</p>
          )}
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {items.map((i) => (
              <li key={i.key} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <span className="text-gray-900">{i.label}</span>
                  {i.status !== "included" && i.note && <p className="text-xs text-gray-500">{i.note}</p>}
                </div>
                <span className={`shrink-0 text-xs font-medium border rounded-full px-2 py-0.5 ${STYLE[i.status].cls}`}>{STYLE[i.status].text}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            {[["citation", "Add citation"], ["registration", "Add registration"], ["correspondence", "Add other evidence"]].map(([k, label]) => (
              <Button key={k} size="sm" variant="outline" disabled={!!uploading} onClick={() => pick(k)}>
                {uploading === k ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}{label}
              </Button>
            ))}
            <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          </div>
          {docs.length > 0 && (
            <ul className="text-sm space-y-1">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-gray-700">{d.kind === "registration" ? "Registration" : d.kind === "citation" ? "Citation" : "Evidence"}: {d.file_name}</span>
                  <button type="button" aria-label="Remove document" className="text-gray-400 hover:text-red-600" onClick={() => void remove(d.id)}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2"><FileWarning className="h-4 w-4 text-gray-500" />Municipality guidance{ticket.municipality ? `: ${ticket.municipality}` : ""}</h4>
        {!ticket.municipality ? (
          <p className="text-gray-500">Add a municipality to this ticket to see court contact details and filing guidance.</p>
        ) : !guidance ? (
          <p className="text-gray-500">No guidance is configured for {ticket.municipality}. Call that town&apos;s municipal court clerk and ask how a rental company identifies the renter (lessor statement). Guidance is edited in <code>src/lib/disputes/municipal-requirements.json</code>.</p>
        ) : (
          <div className="space-y-1 text-gray-700">
            <p>{guidance.court.name}{guidance.court.address ? `, ${guidance.court.address}` : ""}{guidance.court.phone ? `, ${guidance.court.phone}` : ""}</p>
            <p><span className="font-medium">Notarization:</span> {guidance.notarization}</p>
            <p><span className="font-medium">Deadline:</span> {guidance.deadlines || "Unverified. Ask the court clerk."}</p>
            {guidance.forms.map((f) => (
              <p key={f.name}><span className="font-medium">Form:</span> {f.url ? <a className="text-purple-700 underline" href={f.url} target="_blank" rel="noreferrer">{f.name}</a> : `${f.name} (no official link found)`}</p>
            ))}
            {guidance.instructions.length > 0 && (
              <ul className="list-disc pl-5 text-gray-600">{guidance.instructions.map((i) => <li key={i}>{i}</li>)}</ul>
            )}
            <p className="text-xs text-gray-500">Last verified {guidance.lastVerified}. Items marked unverified must be confirmed with the court before relying on them. This is not legal advice.</p>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
