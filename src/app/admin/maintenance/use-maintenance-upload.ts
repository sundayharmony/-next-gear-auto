import { useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { compressImage } from "@/lib/utils/compress-image";
import { logger } from "@/lib/utils/logger";
import type { FormState, MaintenanceRecord } from "./maintenance-types";

interface UseMaintenanceUploadOptions {
  setRecords: React.Dispatch<React.SetStateAction<MaintenanceRecord[]>>;
  setNewRecord: React.Dispatch<React.SetStateAction<FormState>>;
  setError: (message: string) => void;
  selectedRecord: MaintenanceRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<MaintenanceRecord | null>>;
  detailEditMode: boolean;
  setDetailEditData: React.Dispatch<React.SetStateAction<FormState>>;
}

export function useMaintenanceUpload({
  setRecords,
  setNewRecord,
  setError,
  selectedRecord,
  setSelectedRecord,
  detailEditMode,
  setDetailEditData,
}: UseMaintenanceUploadOptions) {
  const [uploadingPhoto, setUploadingPhoto] = useState<Record<string, boolean>>({});
  const [tempNewPhotos, setTempNewPhotos] = useState<File[]>([]);

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    recordId: string
  ) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    if (recordId === "new") {
      try {
        const file = await compressImage(rawFile, 4, 2048, 0.8);
        const previewUrl = URL.createObjectURL(file);
        setTempNewPhotos((prev) => [...prev, file]);
        setNewRecord((prev) => ({
          ...prev,
          photoUrls: [...prev.photoUrls, previewUrl],
        }));
      } catch (err) {
        logger.error("Photo compression error:", err);
        setError("Failed to process photo");
      }
      e.target.value = "";
      return;
    }

    setUploadingPhoto((prev) => ({ ...prev, [recordId]: true }));

    try {
      const file = await compressImage(rawFile, 4, 2048, 0.8);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("maintenanceId", recordId);

      const res = await adminFetch("/api/admin/maintenance/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success) {
        const newPhotoUrls = data.photoUrls || [];
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? { ...r, photoUrls: newPhotoUrls.length > 0 ? newPhotoUrls : [...r.photoUrls, data.url] }
              : r
          )
        );

        if (selectedRecord?.id === recordId) {
          const updatedUrls = newPhotoUrls.length > 0 ? newPhotoUrls : [...selectedRecord.photoUrls, data.url];
          setSelectedRecord((prev) => (prev ? { ...prev, photoUrls: updatedUrls } : prev));
          if (detailEditMode) {
            setDetailEditData((prev) => ({ ...prev, photoUrls: updatedUrls }));
          }
        }
      } else {
        setError(data.error || "Failed to upload photo");
      }
    } catch (err) {
      logger.error("Photo upload error:", err);
      setError("Network error — could not upload photo");
    } finally {
      setUploadingPhoto((prev) => ({ ...prev, [recordId]: false }));
      e.target.value = "";
    }
  };

  const removePhoto = (url: string, context: "new" | "detail") => {
    if (!window.confirm("Are you sure you want to remove this photo?")) return;

    if (context === "new") {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      setNewRecord((prev) => {
        const idx = prev.photoUrls.indexOf(url);
        if (idx !== -1) {
          setTempNewPhotos((prevFiles) => prevFiles.filter((_, i) => i !== idx));
        }
        return {
          ...prev,
          photoUrls: prev.photoUrls.filter((r) => r !== url),
        };
      });
    } else {
      setDetailEditData((prev) => ({
        ...prev,
        photoUrls: prev.photoUrls.filter((r) => r !== url),
      }));
    }
  };

  const revokeTempPhotoUrls = (photoUrls: string[]) => {
    photoUrls.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
  };

  const resetTempPhotos = () => {
    setTempNewPhotos([]);
  };

  return {
    uploadingPhoto,
    tempNewPhotos,
    setTempNewPhotos,
    handlePhotoUpload,
    removePhoto,
    revokeTempPhotoUrls,
    resetTempPhotos,
  };
}
