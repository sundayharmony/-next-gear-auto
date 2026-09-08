"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface InsuranceCardGalleryProps {
  images: string[];
  vehicleName: string;
}

export function InsuranceCardGallery({ images, vehicleName }: InsuranceCardGalleryProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      {/* Thumbnails */}
      <div className="flex gap-2">
        {images.map((url, idx) => (
          <button
            key={url}
            type="button"
            onClick={() => setPreviewIndex(idx)}
            className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 hover:border-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label={`View insurance card ${idx + 1} for ${vehicleName}`}
          >
            <img
              src={url}
              alt={`Insurance card ${idx + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='10' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3EError%3C/text%3E%3C/svg%3E";
              }}
            />
            {images.length > 1 && (
              <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[10px] px-1 rounded">
                {idx + 1}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Modal */}
      {previewIndex !== null && images[previewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Insurance card preview for ${vehicleName}`}
          onClick={() => setPreviewIndex(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white rounded-full bg-black/50 p-2 hover:bg-black/70 z-10"
            onClick={() => setPreviewIndex(null)}
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 text-white rounded-full bg-black/50 p-2 hover:bg-black/70 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex((previewIndex - 1 + images.length) % images.length);
                }}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="absolute right-4 text-white rounded-full bg-black/50 p-2 hover:bg-black/70 z-10"
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

          <div className="text-center">
            <p className="text-white text-sm mb-2 font-medium">{vehicleName}</p>
            <img
              src={images[previewIndex]}
              alt={`Insurance card for ${vehicleName}`}
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {images.length > 1 && (
              <p className="text-white text-sm mt-2">
                {previewIndex + 1} / {images.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
