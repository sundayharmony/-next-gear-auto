"use client";

import React, { useState } from "react";
import { Car, X, ChevronLeft, ChevronRight } from "lucide-react";

interface VehicleImageGalleryProps {
  images: string[];
  alt: string;
}

export function VehicleImageGallery({ images, alt }: VehicleImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
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

  if (!images || images.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 p-2">
        <div className="col-span-2 aspect-[16/9] rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
          <Car className="h-24 w-24 text-gray-200" />
        </div>
        <div className="aspect-[16/9] rounded-lg bg-gray-100 flex items-center justify-center">
          <Car className="h-12 w-12 text-gray-200" />
        </div>
        <div className="aspect-[16/9] rounded-lg bg-gray-100 flex items-center justify-center">
          <Car className="h-12 w-12 text-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 gap-2 p-2">
        <div
          className="col-span-2 aspect-[16/9] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 cursor-pointer group"
          onClick={() => openLightbox(0)}
        >
          <img
            src={images[0]}
            alt={alt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                const placeholder = document.createElement("div");
                placeholder.className = "h-full w-full bg-gray-200 flex items-center justify-center";
                placeholder.innerHTML = '<svg class="h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                parent.appendChild(placeholder);
              }
            }}
          />
        </div>
        {images.slice(1, 3).map((img, i) => (
          <div
            key={img}
            className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
            onClick={() => openLightbox(i + 1)}
          >
            <img
              src={img}
              alt={`${alt} - ${i + 2}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  const placeholder = document.createElement("div");
                  placeholder.className = "h-full w-full bg-gray-200 flex items-center justify-center";
                  placeholder.innerHTML = '<svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                  parent.appendChild(placeholder);
                }
              }}
            />
          </div>
        ))}
        {images.length < 3 &&
          Array.from({ length: Math.max(0, 2 - (images.length - 1)) }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="aspect-[16/9] rounded-lg bg-gray-100 flex items-center justify-center"
            >
              <Car className="h-12 w-12 text-gray-200" />
            </div>
          ))}
        {images.length > 3 && (
          <div
            className="aspect-[16/9] rounded-lg bg-gray-900/80 flex items-center justify-center cursor-pointer hover:bg-gray-900/90 transition-colors"
            onClick={() => openLightbox(3)}
          >
            <span className="text-white text-lg font-semibold">+{images.length - 3} more</span>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
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
            aria-label="Close gallery"
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
            {activeIndex + 1} / {images.length}
          </div>

          {/* Previous button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label="Previous image"
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
              src={images[activeIndex]}
              alt={`${alt} - ${activeIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  const placeholder = document.createElement("div");
                  placeholder.className = "h-64 w-64 bg-gray-200 flex items-center justify-center rounded-lg";
                  placeholder.innerHTML = '<div class="text-center"><svg class="h-16 w-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><p class="mt-2 text-gray-500 text-sm">Image not found</p></div>';
                  parent.appendChild(placeholder);
                }
              }}
            />
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label="Next image"
              className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 rounded-lg bg-black/50 p-2">
              {images.map((img, i) => (
                <button
                  key={img}
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  className={`h-12 w-16 rounded overflow-hidden border-2 transition-all ${
                    i === activeIndex ? "border-purple-500 opacity-100" : "border-transparent opacity-60 hover:opacity-80"
                  }`}
                >
                  <img src={img} alt={`${alt} thumbnail ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
