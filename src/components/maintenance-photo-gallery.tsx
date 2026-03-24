"use client";

import React, { useState } from "react";
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, FileText, Download } from "lucide-react";

interface MaintenancePhotoGalleryProps {
  photos: string[];
  alt: string;
  onDeletePhoto?: (url: string) => void;
  showDelete?: boolean;
}

function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf");
}

export function MaintenancePhotoGallery({
  photos,
  alt,
  onDeletePhoto,
  showDelete = false,
}: MaintenancePhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openLightbox = (index: number) => {
    if (isPdf(photos[index])) {
      window.open(photos[index], "_blank");
      return;
    }
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const goNext = () => {
    // Skip PDFs in lightbox navigation
    let next = (activeIndex + 1) % photos.length;
    let attempts = 0;
    while (isPdf(photos[next]) && attempts < photos.length) {
      next = (next + 1) % photos.length;
      attempts++;
    }
    if (!isPdf(photos[next])) setActiveIndex(next);
  };

  const goPrev = () => {
    let prev = (activeIndex - 1 + photos.length) % photos.length;
    let attempts = 0;
    while (isPdf(photos[prev]) && attempts < photos.length) {
      prev = (prev - 1 + photos.length) % photos.length;
      attempts++;
    }
    if (!isPdf(photos[prev])) setActiveIndex(prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
    }
  };

  const imagePhotos = photos.filter((p) => !isPdf(p));

  if (!photos || photos.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6">
        <div className="text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-1 text-xs text-gray-400">No photos yet</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <div
            key={photo}
            className="relative group h-20 w-20 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-purple-400 transition-colors"
            onClick={() => openLightbox(i)}
          >
            {isPdf(photo) ? (
              <div className="h-full w-full bg-gray-100 flex flex-col items-center justify-center">
                <FileText className="h-6 w-6 text-red-400" />
                <span className="text-[10px] text-gray-500 mt-0.5">PDF</span>
              </div>
            ) : (
              <img
                src={photo}
                alt={`${alt} - ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            )}
            {showDelete && onDeletePhoto && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePhoto(photo);
                }}
                className="absolute top-0.5 right-0.5 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove photo"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && imagePhotos.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          tabIndex={0}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            aria-label="Close lightbox"
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
            {activeIndex + 1} / {photos.length}
          </div>

          {/* Download button */}
          <a
            href={photos[activeIndex]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Open file in new tab"
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 transition-colors flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Open
          </a>

          {/* Previous button */}
          {imagePhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous photo"
              className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Main image */}
          <div
            className="max-h-[85vh] max-w-[90vw] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[activeIndex]}
              alt={`${alt} - ${activeIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            />
          </div>

          {/* Next button */}
          {imagePhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next photo"
              className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 rounded-lg bg-black/50 p-2 max-w-[90vw] overflow-x-auto">
              {photos.map((photo, i) => (
                <button
                  key={photo}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPdf(photo)) {
                      window.open(photo, "_blank");
                    } else {
                      setActiveIndex(i);
                    }
                  }}
                  className={`h-12 w-16 rounded overflow-hidden border-2 transition-all flex-shrink-0 ${
                    i === activeIndex
                      ? "border-purple-500 opacity-100"
                      : "border-transparent opacity-60 hover:opacity-80"
                  }`}
                >
                  {isPdf(photo) ? (
                    <div className="h-full w-full bg-gray-800 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-red-400" />
                    </div>
                  ) : (
                    <img src={photo} alt={`${alt} thumbnail ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
