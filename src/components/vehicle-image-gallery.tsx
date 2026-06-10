"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Car, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  isOptimizableVehicleImageUrl,
  vehicleThumbnailSizes,
  VEHICLE_THUMBNAIL_WIDTH,
} from "@/lib/admin/vehicle-images";

interface VehicleImageGalleryProps {
  images: string[];
  alt: string;
}

function GalleryImage({
  src,
  alt,
  className,
  fill = false,
  width,
  height,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!isOptimizableVehicleImageUrl(src) || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-200">
        <Car className="h-12 w-12 text-gray-400" aria-hidden />
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? vehicleThumbnailSizes("gallery")}
        className={className}
        priority={priority}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? VEHICLE_THUMBNAIL_WIDTH}
      height={height ?? Math.round(VEHICLE_THUMBNAIL_WIDTH * 0.56)}
      sizes={sizes ?? vehicleThumbnailSizes("gallery")}
      className={className}
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
}

export function VehicleImageGallery({ images, alt }: VehicleImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  useEffect(() => {
    if (lightboxOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [lightboxOpen]);

  const goNext = () => {
    if (images.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const goPrev = () => {
    if (images.length <= 1) return;
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
      <div className="grid grid-cols-2 gap-2 p-2">
        <div
          className="relative col-span-2 aspect-[16/9] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 cursor-pointer group"
          onClick={() => openLightbox(0)}
        >
          <GalleryImage
            src={images[0]}
            alt={alt}
            fill
            priority
            sizes={vehicleThumbnailSizes("hero")}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        {images.slice(1, 3).map((img, i) => (
          <div
            key={img}
            className="relative aspect-[16/9] rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
            onClick={() => openLightbox(i + 1)}
          >
            <GalleryImage
              src={img}
              alt={`${alt} - ${i + 2}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
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

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          tabIndex={0}
        >
          <button
            ref={closeButtonRef}
            onClick={closeLightbox}
            aria-label="Close gallery"
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="absolute top-4 left-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
            {activeIndex + 1} / {images.length}
          </div>

          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label="Previous image"
              className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <div
            className="relative max-h-[85vh] max-w-[90vw] h-[85vh] w-[90vw] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <GalleryImage
              src={images[activeIndex]}
              alt={`${alt} - ${activeIndex + 1}`}
              fill
              sizes="90vw"
              className="object-contain rounded-lg"
            />
          </div>

          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label="Next image"
              className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 rounded-lg bg-black/50 p-2">
              {images.map((img, i) => (
                <button
                  key={img}
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  className={`relative h-12 w-16 rounded overflow-hidden border-2 transition-all ${
                    i === activeIndex ? "border-purple-500 opacity-100" : "border-transparent opacity-60 hover:opacity-80"
                  }`}
                >
                  <GalleryImage
                    src={img}
                    alt={`${alt} thumbnail ${i + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
