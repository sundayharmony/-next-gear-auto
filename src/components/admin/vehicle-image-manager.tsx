"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  Star,
  Upload,
  X,
} from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { compressImage } from "@/lib/utils/compress-image";
import { dedupeVehicleImageUrls, MAX_VEHICLE_IMAGES } from "@/lib/admin/vehicle-images";
import { logger } from "@/lib/utils/logger";

type VehicleImageManagerProps = {
  vehicleId: string | "new";
  images: string[];
  onImagesChange: (images: string[]) => void;
  onSaved?: (images: string[]) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

type UploadSlot = {
  id: string;
  name: string;
  status: "uploading" | "error";
  message?: string;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

function SortableImageTile({
  url,
  index,
  disabled,
  busy,
  onRemove,
  onMakePrimary,
  onPreview,
}: {
  url: string;
  index: number;
  disabled?: boolean;
  busy?: boolean;
  onRemove: () => void;
  onMakePrimary: () => void;
  onPreview: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url, disabled: disabled || busy });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl border overflow-hidden bg-gray-50 ${
        isDragging
          ? "opacity-50 border-purple-300 z-10"
          : "border-gray-200"
      }`}
    >
      <button
        type="button"
        onClick={onPreview}
        className="absolute inset-0 z-0"
        aria-label={`Preview image ${index + 1}`}
      >
        <img
          src={url}
          alt={`Vehicle ${index + 1}`}
          loading="lazy"
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
          }}
        />
      </button>

      <div
        className="absolute left-1 top-1 z-10 flex items-center gap-0.5 rounded bg-black/70 px-1 py-0.5 text-[10px] font-semibold text-white cursor-grab active:cursor-grabbing touch-manipulation"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <GripVertical className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        {index === 0 ? "Primary" : `#${index + 1}`}
      </div>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMakePrimary();
          }}
          disabled={disabled || busy}
          className="absolute left-1 bottom-1 z-10 rounded bg-white/90 px-1 py-0.5 text-[10px] font-medium text-gray-800 hover:bg-white disabled:opacity-40"
          title="Make primary"
        >
          <Star className="h-3 w-3 inline" />
        </button>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={disabled || busy}
        aria-label="Remove image"
        className="absolute top-1 right-1 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 disabled:opacity-40"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function VehicleImageManager({
  vehicleId,
  images,
  onImagesChange,
  onSaved,
  onError,
  disabled = false,
}: VehicleImageManagerProps) {
  const [busy, setBusy] = useState(false);
  const [dragOverUpload, setDragOverUpload] = useState(false);
  const [uploadSlots, setUploadSlots] = useState<UploadSlot[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [confirmRemoveUrl, setConfirmRemoveUrl] = useState<string | null>(null);

  const isNew = vehicleId === "new";
  const sortedIds = useMemo(() => images, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const persistImages = useCallback(
    async (nextImages: string[], previousImages: string[]) => {
      if (isNew) {
        onImagesChange(nextImages);
        return true;
      }

      onImagesChange(nextImages);
      setBusy(true);
      try {
        const res = await adminFetch(
          `/api/admin/vehicles/${encodeURIComponent(vehicleId)}/images`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: nextImages }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          onImagesChange(previousImages);
          onError?.(data.message || data.error || "Failed to save image order");
          return false;
        }
        const saved = (data.images as string[]) || nextImages;
        onImagesChange(saved);
        onSaved?.(saved);
        return true;
      } catch {
        onImagesChange(previousImages);
        onError?.("Network error — could not save images");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [isNew, vehicleId, onImagesChange, onSaved, onError]
  );

  const applyImages = useCallback(
    async (nextImages: string[]) => {
      const deduped = dedupeVehicleImageUrls(nextImages);
      if (deduped.length > MAX_VEHICLE_IMAGES) {
        onError?.(`Maximum ${MAX_VEHICLE_IMAGES} images allowed`);
        return false;
      }
      return persistImages(deduped, images);
    },
    [images, onError, persistImages]
  );

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
    if (data.warning) {
      onError?.(data.warning);
    }
    return data.url as string;
  };

  const handleFiles = async (rawFiles: File[]) => {
    const imageFiles = rawFiles.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) {
      onError?.("Only image files are accepted.");
      return;
    }

    const remaining = MAX_VEHICLE_IMAGES - images.length;
    if (remaining <= 0) {
      onError?.(`Maximum ${MAX_VEHICLE_IMAGES} images allowed`);
      return;
    }

    const toUpload = imageFiles.slice(0, remaining);
    if (toUpload.length < imageFiles.length) {
      onError?.(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added`);
    }

    const slots: UploadSlot[] = toUpload.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      status: "uploading",
    }));
    setUploadSlots(slots);

    const previousImages = images;
    let working = [...images];
    let failed = 0;

    await mapWithConcurrency(toUpload, 3, async (file, index) => {
      const url = await uploadOne(file);
      if (!url) {
        failed++;
        setUploadSlots((prev) =>
          prev.map((s, i) =>
            i === index
              ? { ...s, status: "error", message: "Upload failed" }
              : s
          )
        );
        return;
      }
      if (!working.includes(url)) {
        working = [...working, url];
        if (!isNew) {
          const ok = await persistImages(working, previousImages);
          if (!ok) {
            failed++;
            await adminFetch("/api/admin/vehicles/upload", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            }).catch((err) =>
              logger.error("Failed to clean up after failed PATCH:", err)
            );
            working = working.filter((u) => u !== url);
          }
        } else {
          onImagesChange(working);
        }
      }
    });

    setUploadSlots([]);
    if (failed > 0) {
      onError?.(
        `${failed} of ${toUpload.length} image${toUpload.length > 1 ? "s" : ""} failed`
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.indexOf(String(active.id));
    const newIndex = images.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    await applyImages(arrayMove(images, oldIndex, newIndex));
  };

  const handleRemoveConfirmed = async () => {
    const url = confirmRemoveUrl;
    setConfirmRemoveUrl(null);
    if (!url) return;

    const next = images.filter((u) => u !== url);
    const ok = await applyImages(next);
    if (!ok) return;

    await adminFetch("/api/admin/vehicles/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch((err) => logger.error("Failed to remove image from storage:", err));
  };

  const handleMakePrimary = async (index: number) => {
    if (index <= 0) return;
    await applyImages(arrayMove(images, index, 0));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Images
        </span>
        {images.length > 0 && (
          <span className="text-xs text-gray-500">
            ({images.length} — drag to reorder; first is listing primary)
          </span>
        )}
        {busy && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" aria-hidden />
        )}
      </div>

      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => void handleDragEnd(e)}
        >
          <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {images.map((url, idx) => (
                <SortableImageTile
                  key={url}
                  url={url}
                  index={idx}
                  disabled={disabled}
                  busy={busy}
                  onRemove={() => setConfirmRemoveUrl(url)}
                  onMakePrimary={() => void handleMakePrimary(idx)}
                  onPreview={() => setPreviewIndex(idx)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {uploadSlots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadSlots.map((slot) => (
            <div
              key={slot.id}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center p-2 text-center"
            >
              {slot.status === "uploading" ? (
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              ) : (
                <span className="text-xs text-red-600">{slot.message}</span>
              )}
              <span className="text-[10px] text-gray-500 mt-1 truncate w-full">
                {slot.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !busy) setDragOverUpload(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOverUpload(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverUpload(false);
          if (disabled || busy) return;
          void handleFiles(Array.from(e.dataTransfer.files));
        }}
        className={`cursor-pointer block rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
          dragOverUpload
            ? "border-purple-500 bg-purple-50"
            : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
        } ${disabled || busy ? "opacity-60 pointer-events-none" : ""}`}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          {busy || uploadSlots.length > 0
            ? "Saving images..."
            : dragOverUpload
              ? "Drop images here"
              : "Drag & drop images or click to browse"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          JPEG, PNG, WebP, SVG — compressed to ~4MB, max 5MB each, up to{" "}
          {MAX_VEHICLE_IMAGES} images
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

      {confirmRemoveUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-image-title"
        >
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-4 space-y-3">
            <h4 id="remove-image-title" className="font-semibold text-gray-900">
              Remove this image?
            </h4>
            <p className="text-sm text-gray-600">
              The file will be deleted from storage. This cannot be undone.
            </p>
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
                onClick={() => void handleRemoveConfirmed()}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {previewIndex !== null && images[previewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewIndex(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white rounded-full bg-black/50 p-2 hover:bg-black/70"
            onClick={() => setPreviewIndex(null)}
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 text-white rounded-full bg-black/50 p-2 hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(
                    (previewIndex - 1 + images.length) % images.length
                  );
                }}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="absolute right-4 text-white rounded-full bg-black/50 p-2 hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex((previewIndex + 1) % images.length);
                }}
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={images[previewIndex]}
            alt=""
            className="max-h-[85vh] max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 text-white text-sm">
            {previewIndex + 1} / {images.length}
          </p>
        </div>
      )}
    </div>
  );
}

/** Best-effort cleanup of temp uploads when abandoning a new vehicle form. */
export async function cleanupTempVehicleImages(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map((url) =>
      adminFetch("/api/admin/vehicles/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }).catch(() => undefined)
    )
  );
}
