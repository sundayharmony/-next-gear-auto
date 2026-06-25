"use client";

import { useRef } from "react";
import { Check, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { uploadBookingDocumentTemp } from "@/lib/bookings/upload-booking-document";
import { logger } from "@/lib/utils/logger";

export interface VerifyStepProps {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  idDocumentUrl: string | null;
  setIdDocumentUrl: (url: string | null) => void;
  uploadingId: boolean;
  setUploadingId: (uploading: boolean) => void;
  uploadError: string;
  setUploadError: (error: string) => void;
  idRequiredError: string;
  setIdRequiredError: (error: string) => void;
}

export function VerifyStep({
  uploadedFile,
  setUploadedFile,
  idDocumentUrl,
  setIdDocumentUrl,
  uploadingId,
  setUploadingId,
  uploadError,
  setUploadError,
  idRequiredError,
  setIdRequiredError,
}: VerifyStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasValidIdUpload = !!idDocumentUrl && !uploadingId;

  const handleFileUpload = async (file: File) => {
    setUploadError("");
    setIdRequiredError("");
    setUploadedFile(file);
    setUploadingId(true);

    try {
      const result = await uploadBookingDocumentTemp(file);
      if (result.ok) {
        setIdDocumentUrl(result.url);
        setIdRequiredError("");
      } else {
        setUploadError(result.error);
        setUploadedFile(null);
      }
    } catch (err) {
      logger.error("ID upload error:", err);
      setUploadError("Failed to upload ID document. Please try again.");
      setUploadedFile(null);
    }
    setUploadingId(false);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">ID Verification</h2>
        <p className="text-sm text-gray-500 mb-6">Upload your driver&apos;s license for verification.</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />

        {hasValidIdUpload || (uploadedFile && uploadingId) ? (
          <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6 text-center">
            <Check className="mx-auto h-10 w-10 text-green-500 mb-3" />
            <p className="text-sm font-medium text-green-700">
              {uploadingId ? "Uploading..." : "File uploaded successfully"}
            </p>
            {uploadedFile && (
              <p className="mt-1 text-xs text-gray-500">
                {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUploadedFile(null);
                  setIdDocumentUrl(null);
                  setIdRequiredError("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Replace File
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-purple-400 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("border-purple-500", "bg-purple-50");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("border-purple-500", "bg-purple-50");
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-purple-500", "bg-purple-50");
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload(file);
            }}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700">Upload Driver&apos;s License</p>
            <p className="mt-1 text-xs text-gray-400">
              Drag & drop or click to browse — JPG, PNG, WebP, or PDF (large photos are compressed automatically)
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose File
            </Button>
          </div>
        )}

        {uploadError && <p className="mt-3 text-sm text-red-600">{uploadError}</p>}

        {!hasValidIdUpload && !uploadingId && (
          <p className="mt-3 text-sm text-red-600">
            {idRequiredError || "Please upload a photo of your ID to continue"}
          </p>
        )}

        <p className="mt-4 text-xs text-gray-400">Your ID will be verified before or at pickup.</p>
      </CardContent>
    </Card>
  );
}
