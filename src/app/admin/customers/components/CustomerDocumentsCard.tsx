"use client";

import {
  AlertCircle,
  CheckCircle2,
  Crop,
  FileText,
  Image as ImageIcon,
  Loader2,
  Shield,
  Upload,
  XCircle,
} from "lucide-react";
import { AdminCard, AdminSection } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/date-helpers";
import type { CustomerBookingRow, CustomerStats } from "../customer-detail-types";
import type { useCustomerDetail } from "../use-customer-detail";

type Detail = ReturnType<typeof useCustomerDetail>;

export function CustomerDocumentsCard({
  bookings,
  stats,
  detail,
}: {
  bookings: CustomerBookingRow[];
  stats: CustomerStats;
  detail: Pick<
    Detail,
    | "latestIdUrl"
    | "latestInsuranceUrl"
    | "safeLatestIdHref"
    | "safeLatestInsuranceHref"
    | "uploadingCustomerDoc"
    | "handleCustomerDocUpload"
    | "uploadDocType"
    | "setUploadDocType"
    | "selectedBookingForUpload"
    | "setSelectedBookingForUpload"
    | "uploadingDoc"
    | "handleDocumentUpload"
    | "openCropModal"
  >;
}) {
  return (
    <AdminSection title="Documents" description="ID, insurance, and rental agreements">
      <AdminCard>
        <div className="space-y-3">
          <DocRow icon={ImageIcon} label="ID document" uploaded={!!detail.latestIdUrl} href={detail.safeLatestIdHref} />
          <DocRow icon={Shield} label="Insurance proof" uploaded={!!detail.latestInsuranceUrl} href={detail.safeLatestInsuranceHref} />
          <DocRow
            icon={FileText}
            label="Rental agreement"
            uploaded={stats.hasSignedAgreement}
            pending={bookings.length > 0 && !stats.hasSignedAgreement}
            na={bookings.length === 0}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-2">Upload ID to profile</p>
          <label className="block">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => void detail.handleCustomerDocUpload(e)}
              disabled={detail.uploadingCustomerDoc}
              className="hidden"
              id="customer-doc-upload-input"
            />
            <Button
              type="button"
              onClick={() => document.getElementById("customer-doc-upload-input")?.click()}
              disabled={detail.uploadingCustomerDoc}
              size="sm"
              variant="outline"
              className="w-full text-xs"
            >
              {detail.uploadingCustomerDoc ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  {detail.latestIdUrl ? "Replace ID document" : "Upload driver license"}
                </>
              )}
            </Button>
          </label>
        </div>

        {bookings.length > 0 ? (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <p className="text-xs font-semibold text-gray-600">Upload to booking</p>
            <div className="flex gap-2 flex-wrap">
              <Select value={detail.uploadDocType} onChange={(e) => detail.setUploadDocType(e.target.value as "id_document" | "insurance_proof")}>
                <option value="id_document">ID document</option>
                <option value="insurance_proof">Insurance proof</option>
              </Select>
              <Select
                value={detail.selectedBookingForUpload || ""}
                onChange={(e) => detail.setSelectedBookingForUpload(e.target.value || null)}
                className="min-w-[140px] flex-1"
              >
                <option value="">Select booking</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.vehicleName || "Vehicle"} — {formatDate(b.pickup_date)}
                  </option>
                ))}
              </Select>
            </div>
            {detail.selectedBookingForUpload ? (
              <label className="block">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => void detail.handleDocumentUpload(e)}
                  disabled={detail.uploadingDoc}
                  className="hidden"
                  id="doc-upload-input"
                />
                <Button
                  type="button"
                  onClick={() => document.getElementById("doc-upload-input")?.click()}
                  disabled={detail.uploadingDoc}
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                >
                  {detail.uploadingDoc ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3 mr-1" /> Choose file
                    </>
                  )}
                </Button>
              </label>
            ) : null}
          </div>
        ) : null}

        {detail.latestIdUrl ? (
          <PreviewBlock
            label="ID preview"
            src={detail.latestIdUrl}
            href={detail.safeLatestIdHref}
            onCrop={() => void detail.openCropModal(detail.latestIdUrl!, "Driver License")}
          />
        ) : null}
        {detail.latestInsuranceUrl ? (
          <PreviewBlock
            label="Insurance preview"
            src={detail.latestInsuranceUrl}
            href={detail.safeLatestInsuranceHref}
            onCrop={() => void detail.openCropModal(detail.latestInsuranceUrl!, "Insurance Proof")}
          />
        ) : null}
      </AdminCard>
    </AdminSection>
  );
}

function DocRow({
  icon: Icon,
  label,
  uploaded,
  pending,
  na,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  uploaded?: boolean;
  pending?: boolean;
  na?: boolean;
  href?: string;
}) {
  const badge = uploaded ? (
    <Badge className="bg-green-100 text-green-700">
      <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded
    </Badge>
  ) : pending ? (
    <Badge className="bg-yellow-100 text-yellow-700">
      <AlertCircle className="h-3 w-3 mr-1" /> Pending
    </Badge>
  ) : na ? (
    <Badge className="bg-gray-100 text-gray-500">N/A</Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-500">
      <XCircle className="h-3 w-3 mr-1" /> Missing
    </Badge>
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-sm text-gray-600">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
      {href && uploaded ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {badge}
        </a>
      ) : (
        badge
      )}
    </div>
  );
}

function PreviewBlock({
  label,
  src,
  href,
  onCrop,
}: {
  label: string;
  src: string;
  href?: string;
  onCrop: () => void;
}) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400">{label}</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-purple-600" onClick={onCrop}>
          <Crop className="h-3 w-3 mr-1" /> Crop profile pic
        </Button>
      </div>
      <a href={href ?? "#"} target="_blank" rel="noopener noreferrer" className="block rounded-lg border overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="w-full max-h-40 object-contain bg-gray-50" />
      </a>
    </div>
  );
}
