"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/utils/admin-fetch";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
}

interface BookingRow {
  id: string;
  vehicle_id?: string;
  vehicleName?: string;
  pickup_date?: string;
  return_date?: string;
  pickup_time?: string;
  return_time?: string;
  total_price?: number;
  deposit?: number;
  status: string;
  created_at?: string;
  id_document_url?: string;
  insurance_proof_url?: string;
  insurance_opted_out?: boolean;
  rental_agreement_url?: string;
  agreement_signed_at?: string;
  signed_name?: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [customerBookings, setCustomerBookings] = useState<BookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingMode, setEditingMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedBookingForUpload, setSelectedBookingForUpload] = useState<string | null>(null);
  const [uploadDocType, setUploadDocType] = useState<"id_document" | "insurance_proof">("id_document");
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  const fetchCustomers = async (query = "") => {
    setLoading(true);
    try {
      const url = query ? `/api/admin/customers?search=${encodeURIComponent(query)}` : "/api/admin/customers";
      const res = await adminFetch(url);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
    setLoading(false);
  };

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

  const handleSearch = () => fetchCustomers(searchInput);

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
    } catch (err) {
      console.error("Failed to fetch customer bookings:", err);
    }
    setLoadingBookings(false);
  };

  const closeCustomer = () => {
    setSelectedCustomer(null);
    setCustomerBookings([]);
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
      alert("Name and email are required");
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

      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(data.data);
        setEditingMode(false);
        alert("Customer updated successfully");
      } else {
        alert("Failed to update customer: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to update customer:", err);
      alert("Error updating customer");
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

      const data = await res.json();
      if (data.success) {
        alert("Customer deleted successfully");
        closeCustomer();
        fetchCustomers();
      } else {
        alert("Failed to delete customer: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to delete customer:", err);
      alert("Error deleting customer");
    }
    setDeletingCustomer(false);
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

      const data = await res.json();
      if (data.success) {
        alert("Document uploaded successfully");
        setSelectedBookingForUpload(null);
        setUploadDocType("id_document");
        if (selectedCustomer) {
          await openCustomer(selectedCustomer);
        }
      } else {
        alert("Failed to upload document: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to upload document:", err);
      alert("Error uploading document");
    }
    setUploadingDoc(false);
  };

  const handleDeleteFromList = async (customer: CustomerRow) => {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;
    try {
      const res = await adminFetch(`/api/admin/customers?id=${customer.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchCustomers();
      } else {
        alert("Failed to delete customer");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Error deleting customer");
    }
  };

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
      const pickup = new Date((b.pickup_date || "") + "T00:00:00");
      const ret = new Date((b.return_date || "") + "T00:00:00");
      const days = Math.max(1, Math.ceil((ret.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)));
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

  // Get document URLs from bookings
  const latestIdUrl = customerBookings.find((b) => b.id_document_url)?.id_document_url;
  const latestInsuranceUrl = customerBookings.find((b) => b.insurance_proof_url)?.insurance_proof_url;

  // === FULL-SCREEN CUSTOMER DETAIL VIEW ===
  if (selectedCustomer) {
    return (
      <>
        <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <button onClick={closeCustomer} className="flex items-center gap-1 text-sm text-purple-300 hover:text-white mb-2 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to all customers
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-xl font-bold">
                  {selectedCustomer.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    {selectedCustomer.name}
                    {selectedCustomer.role === "admin" && (
                      <Badge className="bg-purple-500 text-white text-xs"><Shield className="h-3 w-3 mr-0.5" /> Admin</Badge>
                    )}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-purple-200 mt-0.5">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {selectedCustomer.email}</span>
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
                      <p className="text-2xl font-bold text-gray-900">${stats.avgBookingValue.toFixed(0)}</p>
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
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700">
                              <AlertCircle className="h-3 w-3 mr-1" /> Pending
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Admin Document Upload */}
                      {customerBookings.length > 0 && (
                        <div className="mt-4 pt-3 border-t">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Admin: Upload Documents</p>
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
                                  <Upload className="h-3 w-3 mr-1" /> {uploadingDoc ? "Uploading..." : "Choose File"}
                                </Button>
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ID Document Preview */}
                      {latestIdUrl && (
                        <div className="mt-4 pt-3 border-t overflow-hidden">
                          <p className="text-xs text-gray-400 mb-2">ID Document Preview</p>
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
                              stats.cancelledTrips / stats.totalBookings > 0.3
                                ? "text-red-600"
                                : stats.cancelledTrips / stats.totalBookings > 0.15
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }`}>
                              {((stats.cancelledTrips / stats.totalBookings) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                stats.cancelledTrips / stats.totalBookings > 0.3
                                  ? "bg-red-500"
                                  : stats.cancelledTrips / stats.totalBookings > 0.15
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(100, (stats.cancelledTrips / stats.totalBookings) * 100)}%` }}
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

                {/* Right Column: Booking History */}
                <div className="lg:col-span-2 min-w-0">
                  <Card>
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
                                  className="rounded-lg border p-4 hover:border-purple-200 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="font-semibold text-gray-900">{vehicle}</p>
                                      <p className="text-xs font-mono text-gray-400">{b.id}</p>
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
        alert("Name and email are required");
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
          alert("Customer created successfully");
        } else {
          alert("Failed to create customer: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        console.error("Failed to create customer:", err);
        alert("Error creating customer");
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
                <label className="text-xs text-gray-600 font-semibold">Full Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-semibold">Email</label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="mt-1"
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
              className="pl-9"
            />
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customers.map((c) => (
              <Card
                key={c.id}
                className="hover:border-purple-300 hover:shadow-md transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => openCustomer(c)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex-shrink-0">
                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
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
        )}
      </PageContainer>

      {showAddCustomerModal && <AddCustomerModal />}
    </>
  );
}
