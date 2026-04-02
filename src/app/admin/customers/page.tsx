"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { BookingDbRow } from "@/lib/types";
import {
  Search,
  RefreshCw,
  ChevronRight,
  X,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Car,
  FileText,
  Shield,
  Clock,
  TrendingUp,
  CreditCard,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Edit2,
  Upload,
  Plus,
  Trash2,
  KeyRound,
  Crop,
  User,
  Move,
  ZoomIn,
  ZoomOut,
  Ticket,
  MapPin,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { logger } from "@/lib/utils/logger";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  profilePictureUrl?: string;
  idDocumentUrl?: string | null;
}

type BookingRow = BookingDbRow;

export default function AdminCustomersPage() {
  const { error: toastError, setError: setToastError, success: toastSuccess, setSuccess: setToastSuccess } = useAutoToast();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [customerBookings, setCustomerBookings] = useState<BookingRow[]>([]);
  const [customerTickets, setCustomerTickets] = useState<Array<{ id: string; ticketType: string; violationDate: string; municipality: string; state: string; prefix: string; ticketNumber: string; amountDue: number; status: string; vehicleName: string }>>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingMode, setEditingMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingCustomerDoc, setUploadingCustomerDoc] = useState(false);
  const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateArray } = usePagination(12);
  const [selectedBookingForUpload, setSelectedBookingForUpload] = useState<string | null>(null);
  const [uploadDocType, setUploadDocType] = useState<"id_document" | "insurance_proof">("id_document");
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [sendingPasswordLink, setSendingPasswordLink] = useState(false);

  // Profile picture crop state
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropBlobUrl, setCropBlobUrl] = useState<string | null>(null);
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
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  const fetchCustomers = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const url = query ? `/api/admin/customers?search=${encodeURIComponent(query)}` : "/api/admin/customers";
      const res = await adminFetch(url);
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (err) {
      logger.error("Failed to fetch customers:", err);
    }
    setLoading(false);
  }, []);

  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  useEffect(() => { fetchCustomers(); }, []);

  // Auto-open customer when navigated with ?highlight=<customerId>
  useEffect(() => {
    if (highlightId && customers.length > 0 && !selectedCustomer) {
      const found = customers.find((c) => c.id === highlightId);
      if (found) openCustomer(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, customers, selectedCustomer]);

  const handleSearch = () => {
    const trimmedQuery = searchInput.trim();
    fetchCustomers(trimmedQuery);
    resetPage();
  };

  const router = useRouter();

  const openCustomer = async (customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setLoadingBookings(true);
    try {
      // Fetch by customer_id (primary) and customer_email (fallback), then merge & dedupe
      const [byIdRes, byEmailRes] = await Promise.all([
        adminFetch(`/api/bookings?customer_id=${encodeURIComponent(customer.id)}`),
        adminFetch(`/api/bookings?customer_email=${encodeURIComponent(customer.email)}`),
      ]);
      if (!byIdRes.ok) throw new Error(`HTTP ${byIdRes.status}`);
      if (!byEmailRes.ok) throw new Error(`HTTP ${byEmailRes.status}`);
      const byIdData = await byIdRes.json();
      const byEmailData = await byEmailRes.json();

      const byId: BookingRow[] = byIdData.success ? (byIdData.data || []) : [];
      const byEmail: BookingRow[] = byEmailData.success ? (byEmailData.data || []) : [];

      // Merge and deduplicate by booking id
      const seen = new Set<string>();
      const merged: BookingRow[] = [];
      for (const b of [...byId, ...byEmail]) {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          merged.push(b);
        }
      }

      setCustomerBookings(merged);

      // Fetch tickets for this customer
      try {
        const ticketsRes = await adminFetch(`/api/admin/tickets?customer_id=${encodeURIComponent(customer.id)}`);
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setCustomerTickets(ticketsData.data || []);
        } else {
          setCustomerTickets([]);
        }
      } catch {
        setCustomerTickets([]);
      }
    } catch (err) {
      logger.error("Failed to fetch customer bookings:", err);
    }
    setLoadingBookings(false);
  };

  const closeCustomer = () => {
    setSelectedCustomer(null);
    setCustomerBookings([]);
    setCustomerTickets([]);
    setEditingMode(false);
    setSelectedBookingForUpload(null);
  };

  const startEditingCustomer = () => {
    if (selectedCustomer) {
      setEditName(selectedCustomer.name);
      setEditEmail(selectedCustomer.email);
      setEditPhone(selectedCustomer.phone);
      setEditingMode(true);
    }
  };

  const saveCustomerEdit = async () => {
    if (!selectedCustomer || !editName || !editEmail) {
      setToastError("Name and email are required");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await adminFetch(`/api/admin/customers?id=${selectedCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(data.data);
        setEditingMode(false);
        setToastSuccess("Customer updated successfully");
      } else {
        setToastError("Failed to update customer: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to update customer:", err);
      setToastError("Error updating customer");
    }
    setSavingEdit(false);
  };

  const cancelCustomerEdit = () => {
    setEditingMode(false);
  };

  const deleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!confirm(`Are you sure you want to delete customer "${selectedCustomer.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingCustomer(true);
    try {
      const res = await adminFetch(`/api/admin/customers?id=${selectedCustomer.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setToastSuccess("Customer deleted successfully");
        closeCustomer();
        fetchCustomers();
      } else {
        setToastError("Failed to delete customer: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to delete customer:", err);
      setToastError("Error deleting customer");
    }
    setDeletingCustomer(false);
  };

  const sendPasswordLink = async () => {
    if (!selectedCustomer) return;

    setSendingPasswordLink(true);
    try {
      const res = await adminFetch("/api/admin/send-password-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedCustomer.email,
          customerId: selectedCustomer.id,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setToastSuccess(`Password link sent to ${selectedCustomer.email}`);
      } else {
        setToastError("Failed to send password link: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to send password link:", err);
      setToastError("Error sending password link");
    }
    setSendingPasswordLink(false);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBookingForUpload || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("bookingId", selectedBookingForUpload);
    formData.append("type", uploadDocType);
    formData.append("file", file);

    setUploadingDoc(true);
    try {
      const res = await adminFetch("/api/bookings/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setToastSuccess("Document uploaded successfully");
        setSelectedBookingForUpload(null);
        setUploadDocType("id_document");
        if (selectedCustomer) {
          await openCustomer(selectedCustomer);
        }
      } else {
        setToastError("Failed to upload document: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to upload document:", err);
      setToastError("Error uploading document");
    }
    setUploadingDoc(false);
  };

  // Upload ID document directly to customer profile (no booking required)
  const handleCustomerDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCustomer || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("customerId", selectedCustomer.id);
    formData.append("type", "id_document");
    formData.append("file", file);

    setUploadingCustomerDoc(true);
    try {
      const res = await adminFetch("/api/admin/customer-documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      if (data.success || data.url) {
        setToastSuccess("ID document uploaded to customer profile");
        // Update the selected customer's idDocumentUrl in state
        setSelectedCustomer((prev) => prev ? { ...prev, idDocumentUrl: data.url } : prev);
        // Also update in the customers list
        setCustomers((prev) =>
          prev.map((c) => c.id === selectedCustomer.id ? { ...c, idDocumentUrl: data.url } : c)
        );
      } else {
        setToastError("Failed to upload: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to upload customer document:", err);
      setToastError("Error uploading document");
    }
    setUploadingCustomerDoc(false);
    // Reset file input
    e.target.value = "";
  };

  const handleDeleteFromList = async (customer: CustomerRow) => {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;
    try {
      const res = await adminFetch(`/api/admin/customers?id=${customer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        fetchCustomers();
      } else {
        setToastError("Failed to delete customer");
      }
    } catch (err) {
      logger.error("Failed to delete:", err);
      setToastError("Error deleting customer");
    }
  };

  // --- Profile Picture Crop Functions ---

  // Clean up blob URL when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (cropBlobUrl) URL.revokeObjectURL(cropBlobUrl);
    };
  }, [cropBlobUrl]);

  const openCropModal = async (imageUrl: string) => {
    // Reset all crop state
    setCropPreview(null);
    setCropError(null);
    setCropPosition({ x: 0, y: 0 });
    setCropSize(200);
    setImageNaturalSize({ w: 0, h: 0 });
    setImageDisplaySize({ w: 0, h: 0 });
    setCropLoading(true);
    setShowCropModal(true);

    // Revoke old blob URL if any
    if (cropBlobUrl) URL.revokeObjectURL(cropBlobUrl);

    // Fetch image as blob to bypass CORS restrictions on canvas operations
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setCropBlobUrl(blobUrl);

      // Load the blob URL into an Image to get dimensions and do face detection
      const img = new Image();
      img.src = blobUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image decode failed"));
      });

      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      setImageNaturalSize({ w: natW, h: natH });

      // Try browser FaceDetector API (Chromium only)
      let faceFound = false;
      if ("FaceDetector" in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detector = new (window as any).FaceDetector();
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
          // FaceDetector not available or failed — use heuristic
        }
      }

      // Heuristic fallback: face is typically in the left portion of a driver's license
      if (!faceFound) {
        const heurSize = Math.min(natW * 0.4, natH * 0.7);
        setCropPosition({
          x: natW * 0.03,
          y: natH * 0.15,
        });
        setCropSize(heurSize);
      }

      setCropLoading(false);
    } catch (err) {
      logger.error("Failed to load image for cropping:", err);
      setCropError("Could not load the ID image. Try refreshing the page.");
      setCropLoading(false);
    }
  };

  // Drag handling — all coordinates in DISPLAY (screen) pixels
  // We convert to natural coordinates only when generating the crop preview
  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCrop(true);
    // Store the offset between mouse position and current crop overlay position
    const scaleX = imageDisplaySize.w / imageNaturalSize.w;
    const scaleY = imageDisplaySize.h / imageNaturalSize.h;
    const displayX = cropPosition.x * scaleX;
    const displayY = cropPosition.y * scaleY;
    setDragStart({
      x: e.clientX - displayX,
      y: e.clientY - displayY,
    });
  };

  const handleCropMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingCrop || !imageNaturalSize.w || !imageDisplaySize.w) return;
    const scaleX = imageDisplaySize.w / imageNaturalSize.w;
    const scaleY = imageDisplaySize.h / imageNaturalSize.h;
    const displayCropSize = cropSize * scaleX;

    // Calculate new position in display coordinates
    const displayX = e.clientX - dragStart.x;
    const displayY = e.clientY - dragStart.y;

    // Clamp to image bounds in display coordinates
    const clampedDisplayX = Math.max(0, Math.min(imageDisplaySize.w - displayCropSize, displayX));
    const clampedDisplayY = Math.max(0, Math.min(imageDisplaySize.h - displayCropSize * (scaleY / scaleX), displayY));

    // Convert back to natural coordinates
    setCropPosition({
      x: clampedDisplayX / scaleX,
      y: clampedDisplayY / scaleY,
    });
  }, [isDraggingCrop, dragStart, cropSize, imageNaturalSize, imageDisplaySize]);

  const handleCropMouseUp = useCallback(() => {
    setIsDraggingCrop(false);
  }, []);

  useEffect(() => {
    if (isDraggingCrop) {
      window.addEventListener("mousemove", handleCropMouseMove);
      window.addEventListener("mouseup", handleCropMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleCropMouseMove);
        window.removeEventListener("mouseup", handleCropMouseUp);
      };
    }
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
        cropPosition.x, cropPosition.y, cropSize, cropSize,
        0, 0, 300, 300
      );

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCropPreview(dataUrl);
      setCropError(null);
    } catch (err) {
      logger.error("Canvas crop failed:", err);
      setCropError("Failed to crop image. The image may have CORS restrictions.");
    }
  };

  const adjustCropSize = (delta: number) => {
    const newSize = Math.max(80, Math.min(
      Math.min(imageNaturalSize.w, imageNaturalSize.h),
      cropSize + delta
    ));
    setCropSize(newSize);
    // Keep centered when resizing
    setCropPosition((prev) => ({
      x: Math.max(0, Math.min(imageNaturalSize.w - newSize, prev.x - delta / 2)),
      y: Math.max(0, Math.min(imageNaturalSize.h - newSize, prev.y - delta / 2)),
    }));
  };

  const closeCropModal = () => {
    setShowCropModal(false);
    setCropPreview(null);
    setCropError(null);
    if (cropBlobUrl) {
      URL.revokeObjectURL(cropBlobUrl);
      setCropBlobUrl(null);
    }
  };

  const saveProfilePicture = async () => {
    if (!cropPreview || !selectedCustomer) return;

    setSavingProfilePic(true);
    try {
      // Convert data URL to blob without fetch (CSP blocks fetch on data: URIs)
      const [header, base64Data] = cropPreview.split(",");
      const mimeMatch = header.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mime });

      const formData = new FormData();
      formData.append("file", blob, `profile_${selectedCustomer.id}.jpg`);
      formData.append("customerId", selectedCustomer.id);

      const uploadRes = await adminFetch("/api/admin/profile-picture", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error(`HTTP ${uploadRes.status}`);
      const data = await uploadRes.json();
      if (data.success) {
        setProfilePictureUrl(data.url);
        // Also update the customer in the list so the avatar updates everywhere
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === selectedCustomer.id ? { ...c, profilePictureUrl: data.url } : c
          )
        );
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

  // Update imageDisplaySize when the crop image loads in the modal
  const handleCropImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setImageDisplaySize({ w: img.clientWidth, h: img.clientHeight });
    if (!imageNaturalSize.w) {
      setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    }
  };

  // Load profile picture when customer is opened
  useEffect(() => {
    if (selectedCustomer?.profilePictureUrl) {
      setProfilePictureUrl(selectedCustomer.profilePictureUrl);
    } else {
      setProfilePictureUrl(null);
    }
  }, [selectedCustomer]);

  // Customer statistics
  const stats = useMemo(() => {
    if (!customerBookings.length) return null;

    const nonCancelled = customerBookings.filter((b) => b.status !== "cancelled");
    const totalSpent = nonCancelled.reduce((sum, b) => sum + (b.total_price ?? 0), 0);
    const completedTrips = customerBookings.filter((b) => b.status === "completed").length;
    const activeTrips = customerBookings.filter((b) => b.status === "active" || b.status === "confirmed").length;
    const cancelledTrips = customerBookings.filter((b) => b.status === "cancelled").length;
    const totalBookings = customerBookings.length;

    const totalDays = nonCancelled.reduce((sum, b) => {
      if (!b.pickup_date || !b.return_date) return sum;
      const pParts = b.pickup_date.split("-").map(Number);
      const rParts = b.return_date.split("-").map(Number);
      if (pParts.length < 3 || rParts.length < 3) return sum;
      const [py, pm, pd] = pParts;
      const [ry, rm, rd] = rParts;
      const pickup = new Date(py, pm - 1, pd);
      const ret = new Date(ry, rm - 1, rd);
      const diff = ret.getTime() - pickup.getTime();
      if (isNaN(diff)) return sum;
      const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0);

    const avgBookingValue = nonCancelled.length > 0 ? totalSpent / nonCancelled.length : 0;

    const hasSignedAgreement = customerBookings.some((b) => b.agreement_signed_at);

    const sortedBookings = [...customerBookings].sort(
      (a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
    );
    const lastBooking = sortedBookings[0];
    const firstBooking = sortedBookings[sortedBookings.length - 1];

    return {
      totalSpent,
      completedTrips,
      activeTrips,
      cancelledTrips,
      totalBookings,
      totalDays,
      avgBookingValue,
      hasSignedAgreement,
      lastBooking,
      firstBooking,
    };
  }, [customerBookings]);

  // Get document URLs: prefer customer-level docs, fall back to booking-level
  const latestIdUrl = selectedCustomer?.idDocumentUrl || customerBookings.find((b) => b.id_document_url)?.id_document_url;
  const latestInsuranceUrl = customerBookings.find((b) => b.insurance_proof_url)?.insurance_proof_url;

  // === FULL-SCREEN CUSTOMER DETAIL VIEW ===
  if (selectedCustomer) {
    return (
      <>
        {/* Toast notifications */}
        {toastSuccess && (
          <div className="fixed top-4 right-4 z-[60] rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 shadow-lg">
            {toastSuccess}
          </div>
        )}
        {toastError && (
          <div className="fixed top-4 right-4 z-[60] rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 shadow-lg">
            {toastError}
          </div>
        )}
        <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <button onClick={closeCustomer} className="flex items-center gap-1 text-sm text-purple-300 hover:text-white mb-2 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to all customers
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {profilePictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePictureUrl}
                      alt={selectedCustomer.name}
                      className="h-14 w-14 rounded-full object-cover border-2 border-purple-400"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-xl font-bold">
                      {selectedCustomer.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  {latestIdUrl && (
                    <button
                      onClick={() => openCropModal(latestIdUrl)}
                      className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white text-purple-700 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Crop profile picture from ID"
                      aria-label="Crop profile picture from ID"
                    >
                      <Crop className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    {selectedCustomer.name || "Unknown"}
                    {selectedCustomer.role === "admin" && (
                      <Badge className="bg-purple-500 text-white text-xs"><Shield className="h-3 w-3 mr-0.5" /> Admin</Badge>
                    )}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-purple-200 mt-0.5">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {selectedCustomer.email || "No email"}</span>
                    {selectedCustomer.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {selectedCustomer.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const params = new URLSearchParams({
                      customerId: selectedCustomer.id,
                      customerName: selectedCustomer.name,
                      customerEmail: selectedCustomer.email,
                      ...(selectedCustomer.phone ? { customerPhone: selectedCustomer.phone } : {}),
                    });
                    router.push(`/admin/bookings?${params.toString()}`);
                  }}
                  variant="outline"
                  className="border-green-300 text-green-600 hover:bg-green-50"
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create Booking
                </Button>
                <Button
                  onClick={sendPasswordLink}
                  disabled={sendingPasswordLink}
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  size="sm"
                >
                  <KeyRound className="h-3.5 w-3.5 mr-1" /> {sendingPasswordLink ? "Sending..." : "Send Password Link"}
                </Button>
                <Button
                  onClick={deleteCustomer}
                  disabled={deletingCustomer}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  size="sm"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
                <button
                  onClick={closeCustomer}
                  aria-label="Close customer details"
                  className="rounded-full p-2 hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <PageContainer className="py-6">
          {loadingBookings ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-500">Loading customer data...</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <DollarSign className="mx-auto h-5 w-5 text-green-500 mb-1" />
                      <p className="text-2xl font-bold text-gray-900">${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-500">Total Spent</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Car className="mx-auto h-5 w-5 text-purple-500 mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                      <p className="text-xs text-gray-500">Total Bookings</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CheckCircle2 className="mx-auto h-5 w-5 text-green-500 mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{stats.completedTrips}</p>
                      <p className="text-xs text-gray-500">Completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="mx-auto h-5 w-5 text-blue-500 mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{stats.activeTrips}</p>
                      <p className="text-xs text-gray-500">Active / Upcoming</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="mx-auto h-5 w-5 text-indigo-500 mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{stats.totalDays}</p>
                      <p className="text-xs text-gray-500">Total Rental Days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CreditCard className="mx-auto h-5 w-5 text-amber-500 mb-1" />
                      <p className="text-2xl font-bold text-gray-900">${(stats.avgBookingValue ?? 0).toFixed(0)}</p>
                      <p className="text-xs text-gray-500">Avg. Booking</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column: Customer Info */}
                <div className="space-y-4 min-w-0">
                  {/* Customer Info Card */}
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase">Customer Info</h3>
                        {!editingMode ? (
                          <Button
                            onClick={startEditingCustomer}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            aria-label="Edit customer information"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-gray-400">Full Name</span>
                          {editingMode ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="mt-1"
                              placeholder="Full name"
                            />
                          ) : (
                            <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">Email</span>
                          {editingMode ? (
                            <Input
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              type="email"
                              className="mt-1"
                              placeholder="Email address"
                            />
                          ) : (
                            <p className="text-gray-700">{selectedCustomer.email}</p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">Phone</span>
                          {editingMode ? (
                            <Input
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="mt-1"
                              placeholder="Phone number"
                            />
                          ) : (
                            <p className="text-gray-700">{selectedCustomer.phone || "Not provided"}</p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">Member Since</span>
                          <p className="text-lg font-bold text-black">{formatDate(selectedCustomer.createdAt)}</p>
                        </div>
                        {stats?.firstBooking && (
                          <div>
                            <span className="text-xs text-gray-400">First Booking</span>
                            <p className="text-sm font-semibold text-black">{formatDate(stats.firstBooking.created_at)}</p>
                          </div>
                        )}
                        {stats?.lastBooking && (
                          <div>
                            <span className="text-xs text-gray-400">Last Booking</span>
                            <p className="text-sm font-semibold text-black">{formatDate(stats.lastBooking.created_at)}</p>
                          </div>
                        )}
                      </div>
                      {editingMode && (
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          <Button
                            onClick={saveCustomerEdit}
                            disabled={savingEdit}
                            size="sm"
                            className="flex-1"
                          >
                            Save Changes
                          </Button>
                          <Button
                            onClick={cancelCustomerEdit}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Document Status Card */}
                  <Card className="overflow-hidden">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Documents</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm text-gray-600">
                            <ImageIcon className="h-4 w-4" /> ID Document
                          </span>
                          {latestIdUrl ? (
                            <a href={latestIdUrl} target="_blank" rel="noopener noreferrer">
                              <Badge className="bg-green-100 text-green-700 cursor-pointer hover:bg-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded
                              </Badge>
                            </a>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500">
                              <XCircle className="h-3 w-3 mr-1" /> Missing
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm text-gray-600">
                            <Shield className="h-4 w-4" /> Insurance Proof
                          </span>
                          {latestInsuranceUrl ? (
                            <a href={latestInsuranceUrl} target="_blank" rel="noopener noreferrer">
                              <Badge className="bg-green-100 text-green-700 cursor-pointer hover:bg-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded
                              </Badge>
                            </a>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500">
                              <XCircle className="h-3 w-3 mr-1" /> Missing
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm text-gray-600">
                            <FileText className="h-4 w-4" /> Rental Agreement
                          </span>
                          {stats?.hasSignedAgreement ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Signed
                            </Badge>
                          ) : customerBookings.length === 0 ? (
                            <Badge className="bg-gray-100 text-gray-500">
                              N/A
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700">
                              <AlertCircle className="h-3 w-3 mr-1" /> Pending
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Direct Customer ID Upload (no booking required) */}
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Upload ID Document</p>
                        <label className="block">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={handleCustomerDocUpload}
                            disabled={uploadingCustomerDoc}
                            className="hidden"
                            id="customer-doc-upload-input"
                          />
                          <Button
                            onClick={() => document.getElementById("customer-doc-upload-input")?.click()}
                            disabled={uploadingCustomerDoc}
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                          >
                            {uploadingCustomerDoc ? (
                              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</>
                            ) : (
                              <><Upload className="h-3 w-3 mr-1" /> {latestIdUrl ? "Replace ID Document" : "Upload Driver License"}</>
                            )}
                          </Button>
                        </label>
                      </div>

                      {/* Booking-specific Document Upload */}
                      {customerBookings.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Upload to Booking</p>
                          <div className="space-y-2">
                            <div className="flex gap-2 w-full min-w-0">
                              <select
                                value={uploadDocType}
                                onChange={(e) => setUploadDocType(e.target.value as "id_document" | "insurance_proof")}
                                className="text-xs border rounded px-2 py-1 flex-1 min-w-0 truncate"
                              >
                                <option value="id_document">ID Document</option>
                                <option value="insurance_proof">Insurance Proof</option>
                              </select>
                              <select
                                value={selectedBookingForUpload || ""}
                                onChange={(e) => setSelectedBookingForUpload(e.target.value)}
                                className="text-xs border rounded px-2 py-1 flex-1 min-w-0 truncate"
                              >
                                <option value="">Select Booking</option>
                                {customerBookings.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.vehicleName || "Unknown"} - {formatDate(b.pickup_date)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {selectedBookingForUpload && (
                              <label className="block">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,application/pdf"
                                  onChange={handleDocumentUpload}
                                  disabled={uploadingDoc}
                                  className="hidden"
                                  id="doc-upload-input"
                                />
                                <Button
                                  onClick={() => document.getElementById("doc-upload-input")?.click()}
                                  disabled={uploadingDoc}
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs"
                                >
                                  {uploadingDoc ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-3 w-3 mr-1" /> Choose File
                                    </>
                                  )}
                                </Button>
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ID Document Preview */}
                      {latestIdUrl && (
                        <div className="mt-4 pt-3 border-t overflow-hidden">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-400">ID Document Preview</p>
                            <Button
                              onClick={() => openCropModal(latestIdUrl)}
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2"
                            >
                              <Crop className="h-3 w-3 mr-1" /> Crop Profile Pic
                            </Button>
                          </div>
                          <a href={latestIdUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={latestIdUrl}
                              alt="Customer ID"
                              className="w-full max-h-40 object-contain bg-gray-50 hover:opacity-80 transition-opacity"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </a>
                        </div>
                      )}

                      {/* Insurance Preview */}
                      {latestInsuranceUrl && (
                        <div className="mt-3 pt-3 border-t overflow-hidden">
                          <p className="text-xs text-gray-400 mb-2">Insurance Proof Preview</p>
                          <a href={latestInsuranceUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={latestInsuranceUrl}
                              alt="Insurance Proof"
                              className="w-full max-h-40 object-contain bg-gray-50 hover:opacity-80 transition-opacity"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Risk Assessment */}
                  {stats && stats.totalBookings > 0 && (
                    <Card>
                      <CardContent className="p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Risk Assessment</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Cancellation Rate</span>
                            <span className={`text-sm font-bold ${
                              stats.totalBookings > 0 && stats.cancelledTrips / stats.totalBookings > 0.3
                                ? "text-red-600"
                                : stats.totalBookings > 0 && stats.cancelledTrips / stats.totalBookings > 0.15
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }`}>
                              {stats.totalBookings > 0 ? ((stats.cancelledTrips / stats.totalBookings) * 100).toFixed(0) : "0"}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                stats.totalBookings > 0 && stats.cancelledTrips / stats.totalBookings > 0.3
                                  ? "bg-red-500"
                                  : stats.totalBookings > 0 && stats.cancelledTrips / stats.totalBookings > 0.15
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                              style={{ width: `${stats.totalBookings > 0 ? Math.min(100, (stats.cancelledTrips / stats.totalBookings) * 100) : 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-600">No-shows</span>
                            <span className="text-sm font-bold text-gray-900">
                              {customerBookings.filter((b) => b.status === "no-show").length}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column: Tickets & Booking History */}
                <div className="lg:col-span-2 min-w-0">
                  {/* Tickets Section */}
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase">
                          Tickets ({customerTickets.length})
                        </h3>
                        {customerTickets.length > 0 && (
                          <span className="text-xs font-bold text-red-600">
                            ${customerTickets.filter((t) => t.status === "unpaid").reduce((s, t) => s + (t.amountDue ?? 0), 0).toLocaleString()} unpaid
                          </span>
                        )}
                      </div>
                      {customerTickets.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No tickets for this customer</p>
                      ) : (
                        <div className="space-y-2">
                          {customerTickets
                            .sort((a, b) => new Date(b.violationDate).getTime() - new Date(a.violationDate).getTime())
                            .map((t) => (
                              <div
                                key={t.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                  t.status === "unpaid"
                                    ? "bg-red-50 border-red-100"
                                    : t.status === "paid"
                                      ? "bg-green-50 border-green-100"
                                      : "bg-gray-50 border-gray-100"
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  t.ticketType === "traffic" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                }`}>
                                  <Ticket className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {t.prefix && t.ticketNumber ? `${t.prefix}-${t.ticketNumber}` : t.ticketType === "traffic" ? "Traffic Violation" : "Parking Violation"}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${
                                      t.status === "unpaid" ? "bg-red-100 text-red-700"
                                        : t.status === "paid" ? "bg-green-100 text-green-700"
                                        : t.status === "disputed" ? "bg-amber-100 text-amber-700"
                                        : "bg-gray-100 text-gray-600"
                                    }`}>
                                      {t.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {t.municipality}{t.state ? `, ${t.state}` : ""} · {formatDate(t.violationDate)}
                                    {t.vehicleName ? ` · ${t.vehicleName}` : ""}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`text-sm font-bold ${t.status === "unpaid" ? "text-red-600" : "text-gray-600"}`}>
                                    ${t.amountDue.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Booking History */}
                  <Card className="mt-4">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">
                        Booking History ({customerBookings.length})
                      </h3>
                      {customerBookings.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No bookings found for this customer.</p>
                      ) : (
                        <div className="space-y-3">
                          {customerBookings
                            .sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime())
                            .map((b) => {
                              const pickupDate = b.pickup_date || "";
                              const returnDate = b.return_date || "";
                              const price = b.total_price ?? 0;
                              const vehicle = b.vehicleName || "Unknown";

                              return (
                                <div
                                  key={b.id}
                                  onClick={() => router.push(`/admin/bookings?booking=${b.id}`)}
                                  className="rounded-lg border p-4 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                                >
                                  <div className="flex items-start justify-between mb-2 min-w-0">
                                    <div className="min-w-0 flex-1 mr-2">
                                      <p className="font-semibold text-gray-900 truncate group-hover:text-purple-700 transition-colors">{vehicle}</p>
                                      <p className="text-xs font-mono text-gray-400 truncate">{b.id}</p>
                                    </div>
                                    <Badge className={statusColors[b.status] || "bg-gray-100 text-gray-600"}>
                                      {b.status}
                                    </Badge>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                    <div>
                                      <span className="text-xs text-gray-400">Pickup</span>
                                      <p className="text-sm font-bold text-black">{formatDate(pickupDate)}</p>
                                      {b.pickup_time && <p className="text-xs text-gray-500">{formatTime(b.pickup_time)}</p>}
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-400">Return</span>
                                      <p className="text-sm font-bold text-black">{formatDate(returnDate)}</p>
                                      {b.return_time && <p className="text-xs text-gray-500">{formatTime(b.return_time)}</p>}
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-400">Total</span>
                                      <p className="text-sm font-semibold text-green-600">${price.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-400">Booked On</span>
                                      <p className="text-sm font-bold text-black">{formatDate(b.created_at)}</p>
                                    </div>
                                  </div>

                                  {/* Document indicators */}
                                  <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                                    <span className={`text-xs flex items-center gap-1 ${b.id_document_url ? "text-green-600" : "text-gray-400"}`}>
                                      {b.id_document_url ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      ID
                                    </span>
                                    <span className={`text-xs flex items-center gap-1 ${b.insurance_proof_url ? "text-green-600" : "text-gray-400"}`}>
                                      {b.insurance_proof_url ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      Insurance
                                    </span>
                                    <span className={`text-xs flex items-center gap-1 ${b.agreement_signed_at ? "text-green-600" : "text-gray-400"}`}>
                                      {b.agreement_signed_at ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      Agreement
                                    </span>
                                    {b.rental_agreement_url && (
                                      <a
                                        href={b.rental_agreement_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-purple-600 hover:text-purple-800 ml-auto flex items-center gap-1"
                                      >
                                        <FileText className="h-3 w-3" /> View Agreement
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>
              </div>
            </>
          )}
        </PageContainer>

        {/* Crop Profile Picture Modal — must be inside detail-view return */}
        {showCropModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Crop className="h-5 w-5 text-purple-600" /> Crop Profile Picture
                  </h2>
                  <button
                    onClick={closeCropModal}
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {cropError && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {cropError}
                  </div>
                )}

                {cropLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                    <span className="ml-2 text-sm text-gray-500">Loading image...</span>
                  </div>
                ) : cropBlobUrl ? (
                  <>
                    <p className="text-sm text-gray-500 mb-4">
                      Drag the crop area over the face. Use zoom controls to resize the crop area, then click &quot;Preview Crop&quot; to see the result.
                    </p>

                    {/* Crop workspace */}
                    <div
                      ref={cropContainerRef}
                      className="relative bg-gray-100 rounded-lg overflow-hidden mb-4 select-none"
                      style={{ maxHeight: "400px" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={cropImageRef}
                        src={cropBlobUrl}
                        alt="ID to crop"
                        className="w-full h-auto"
                        draggable={false}
                        onLoad={handleCropImageLoad}
                      />
                      {/* Crop overlay */}
                      {imageNaturalSize.w > 0 && imageDisplaySize.w > 0 && (
                        <div
                          onMouseDown={handleCropMouseDown}
                          className="absolute border-2 border-white rounded-full shadow-lg cursor-move"
                          style={{
                            left: `${(cropPosition.x / imageNaturalSize.w) * imageDisplaySize.w}px`,
                            top: `${(cropPosition.y / imageNaturalSize.h) * imageDisplaySize.h}px`,
                            width: `${(cropSize / imageNaturalSize.w) * imageDisplaySize.w}px`,
                            height: `${(cropSize / imageNaturalSize.h) * imageDisplaySize.h}px`,
                            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Move className="h-6 w-6 text-white/70" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => adjustCropSize(-30)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Shrink crop area"
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-gray-500 w-16 text-center">
                          {Math.round(cropSize)}px
                        </span>
                        <Button
                          onClick={() => adjustCropSize(30)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Enlarge crop area"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        onClick={generateCropPreview}
                        variant="outline"
                        size="sm"
                      >
                        <Crop className="h-3.5 w-3.5 mr-1" /> Preview Crop
                      </Button>
                    </div>

                    {/* Preview */}
                    {cropPreview && (
                      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                        <div className="flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cropPreview}
                            alt="Cropped preview"
                            className="h-24 w-24 rounded-full object-cover border-2 border-purple-400"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">Preview</p>
                          <p className="text-xs text-gray-500 mt-1">
                            This is how the profile picture will look. If it doesn&apos;t look right, adjust the crop area and preview again.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={saveProfilePicture}
                        disabled={!cropPreview || savingProfilePic}
                        className="flex-1"
                      >
                        <User className="h-4 w-4 mr-1" />
                        {savingProfilePic ? "Saving..." : "Save as Profile Picture"}
                      </Button>
                      <Button
                        onClick={closeCropModal}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <p>No image to crop. Make sure the customer has an ID document uploaded.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  // === ADD CUSTOMER MODAL ===
  const AddCustomerModal = () => {
    const [formName, setFormName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleAddCustomer = async () => {
      if (!formName || !formEmail) {
        setToastError("Name and email are required");
        return;
      }

      setSubmitting(true);
      try {
        const res = await adminFetch("/api/admin/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            phone: formPhone,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setFormName("");
          setFormEmail("");
          setFormPhone("");
          setShowAddCustomerModal(false);
          fetchCustomers();
          setToastSuccess("Customer created successfully");
        } else {
          setToastError("Failed to create customer: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        logger.error("Failed to create customer:", err);
        setToastError("Error creating customer");
      }
      setSubmitting(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-4">Add New Customer</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-semibold">Full Name <span className="text-red-500">*</span></label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-semibold">Email <span className="text-red-500">*</span></label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-semibold">Phone (optional)</label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleAddCustomer}
                disabled={submitting}
                className="flex-1"
              >
                Create Customer
              </Button>
              <Button
                onClick={() => setShowAddCustomerModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // === CUSTOMER LIST VIEW ===
  return (
    <>
      {/* Toast notifications */}
      {toastSuccess && (
        <div className="fixed top-4 right-4 z-[60] rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 shadow-lg">
          {toastSuccess}
        </div>
      )}
      {toastError && (
        <div className="fixed top-4 right-4 z-[60] rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 shadow-lg">
          {toastError}
        </div>
      )}
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Customers</h1>
              <p className="mt-1 text-purple-200">{customers.length} total customers</p>
            </div>
            <Button
              onClick={() => setShowAddCustomerModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Customer
            </Button>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name or email..."
              className="pl-9 pr-9"
              aria-label="Search customers by name or email"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); fetchCustomers(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch} variant="outline">Search</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearchInput(""); fetchCustomers(); }}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Customer Cards Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-400">
              No customers found.
            </CardContent>
          </Card>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginateArray(customers).map((c) => (
              <Card
                key={c.id}
                className="hover:border-purple-300 hover:shadow-md transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => openCustomer(c)}
                    >
                      {c.profilePictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.profilePictureUrl}
                          alt={c.name}
                          className="h-10 w-10 rounded-full object-cover border border-purple-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex-shrink-0">
                          {c.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate" title={c.name}>{c.name}</p>
                        <p className="text-xs text-gray-500 truncate" title={c.email}>{c.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFromList(c);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        aria-label={`Delete customer ${c.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 cursor-pointer"
                    onClick={() => openCustomer(c)}
                  >
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span className="font-semibold text-black">{formatDate(c.createdAt)}</span>
                    </div>
                    {c.phone && (
                      <span className="text-xs text-gray-400">{c.phone}</span>
                    )}
                    {c.role === "admin" && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">Admin</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={customers.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[12, 24, 48, 96]}
          />
          </>
        )}
      </PageContainer>

      {showAddCustomerModal && <AddCustomerModal />}

      {/* Crop Profile Picture Modal */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Crop className="h-5 w-5 text-purple-600" /> Crop Profile Picture
                </h2>
                <button
                  onClick={closeCropModal}
                  className="rounded-full p-1 hover:bg-gray-100"
                  aria-label="Close crop modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cropError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {cropError}
                </div>
              )}

              {cropLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-sm text-gray-500">Loading image...</span>
                </div>
              ) : cropBlobUrl ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag the crop area over the face. Use zoom controls to resize the crop area, then click &quot;Preview Crop&quot; to see the result.
                  </p>

                  {/* Crop workspace */}
                  <div
                    ref={cropContainerRef}
                    className="relative bg-gray-100 rounded-lg overflow-hidden mb-4 select-none"
                    style={{ maxHeight: "400px" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={cropImageRef}
                      src={cropBlobUrl}
                      alt="ID to crop"
                      className="w-full h-auto"
                      draggable={false}
                      onLoad={handleCropImageLoad}
                    />
                    {/* Crop overlay */}
                    {imageNaturalSize.w > 0 && imageDisplaySize.w > 0 && (
                      <div
                        onMouseDown={handleCropMouseDown}
                        className="absolute border-2 border-white rounded-full shadow-lg cursor-move"
                        style={{
                          left: `${(cropPosition.x / imageNaturalSize.w) * imageDisplaySize.w}px`,
                          top: `${(cropPosition.y / imageNaturalSize.h) * imageDisplaySize.h}px`,
                          width: `${(cropSize / imageNaturalSize.w) * imageDisplaySize.w}px`,
                          height: `${(cropSize / imageNaturalSize.h) * imageDisplaySize.h}px`,
                          boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Move className="h-6 w-6 text-white/70" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => adjustCropSize(-30)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Shrink crop area"
                        aria-label="Shrink crop area"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-gray-500 w-16 text-center">
                        {Math.round(cropSize)}px
                      </span>
                      <Button
                        onClick={() => adjustCropSize(30)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Enlarge crop area"
                        aria-label="Enlarge crop area"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      onClick={generateCropPreview}
                      variant="outline"
                      size="sm"
                    >
                      <Crop className="h-3.5 w-3.5 mr-1" /> Preview Crop
                    </Button>
                  </div>

                  {/* Preview */}
                  {cropPreview && (
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                      <div className="flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cropPreview}
                          alt="Cropped preview"
                          className="h-24 w-24 rounded-full object-cover border-2 border-purple-400"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">Preview</p>
                        <p className="text-xs text-gray-500 mt-1">
                          This is how the profile picture will look. If it doesn&apos;t look right, adjust the crop area and preview again.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={saveProfilePicture}
                      disabled={!cropPreview || savingProfilePic}
                      className="flex-1"
                    >
                      {savingProfilePic ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4 mr-1" />
                          Save as Profile Picture
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={closeCropModal}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>No image to crop. Make sure the customer has an ID document uploaded.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
