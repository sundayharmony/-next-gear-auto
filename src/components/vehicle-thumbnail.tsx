"use client";

import { useState } from "react";
import Image from "next/image";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  isOptimizableVehicleImageUrl,
  vehicleThumbnailSizes,
} from "@/lib/admin/vehicle-images";

interface VehicleThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
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
  priority = false,
  fallbackIconClassName = "h-10 w-10 text-gray-300",
  showPulseUntilLoad = false,
}: VehicleThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed || !isOptimizableVehicleImageUrl(src)) {
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
      <Image
        src={src}
        alt={alt}
        fill
        sizes={vehicleThumbnailSizes("grid")}
        loading={loading}
        priority={priority}
        className={cn("object-cover", imgClassName)}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
