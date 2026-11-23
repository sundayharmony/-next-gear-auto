"use client";

import React from "react";
import { Check, CheckCircle, Shield, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { uploadBookingDocumentTemp } from "@/lib/bookings/upload-booking-document";
import { UNINSURED_DRIVER_FEE_USD } from "@/lib/agreement/agreement-policy";
import { logger } from "@/lib/utils/logger";
import type { BookingExtra } from "@/lib/types";

export interface ExtrasStepProps {
  localExtras: BookingExtra[];
  onToggleExtra: (id: string) => void;
  insuranceProofUrl: string | null;
  setInsuranceProofUrl: (url: string | null) => void;
  setInsuranceProofFile: (file: File | null) => void;
  uploadingInsuranceProof: boolean;
  setUploadingInsuranceProof: (uploading: boolean) => void;
  insuranceUploadError: string;
  setInsuranceUploadError: (error: string) => void;
  uninsuredAck: boolean;
  setUninsuredAck: (acknowledged: boolean) => void;
}

export function ExtrasStep({
  localExtras,
  onToggleExtra,
  insuranceProofUrl,
  setInsuranceProofUrl,
  setInsuranceProofFile,
  uploadingInsuranceProof,
  setUploadingInsuranceProof,
  insuranceUploadError,
  setInsuranceUploadError,
  uninsuredAck,
  setUninsuredAck,
}: ExtrasStepProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Your Insurance</h2>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600" />
            <div className="text-sm text-gray-700">
              <p className="font-medium text-gray-900">Bring your own auto insurance policy.</p>
              <p className="mt-1">
                We don&apos;t sell insurance. Upload your proof of insurance (insurance card or declarations
                page). Without proof, a flat ${UNINSURED_DRIVER_FEE_USD} uninsured driver fee applies and you pay out of
                pocket for any and all damage to the vehicle.
              </p>
            </div>
          </div>
        </div>

        {insuranceProofUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700">Insurance proof uploaded</p>
              <p className="text-xs text-green-600">No uninsured driver fee will apply</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setInsuranceProofUrl(null);
                setInsuranceProofFile(null);
              }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-purple-300 bg-white px-4 py-3 transition-colors hover:border-purple-500 hover:bg-purple-50">
              <Upload className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-600">
                {uploadingInsuranceProof ? "Uploading..." : "Upload Proof of Insurance"}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.webp"
                disabled={uploadingInsuranceProof}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setInsuranceUploadError("");
                  setInsuranceProofFile(file);
                  setUploadingInsuranceProof(true);

                  try {
                    const result = await uploadBookingDocumentTemp(file);
                    if (!result.ok) {
                      setInsuranceUploadError(result.error);
                      setInsuranceProofFile(null);
                      setUploadingInsuranceProof(false);
                      return;
                    }
                    setInsuranceProofUrl(result.url);
                    setUninsuredAck(false);
                  } catch (err) {
                    logger.error("Insurance upload error:", err);
                    setInsuranceUploadError("Failed to upload insurance proof. Please try again.");
                    setInsuranceProofFile(null);
                    setUploadingInsuranceProof(false);
                    return;
                  }

                  setUploadingInsuranceProof(false);
                }}
              />
            </label>
            {insuranceUploadError && <p className="text-xs text-red-600">{insuranceUploadError}</p>}

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                checked={uninsuredAck}
                onChange={(e) => setUninsuredAck(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                I don&apos;t have proof of insurance right now. I understand a ${UNINSURED_DRIVER_FEE_USD} uninsured driver fee
                applies and that I will pay out of pocket for any and all damage to the vehicle.
              </span>
            </label>
          </>
        )}
      </section>

      {localExtras.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Add-On Extras</h2>
          <p className="text-sm text-gray-500">Enhance your rental with optional extras.</p>
          <div className="grid grid-cols-1 gap-3">
            {localExtras.map((extra) => (
              <Card
                key={extra.id}
                className={cn(
                  "cursor-pointer transition-all",
                  extra.selected ? "bg-purple-50 ring-2 ring-purple-600" : "hover:shadow-sm",
                )}
                onClick={() => onToggleExtra(extra.id)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                        extra.selected ? "border-purple-600 bg-purple-600" : "border-gray-300",
                      )}
                    >
                      {extra.selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{extra.name}</h3>
                      <p className="text-xs text-gray-500">{extra.description}</p>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <div className="font-semibold text-gray-900">${extra.pricePerDay}/day</div>
                    {extra.maxPrice && <div className="text-xs text-gray-400">max ${extra.maxPrice}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
