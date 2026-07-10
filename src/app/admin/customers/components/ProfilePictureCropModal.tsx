"use client";

import { Loader2, User } from "lucide-react";
import { Crop, Move, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { StaffCenterModal } from "@/components/staff/staff-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { useCustomerDetail } from "../use-customer-detail";

type CropState = ReturnType<typeof useCustomerDetail>;

export function ProfilePictureCropModal({
  open,
  crop,
}: {
  open: boolean;
  crop: Pick<
    CropState,
    | "closeCropModal"
    | "cropError"
    | "cropLoading"
    | "cropDisplaySrc"
    | "cropSourceLabel"
    | "cropImageRef"
    | "handleCropImageLoad"
    | "imageNaturalSize"
    | "imageDisplaySize"
    | "cropPosition"
    | "cropSize"
    | "handleCropMouseDown"
    | "adjustCropSize"
    | "generateCropPreview"
    | "cropPreview"
    | "saveProfilePicture"
    | "savingProfilePic"
  >;
}) {
  if (!open) return null;

  return (
    <StaffCenterModal
      onClose={crop.closeCropModal}
      ariaLabel="Crop profile picture"
      elevated
      className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none"
    >
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Crop className="h-5 w-5 text-purple-600" /> Crop Profile Picture
            </h2>
            <button
              type="button"
              onClick={crop.closeCropModal}
              className="rounded-full p-1 hover:bg-gray-100"
              aria-label="Close crop modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {crop.cropError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {crop.cropError}
            </div>
          )}

          {crop.cropLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-sm text-gray-500">Loading image...</span>
            </div>
          ) : crop.cropDisplaySrc ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Source: {crop.cropSourceLabel}. Drag the crop area over the face, then preview and save.
              </p>
              <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4 select-none max-h-[400px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={crop.cropImageRef}
                  src={crop.cropDisplaySrc}
                  alt={`${crop.cropSourceLabel} to crop`}
                  className="w-full h-auto"
                  draggable={false}
                  onLoad={crop.handleCropImageLoad}
                />
                {crop.imageNaturalSize.w > 0 && crop.imageDisplaySize.w > 0 && (
                  <div
                    onMouseDown={crop.handleCropMouseDown}
                    className="absolute border-2 border-white rounded-full shadow-lg cursor-move"
                    style={{
                      left: `${(crop.cropPosition.x / crop.imageNaturalSize.w) * crop.imageDisplaySize.w}px`,
                      top: `${(crop.cropPosition.y / crop.imageNaturalSize.h) * crop.imageDisplaySize.h}px`,
                      width: `${(crop.cropSize / crop.imageNaturalSize.w) * crop.imageDisplaySize.w}px`,
                      height: `${(crop.cropSize / crop.imageNaturalSize.h) * crop.imageDisplaySize.h}px`,
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Move className="h-6 w-6 text-white/70" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => crop.adjustCropSize(-30)}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Shrink crop area"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-500 w-16 text-center">{Math.round(crop.cropSize)}px</span>
                  <Button
                    type="button"
                    onClick={() => crop.adjustCropSize(30)}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Enlarge crop area"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
                <Button type="button" onClick={crop.generateCropPreview} variant="outline" size="sm">
                  <Crop className="h-3.5 w-3.5 mr-1" /> Preview Crop
                </Button>
              </div>
              {crop.cropPreview && (
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={crop.cropPreview}
                    alt="Cropped preview"
                    className="h-24 w-24 rounded-full object-cover border-2 border-purple-400"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Preview</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Adjust the crop area and preview again if needed.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={crop.saveProfilePicture}
                  disabled={!crop.cropPreview || crop.savingProfilePic}
                  className="flex-1"
                >
                  {crop.savingProfilePic ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-1" /> Save as Profile Picture
                    </>
                  )}
                </Button>
                <Button type="button" onClick={crop.closeCropModal} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-gray-500">No image selected.</p>
          )}
        </CardContent>
      </Card>
    </StaffCenterModal>
  );
}
