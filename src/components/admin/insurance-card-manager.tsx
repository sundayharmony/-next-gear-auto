"use client";

import React, { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Upload, X } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { compressImage } from "@/lib/utils/compress-image";
import { StaffInlineOverlay } from "@/components/staff/staff-overlay";

const MAX_INSURANCE_CARDS = 4;

type InsuranceCardManagerProps = {
  vehicleId: string | "new";
  images: string[];
  onImagesChange: (images: string[]) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export function InsuranceCardManager({
  vehicleId,
  images,
  onImagesChange,
  onError,
  disabled = false,
}: InsuranceCardManagerProps) {
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [confirmRemoveUrl, setConfirmRemoveUrl] = useState<string | null>(null);

  const isNew = vehicleId === "new";

  const uploadOne = async (raw: File): Promise<string | null> => {
    let file = raw;
    if (raw.type !== "image/svg+xml") {
      try {
        file = await compressImage(raw, 4, 2048, 0.8);
      } catch {
        return null;
      }
    }

    const formData = new FormData();
    formData.append("file", file);
    if (!isNew) {
      formData.append("vehicleId", vehicleId);
    }

    const res = await adminFetch("/api/admin/vehicles/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || typeof data.url !== "string") {
      return null;
    }
    return data.url as string;
  };

  const handleFiles = useCallback(
    async (rawFiles: File[]) => {
      const imageFiles = rawFiles.filter((f) => f.type.startsWith("image/"));
      if (!imageFiles.length) {
        onError?.("Only image files are accepted.");
        return;
      }

      const remaining = MAX_INSURANCE_CARDS - images.length;
      if (remaining <= 0) {
        onError?.(`Maximum ${MAX_INSURANCE_CARDS} insurance card images allowed`);
        return;
      }

      const toUpload = imageFiles.slice(0, remaining);
      setBusy(true);

      let newImages = [...images];
      let failed = 0;

      for (const file of toUpload) {
        const url = await uploadOne(file);
        if (url) {
          newImages = [...newImages, url];
        } else {
          failed++;
        }
      }

      onImagesChange(newImages);
      setBusy(false);

      if (failed > 0) {
        onError?.(`${failed} of ${toUpload.length} upload(s) failed`);
      }
    },
    [images, onImagesChange, onError, vehicleId, isNew]
  );

  const handleRemove = useCallback(async () => {
    const url = confirmRemoveUrl;
    setConfirmRemoveUrl(null);
    if (!url) return;

    const next = images.filter((u) => u !== url);
    onImagesChange(next);

    await adminFetch("/api/admin/vehicles/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => undefined);
  }, [confirmRemoveUrl, images, onImagesChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Insurance Card Images
        </span>
        {images.length > 0 && (
          <span className="text-xs text-gray-500">
            ({images.length}/{MAX_INSURANCE_CARDS})
          </span>
        )}
        {busy && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" aria-hidden />
        )}
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, idx) => (
            <div
              key={url}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl border border-gray-200 overflow-hidden bg-gray-50"
            >
              <button
                type="button"
                onClick={() => setPreviewIndex(idx)}
                className="absolute inset-0 z-0"
                aria-label={`Preview insurance card ${idx + 1}`}
              >
                <img
                  src={url}
                  alt={`Insurance card ${idx + 1}`}
                  loading="lazy"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='10' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
                  }}
                />
              </button>
              <div className="absolute left-1 top-1 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                #{idx + 1}
              </div>
              <button
                type="button"
                onClick={() => setConfirmRemoveUrl(url)}
                disabled={disabled || busy}
                aria-label="Remove insurance card"
                className="absolute top-1 right-1 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 disabled:opacity-40"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_INSURANCE_CARDS && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !busy) setDragOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (disabled || busy) return;
            void handleFiles(Array.from(e.dataTransfer.files));
          }}
          className={`cursor-pointer block rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
            dragOver
              ? "border-purple-500 bg-purple-50"
              : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
          } ${disabled || busy ? "opacity-60 pointer-events-none" : ""}`}
        >
          <Upload className="h-6 w-6 mx-auto mb-1 text-gray-400" />
          <p className="text-sm text-gray-600">
            {busy ? "Uploading..." : "Upload insurance card image"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Front and back of insurance card
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={disabled || busy}
            onChange={(e) => {
              void handleFiles(Array.from(e.target.files || []));
              e.target.value = "";
            }}
            className="hidden"
          />
        </label>
      )}

      <StaffInlineOverlay
        open={!!confirmRemoveUrl}
        onClose={() => setConfirmRemoveUrl(null)}
        ariaLabel="Remove insurance card confirmation"
        className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg space-y-3"
      >
        <h4 className="font-semibold text-gray-900">Remove this image?</h4>
        <p className="text-sm text-gray-600">The file will be deleted. This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            onClick={() => setConfirmRemoveUrl(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
            onClick={() => void handleRemove()}
          >
            Remove
          </button>
        </div>
      </StaffInlineOverlay>

      <StaffInlineOverlay
        open={previewIndex !== null && !!images[previewIndex]}
        onClose={() => setPreviewIndex(null)}
        backdropClassName="bg-black/80"
        elevated
        ariaLabel="Insurance card preview"
        className="relative flex w-full max-w-full items-center justify-center"
      >
        <button
          type="button"
          className="absolute right-2 top-2 text-white rounded-full bg-black/50 p-2 hover:bg-black/70 sm:right-4 sm:top-4"
          onClick={() => setPreviewIndex(null)}
          aria-label="Close preview"
        >
          <X className="h-5 w-5" />
        </button>
        {previewIndex !== null && images.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-2 text-white rounded-full bg-black/50 p-2 hover:bg-black/70 sm:left-4"
              onClick={() => setPreviewIndex((previewIndex - 1 + images.length) % images.length)}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              className="absolute right-2 text-white rounded-full bg-black/50 p-2 hover:bg-black/70 sm:right-4"
              onClick={() => setPreviewIndex((previewIndex + 1) % images.length)}
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        {previewIndex !== null && images[previewIndex] ? (
          <img
            src={images[previewIndex]}
            alt=""
            className="max-h-[85vh] max-w-full object-contain rounded-lg"
          />
        ) : null}
        {previewIndex !== null ? (
          <p className="absolute bottom-4 text-white text-sm">
            {previewIndex + 1} / {images.length}
          </p>
        ) : null}
      </StaffInlineOverlay>
    </div>
  );
}
