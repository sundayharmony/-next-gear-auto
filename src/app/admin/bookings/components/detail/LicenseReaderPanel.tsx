"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScanLine, Upload, Check, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { isAllowedExternalHref } from "@/lib/utils/safe-url";
import { parseAamvaBarcode, type ParsedLicense } from "@/lib/license/aamva";
import { readLicenseBarcode } from "@/lib/license/decode-barcode";

interface Props {
  bookingId: string;
  /** Changes when a new front/back photo is uploaded so the panel reloads. */
  frontUrl?: string | null;
  backUrl?: string | null;
  agreementSigned: boolean;
}

interface FormState {
  dob: string;
  licenseNumber: string;
  licenseState: string;
  expires: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY: FormState = {
  dob: "",
  licenseNumber: "",
  licenseState: "",
  expires: "",
  addressLine: "",
  city: "",
  state: "",
  zip: "",
};

function fromParsed(p: ParsedLicense): FormState {
  return {
    dob: p.dob ?? "",
    licenseNumber: p.licenseNumber ?? "",
    licenseState: p.licenseState ?? "",
    expires: p.expires ?? "",
    addressLine: p.addressLine ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    zip: p.zip ?? "",
  };
}

function normalizeName(v: string) {
  return v.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Staff tool: read the barcode on the back-of-license photo, check the details against the photos,
 * and save them to the customer's profile. Nothing is saved until staff press Confirm, and a
 * signed agreement is rebuilt afterwards so the PDF prints the confirmed details.
 */
export function LicenseReaderPanel({ bookingId, frontUrl, backUrl, agreementSigned }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saved, setSaved] = useState<FormState | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [licenseName, setLicenseName] = useState<string>("");
  const [front, setFront] = useState<string | null>(frontUrl ?? null);
  const [back, setBack] = useState<string | null>(backUrl ?? null);
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(`/api/admin/license-identity?bookingId=${encodeURIComponent(bookingId)}`);
      const data = await res.json();
      if (!res.ok || !data.success) return;
      setCustomerName(data.customerName ?? "");
      setFront(data.frontUrl ?? null);
      setBack(data.backUrl ?? null);
      const id = data.identity;
      const loaded: FormState = {
        dob: id?.dob ?? "",
        licenseNumber: id?.licenseNumber ?? "",
        licenseState: id?.licenseState ?? "",
        expires: id?.licenseExpires ?? "",
        addressLine: id?.addressLine ?? "",
        city: "",
        state: "",
        zip: "",
      };
      if (id?.cityStateZip) {
        const m = /^(.*?),?\s+([A-Za-z]{2})\s+(\S+)$/.exec(id.cityStateZip);
        if (m) {
          loaded.city = m[1];
          loaded.state = m[2];
          loaded.zip = m[3];
        }
      }
      setForm(loaded);
      setSaved(loaded.licenseNumber || loaded.dob ? loaded : null);
    } catch {
      // The form still works for manual entry.
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load, frontUrl, backUrl]);

  const applyBarcode = async (blob: Blob) => {
    setBusy("read");
    setMessage(null);
    try {
      const result = await readLicenseBarcode(blob);
      if (result.status === "unsupported") {
        setMessage({
          kind: "warn",
          text: "This browser cannot read barcodes automatically (use Chrome or Edge). Type the details in from the photos instead.",
        });
      } else if (result.status === "bad_file") {
        setMessage({ kind: "error", text: result.message });
      } else if (result.status === "not_found") {
        setMessage({
          kind: "warn",
          text: "No barcode was found in that photo. Try a sharper, well-lit photo of the back, or type the details in.",
        });
      } else {
        const parsed = parseAamvaBarcode(result.text);
        if (!parsed) {
          setMessage({ kind: "warn", text: "A barcode was found but it is not a driver's license barcode." });
        } else {
          setForm(fromParsed(parsed));
          setLicenseName([parsed.firstName, parsed.lastName].filter(Boolean).join(" "));
          setMessage({ kind: "ok", text: "Barcode read. Check each field against the photos, then confirm." });
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const readStoredBack = async () => {
    if (!back) return;
    setBusy("read");
    try {
      const res = await fetch(back);
      if (!res.ok) throw new Error("fetch failed");
      await applyBarcode(await res.blob());
    } catch {
      setBusy(null);
      setMessage({ kind: "error", text: "Could not open the stored back photo." });
    }
  };

  const save = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const res = await adminFetch("/api/admin/license-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setMessage({ kind: "error", text: data.error || "Could not save." });
        return;
      }
      setSaved(form);
      setMessage({
        kind: "ok",
        text: data.agreementUpdated
          ? "Saved to the customer profile. The signed agreement was updated with these details."
          : agreementSigned
            ? "Saved to the customer profile. The signed agreement could not be refreshed automatically."
            : "Saved to the customer profile. It will print on the agreement when it is signed.",
      });
    } finally {
      setBusy(null);
    }
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const nameMismatch =
    licenseName && customerName && !normalizeName(customerName).includes(normalizeName(licenseName.split(" ").slice(-1)[0] ?? ""));
  const dirty = !saved || JSON.stringify(saved) !== JSON.stringify(form);

  const photo = (url: string | null, label: string) => {
    const href = url ? isAllowedExternalHref(url) : null;
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="block">
            {/\.pdf($|\?)/i.test(href) ? (
              <span className="text-sm text-blue-600">Open PDF</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={href} alt={label} className="h-28 w-full rounded-lg border border-gray-200 object-cover" />
            )}
          </a>
        ) : (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
            Not uploaded
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ScanLine className="h-4 w-4" />
        License details
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-normal text-green-700">
            <Check className="h-3 w-3" /> On customer profile
          </span>
        )}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {photo(front, "Front")}
        {photo(back, "Back")}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!back || busy !== null}
          onClick={readStoredBack}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "read" ? "Reading..." : "Read barcode from back photo"}
        </button>
        <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void applyBarcode(file);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <span className="inline-flex items-center gap-1">
            <Upload className="h-3 w-3" /> Read from a photo on this device
          </span>
        </label>
      </div>
      {!back && (
        <p className="text-xs text-gray-500">
          Upload the back of the license above to read its barcode, or type the details in from the front photo.
        </p>
      )}

      {message && (
        <p
          className={`flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs ${
            message.kind === "ok"
              ? "bg-green-50 text-green-800"
              : message.kind === "warn"
                ? "bg-amber-50 text-amber-800"
                : "bg-red-50 text-red-700"
          }`}
        >
          {message.kind !== "ok" && <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />}
          {message.text}
        </p>
      )}
      {nameMismatch && (
        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          Name on the license ({licenseName}) does not match the booking name ({customerName}). Check before saving.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Input label="Date of birth" type="date" value={form.dob} onChange={set("dob")} />
        <Input label="License expires" type="date" value={form.expires} onChange={set("expires")} />
        <Input label="License number" value={form.licenseNumber} onChange={set("licenseNumber")} />
        <Input label="Issuing state" maxLength={2} value={form.licenseState} onChange={set("licenseState")} />
        <div className="col-span-2">
          <Input label="Street address" value={form.addressLine} onChange={set("addressLine")} />
        </div>
        <Input label="City" value={form.city} onChange={set("city")} />
        <div className="grid grid-cols-2 gap-2">
          <Input label="State" maxLength={2} value={form.state} onChange={set("state")} />
          <Input label="ZIP" value={form.zip} onChange={set("zip")} />
        </div>
      </div>

      <button
        type="button"
        disabled={busy !== null || !dirty || (!form.licenseNumber && !form.dob)}
        onClick={save}
        className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy === "save" ? "Saving..." : "Confirm and save to customer profile"}
      </button>
    </div>
  );
}
