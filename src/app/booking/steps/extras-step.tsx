"use client";

import React, { useRef } from "react";
import { Check, CheckCircle, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { uploadBookingDocumentTemp } from "@/lib/bookings/upload-booking-document";
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
  setLocalExtras: React.Dispatch<React.SetStateAction<BookingExtra[]>>;
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
  setLocalExtras,
}: ExtrasStepProps) {
  const insuranceSectionRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Add-On Extras</h2>
      <p className="text-sm text-gray-500">Enhance your rental with optional extras.</p>
      <div className="grid grid-cols-1 gap-3">
        {localExtras.map((extra) => (
          <React.Fragment key={extra.id}>
            <Card
              className={cn(
                "cursor-pointer transition-all",
                extra.selected ? "ring-2 ring-purple-600 bg-purple-50" : "hover:shadow-sm"
              )}
              onClick={() => onToggleExtra(extra.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                      extra.selected ? "border-purple-600 bg-purple-600" : "border-gray-300"
                    )}
                  >
                    {extra.selected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{extra.name}</h3>
                      {extra.id === "e1" && (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{extra.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="font-semibold text-gray-900">${extra.pricePerDay}/day</div>
                  {extra.maxPrice && <div className="text-xs text-gray-400">max ${extra.maxPrice}</div>}
                </div>
              </CardContent>
            </Card>

            {extra.id === "e1" && (
              <div ref={insuranceSectionRef} className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Have your own insurance coverage?</p>
                <p className="text-xs text-gray-500 mb-3">
                  Upload proof of valid auto insurance to waive the $11.25/day coverage fee.
                </p>
                {insuranceProofUrl ? (
                  <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-700">Insurance proof uploaded</p>
                      <p className="text-xs text-green-600">Coverage charge has been removed</p>
                    </div>
                    <button
                      onClick={() => {
                        setInsuranceProofUrl(null);
                        setInsuranceProofFile(null);
                        setLocalExtras((prev) =>
                          prev.map((e) => (e.id === "e1" ? { ...e, selected: true } : e))
                        );
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-purple-300 bg-white px-4 py-3 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                    <Upload className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-purple-600 font-medium">
                      {uploadingInsuranceProof ? "Uploading..." : "Upload Insurance Proof"}
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
                        } catch (err) {
                          logger.error("Insurance upload error:", err);
                          setInsuranceUploadError("Failed to upload insurance proof. Please try again.");
                          setInsuranceProofFile(null);
                          setUploadingInsuranceProof(false);
                          return;
                        }

                        setLocalExtras((prev) =>
                          prev.map((e) => (e.id === "e1" ? { ...e, selected: false } : e))
                        );
                        setUploadingInsuranceProof(false);
                      }}
                    />
                  </label>
                )}
                {insuranceUploadError && <p className="mt-1 text-xs text-red-600">{insuranceUploadError}</p>}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
