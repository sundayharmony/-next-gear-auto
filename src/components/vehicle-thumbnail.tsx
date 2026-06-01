"use client";

import { useState } from "react";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface VehicleThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  fallbackIconClassName?: string;
  showPulseUntilLoad?: boolean;
}

/**
 * Vehicle image with React state fallbacks (avoids imperative DOM patches on error).
 */
export function VehicleThumbnail({
  src,
  alt,
  className,
  imgClassName,
  loading = "lazy",
  fallbackIconClassName = "h-10 w-10 text-gray-300",
  showPulseUntilLoad = false,
}: VehicleThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-50 to-gray-100",
          className
        )}
      >
        <Car className={fallbackIconClassName} aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        showPulseUntilLoad && !loaded && "animate-pulse bg-gradient-to-br from-purple-50 to-gray-100",
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={cn("h-full w-full object-cover", imgClassName)}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
