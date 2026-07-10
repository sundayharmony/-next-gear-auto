"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { isAllowedExternalHref } from "@/lib/utils/safe-url";
import { safeDataImageSrc } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import type { CustomerRow } from "./use-customers-data";
import {
  computeCustomerStats,
  type CustomerBookingRow,
  type CustomerTicketRow,
} from "./customer-detail-types";

export interface UseCustomerDetailOptions {
  initialCustomer: CustomerRow;
  setCustomers: Dispatch<SetStateAction<CustomerRow[]>>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefreshList: () => void;
  onClose: () => void;
}

export function useCustomerDetail({
  initialCustomer,
  setCustomers,
  onSuccess,
  onError,
  onRefreshList,
  onClose,
}: UseCustomerDetailOptions) {
  const [customer, setCustomer] = useState<CustomerRow>(initialCustomer);
  const [customerBookings, setCustomerBookings] = useState<CustomerBookingRow[]>([]);
  const [customerTickets, setCustomerTickets] = useState<CustomerTicketRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [editingMode, setEditingMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingCustomerDoc, setUploadingCustomerDoc] = useState(false);
  const [selectedBookingForUpload, setSelectedBookingForUpload] = useState<string | null>(null);
  const [uploadDocType, setUploadDocType] = useState<"id_document" | "insurance_proof">("id_document");
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [sendingPasswordLink, setSendingPasswordLink] = useState(false);
  const openCustomerRequestIdRef = useRef<number | null>(null);

  const [showCropModal, setShowCropModal] = useState(false);
  const [cropDataUrl, setCropDataUrl] = useState<string | null>(null);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [savingProfilePic, setSavingProfilePic] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(200);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const [imageDisplaySize, setImageDisplaySize] = useState({ w: 0, h: 0 });
  const [cropLoading, setCropLoading] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const profileImageFileInputRef = useRef<HTMLInputElement>(null);
  const [cropSourceLabel, setCropSourceLabel] = useState("Driver License");

  const loadCustomerData = useCallback(async (target: CustomerRow) => {
    const requestId = Math.random();
    openCustomerRequestIdRef.current = requestId;
    setCustomer(target);
    setLoadingBookings(true);
    try {
      const [byIdRes, byEmailRes] = await Promise.all([
        adminFetch(`/api/bookings?customer_id=${encodeURIComponent(target.id)}`),
        adminFetch(`/api/bookings?customer_email=${encodeURIComponent(target.email)}`),
      ]);
      if (requestId !== openCustomerRequestIdRef.current) return;
      if (!byIdRes.ok || !byEmailRes.ok) throw new Error("Failed to load bookings");
      const byIdData = await byIdRes.json();
      const byEmailData = await byEmailRes.json();
      if (requestId !== openCustomerRequestIdRef.current) return;

      const byId: CustomerBookingRow[] = byIdData.success ? byIdData.data || [] : [];
      const byEmail: CustomerBookingRow[] = byEmailData.success ? byEmailData.data || [] : [];
      const seen = new Set<string>();
      const merged: CustomerBookingRow[] = [];
      for (const b of [...byId, ...byEmail]) {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          merged.push(b);
        }
      }
      setCustomerBookings(merged);

      try {
        const ticketsRes = await adminFetch(
          `/api/admin/tickets?customer_id=${encodeURIComponent(target.id)}`
        );
        if (requestId !== openCustomerRequestIdRef.current) return;
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setCustomerTickets(ticketsData.data || []);
        } else {
          setCustomerTickets([]);
        }
      } catch {
        if (requestId === openCustomerRequestIdRef.current) setCustomerTickets([]);
      }
    } catch (err) {
      logger.error("Failed to fetch customer bookings:", err);
    }
    if (requestId === openCustomerRequestIdRef.current) setLoadingBookings(false);
  }, []);

  useEffect(() => {
    void loadCustomerData(initialCustomer);
  }, [initialCustomer.id, loadCustomerData, initialCustomer]);

  useEffect(() => {
    setCustomer(initialCustomer);
  }, [initialCustomer]);

  useEffect(() => {
    setProfilePictureUrl(customer.profilePictureUrl ?? null);
  }, [customer.profilePictureUrl]);

  const stats = useMemo(() => computeCustomerStats(customerBookings), [customerBookings]);

  const latestIdUrl =
    customer.idDocumentUrl || customerBookings.find((b) => b.id_document_url)?.id_document_url;
  const latestInsuranceUrl = customerBookings.find((b) => b.insurance_proof_url)?.insurance_proof_url;
  const safeLatestIdHref = latestIdUrl ? isAllowedExternalHref(latestIdUrl) : undefined;
  const safeLatestInsuranceHref = latestInsuranceUrl
    ? isAllowedExternalHref(latestInsuranceUrl)
    : undefined;

  const startEditingCustomer = () => {
    setEditName(customer.name);
    setEditEmail(customer.email);
    setEditPhone(customer.phone);
    setEditingMode(true);
  };

  const cancelCustomerEdit = () => setEditingMode(false);

  const saveCustomerEdit = async () => {
    if (!editName || !editEmail) {
      onError("Name and email are required");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await adminFetch(`/api/admin/customers?id=${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setCustomer(data.data);
        setEditingMode(false);
        onSuccess("Customer updated successfully");
      } else {
        onError("Failed to update customer: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to update customer:", err);
      onError("Error updating customer");
    }
    setSavingEdit(false);
  };

  const deleteCustomer = async () => {
    if (!confirm(`Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingCustomer(true);
    try {
      const res = await adminFetch(`/api/admin/customers?id=${customer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        onSuccess("Customer deleted successfully");
        onRefreshList();
        onClose();
      } else {
        onError("Failed to delete customer: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to delete customer:", err);
      onError("Error deleting customer");
    }
    setDeletingCustomer(false);
  };

  const sendPasswordLink = async () => {
    setSendingPasswordLink(true);
    try {
      const res = await adminFetch("/api/admin/send-password-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customer.email, customerId: customer.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        onSuccess(`Password link sent to ${customer.email}`);
      } else {
        onError("Failed to send password link: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to send password link:", err);
      onError("Error sending password link");
    }
    setSendingPasswordLink(false);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBookingForUpload || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) {
      onError("File size must not exceed 10MB");
      return;
    }
    const formData = new FormData();
    formData.append("bookingId", selectedBookingForUpload);
    formData.append("type", uploadDocType);
    formData.append("file", file);
    setUploadingDoc(true);
    try {
      const res = await adminFetch("/api/bookings/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        onSuccess("Document uploaded successfully");
        setSelectedBookingForUpload(null);
        setUploadDocType("id_document");
        await loadCustomerData(customer);
      } else {
        onError("Failed to upload document: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to upload document:", err);
      onError("Error uploading document");
    }
    setUploadingDoc(false);
  };

  const handleCustomerDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) {
      onError("File size must not exceed 10MB");
      return;
    }
    const formData = new FormData();
    formData.append("customerId", customer.id);
    formData.append("type", "id_document");
    formData.append("file", file);
    setUploadingCustomerDoc(true);
    try {
      const res = await adminFetch("/api/admin/customer-documents", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      if (data.success || data.url) {
        onSuccess("ID document uploaded to customer profile");
        setCustomer((prev) => ({ ...prev, idDocumentUrl: data.url }));
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? { ...c, idDocumentUrl: data.url } : c))
        );
      } else {
        onError("Failed to upload: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to upload customer document:", err);
      onError("Error uploading document");
    }
    setUploadingCustomerDoc(false);
    e.target.value = "";
  };

  const readBlobAsDataImageUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = safeDataImageSrc(typeof reader.result === "string" ? reader.result : null);
        if (src) resolve(src);
        else reject(new Error("Invalid image data"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
      reader.readAsDataURL(blob);
    });

  const initializeCropFromBlob = async (blob: Blob, sourceLabel: string) => {
    setCropSourceLabel(sourceLabel);
    setCropPreview(null);
    setCropError(null);
    setCropPosition({ x: 0, y: 0 });
    setCropSize(200);
    setImageNaturalSize({ w: 0, h: 0 });
    setImageDisplaySize({ w: 0, h: 0 });
    setCropLoading(true);
    setShowCropModal(true);
    try {
      const dataUrl = await readBlobAsDataImageUrl(blob);
      setCropDataUrl(dataUrl);
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image decode failed"));
      });
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      setImageNaturalSize({ w: natW, h: natH });
      let faceFound = false;
      if ("FaceDetector" in window) {
        try {
          const detector = new (window as Window & {
            FaceDetector: new () => {
              detect: (img: HTMLImageElement) => Promise<
                Array<{ boundingBox: { x: number; y: number; width: number; height: number } }>
              >;
            };
          }).FaceDetector();
          const faces = await detector.detect(img);
          if (faces.length > 0) {
            const face = faces[0].boundingBox;
            const padding = Math.max(face.width, face.height) * 0.5;
            const size = Math.max(face.width, face.height) + padding * 2;
            const cx = face.x + face.width / 2;
            const cy = face.y + face.height / 2;
            const clampedSize = Math.min(size, natW, natH);
            setCropPosition({
              x: Math.max(0, Math.min(natW - clampedSize, cx - clampedSize / 2)),
              y: Math.max(0, Math.min(natH - clampedSize, cy - clampedSize / 2)),
            });
            setCropSize(clampedSize);
            faceFound = true;
          }
        } catch {
          /* FaceDetector unavailable */
        }
      }
      if (!faceFound) {
        const heurSize = Math.min(natW * 0.4, natH * 0.7);
        const isLicenseLike = sourceLabel.toLowerCase().includes("license");
        setCropPosition({
          x: isLicenseLike ? natW * 0.03 : Math.max(0, (natW - heurSize) / 2),
          y: natH * 0.15,
        });
        setCropSize(heurSize);
      }
      setCropLoading(false);
    } catch (err) {
      logger.error("Failed to load image for cropping:", err);
      setCropError("Could not load this image for cropping. Try another file.");
      setCropLoading(false);
    }
  };

  const openCropModal = async (imageUrl: string, sourceLabel = "Driver License") => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await initializeCropFromBlob(await response.blob(), sourceLabel);
    } catch (err) {
      logger.error("Failed to fetch image for cropping:", err);
      setCropError("Could not load the selected image. Try refreshing the page.");
      setShowCropModal(true);
      setCropLoading(false);
    }
  };

  const handleProfileImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      onError("Profile image must be JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Profile image is too large. Maximum 5 MB.");
      return;
    }
    await initializeCropFromBlob(file, "Uploaded Photo");
  };

  const removeProfilePicture = async () => {
    setSavingProfilePic(true);
    try {
      const res = await adminFetch("/api/admin/profile-picture", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setProfilePictureUrl(null);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, profilePictureUrl: undefined } : c))
      );
      onSuccess("Profile photo removed.");
    } catch (err) {
      logger.error("Failed removing profile picture:", err);
      onError("Could not remove profile picture.");
    } finally {
      setSavingProfilePic(false);
    }
  };

  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCrop(true);
    const scaleX = imageDisplaySize.w / imageNaturalSize.w;
    const scaleY = imageDisplaySize.h / imageNaturalSize.h;
    setDragStart({
      x: e.clientX - cropPosition.x * scaleX,
      y: e.clientY - cropPosition.y * scaleY,
    });
  };

  const handleCropMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingCrop || !imageNaturalSize.w || !imageDisplaySize.w) return;
      const scaleX = imageDisplaySize.w / imageNaturalSize.w;
      const scaleY = imageDisplaySize.h / imageNaturalSize.h;
      const displayCropSize = cropSize * scaleX;
      const displayX = e.clientX - dragStart.x;
      const displayY = e.clientY - dragStart.y;
      const clampedDisplayX = Math.max(0, Math.min(imageDisplaySize.w - displayCropSize, displayX));
      const clampedDisplayY = Math.max(
        0,
        Math.min(imageDisplaySize.h - displayCropSize * (scaleY / scaleX), displayY)
      );
      setCropPosition({ x: clampedDisplayX / scaleX, y: clampedDisplayY / scaleY });
    },
    [isDraggingCrop, dragStart, cropSize, imageNaturalSize, imageDisplaySize]
  );

  const handleCropMouseUp = useCallback(() => setIsDraggingCrop(false), []);

  useEffect(() => {
    if (!isDraggingCrop) return;
    window.addEventListener("mousemove", handleCropMouseMove);
    window.addEventListener("mouseup", handleCropMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleCropMouseMove);
      window.removeEventListener("mouseup", handleCropMouseUp);
    };
  }, [isDraggingCrop, handleCropMouseMove, handleCropMouseUp]);

  const generateCropPreview = () => {
    if (!cropImageRef.current) {
      setCropError("Image not loaded yet. Please wait.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setCropError("Canvas not supported in this browser.");
        return;
      }
      ctx.drawImage(
        cropImageRef.current,
        cropPosition.x,
        cropPosition.y,
        cropSize,
        cropSize,
        0,
        0,
        300,
        300
      );
      setCropPreview(canvas.toDataURL("image/jpeg", 0.92));
      setCropError(null);
    } catch (err) {
      logger.error("Canvas crop failed:", err);
      setCropError("Failed to crop image. The image may have CORS restrictions.");
    }
  };

  const adjustCropSize = (delta: number) => {
    const newSize = Math.max(
      80,
      Math.min(Math.min(imageNaturalSize.w, imageNaturalSize.h), cropSize + delta)
    );
    setCropSize(newSize);
    setCropPosition((prev) => ({
      x: Math.max(0, Math.min(imageNaturalSize.w - newSize, prev.x - delta / 2)),
      y: Math.max(0, Math.min(imageNaturalSize.h - newSize, prev.y - delta / 2)),
    }));
  };

  const closeCropModal = () => {
    setShowCropModal(false);
    setCropPreview(null);
    setCropError(null);
    setCropDataUrl(null);
  };

  const saveProfilePicture = async () => {
    if (!cropPreview) return;
    setSavingProfilePic(true);
    try {
      const [header, base64Data] = cropPreview.split(",");
      const mimeMatch = header.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const formData = new FormData();
      formData.append("file", new Blob([ab], { type: mime }), `profile_${customer.id}.jpg`);
      formData.append("customerId", customer.id);
      const uploadRes = await adminFetch("/api/admin/profile-picture", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error(`HTTP ${uploadRes.status}`);
      const data = await uploadRes.json();
      if (data.success) {
        setProfilePictureUrl(data.url);
        setCustomer((prev) => ({ ...prev, profilePictureUrl: data.url }));
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? { ...c, profilePictureUrl: data.url } : c))
        );
        if (data.warning) onError(data.warning);
        else onSuccess("Profile photo updated.");
        closeCropModal();
      } else {
        setCropError("Failed to save: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to save profile picture:", err);
      setCropError("Network error saving profile picture. Please try again.");
    } finally {
      setSavingProfilePic(false);
    }
  };

  const handleCropImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setImageDisplaySize({ w: img.clientWidth, h: img.clientHeight });
    if (!imageNaturalSize.w) {
      setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    }
  };

  const cropDisplaySrc = safeDataImageSrc(cropDataUrl);

  return {
    customer,
    customerBookings,
    customerTickets,
    loadingBookings,
    stats,
    latestIdUrl,
    latestInsuranceUrl,
    safeLatestIdHref,
    safeLatestInsuranceHref,
    editingMode,
    editName,
    setEditName,
    editEmail,
    setEditEmail,
    editPhone,
    setEditPhone,
    savingEdit,
    uploadingDoc,
    uploadingCustomerDoc,
    selectedBookingForUpload,
    setSelectedBookingForUpload,
    uploadDocType,
    setUploadDocType,
    deletingCustomer,
    sendingPasswordLink,
    profilePictureUrl,
    profileImageFileInputRef,
    showCropModal,
    cropDisplaySrc,
    cropSourceLabel,
    cropError,
    cropLoading,
    cropImageRef,
    cropPosition,
    cropSize,
    imageNaturalSize,
    imageDisplaySize,
    cropPreview,
    savingProfilePic,
    startEditingCustomer,
    cancelCustomerEdit,
    saveCustomerEdit,
    deleteCustomer,
    sendPasswordLink,
    handleDocumentUpload,
    handleCustomerDocUpload,
    openCropModal,
    handleProfileImageFileSelected,
    removeProfilePicture,
    handleCropMouseDown,
    generateCropPreview,
    adjustCropSize,
    closeCropModal,
    saveProfilePicture,
    handleCropImageLoad,
  };
}
