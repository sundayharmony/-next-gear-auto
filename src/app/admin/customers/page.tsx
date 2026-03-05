"use client";

import React, { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";

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
  vehicle_name?: string;
  vehicleName?: string;
  pickup_date?: string;
  pickupDate?: string;
  return_date?: string;
  returnDate?: string;
  pickup_time?: string;
  return_time?: string;
  total_price?: number;
  totalPrice?: number;
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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  "no-show": "bg-orange-100 text-orange-700",
};

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const date = new Date(d.includes("T") ? d : d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatTime = (t?: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const formatFullDate = (d?: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [customerBookings, setCustomerBookings] = useState<BookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

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

  useEffect(() => { fetchCustomers(); }, []);

  const handleSearch = () => fetchCustomers(searchInput);

  const openCustomer = async (customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setLoadingBookings(true);
    try {
      const res = await fetch(`/api/bookings?customer_email=${encodeURIComponent(customer.email)}`);
      const data = await res.json();
      if (data.success) {
        setCustomerBookings(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch customer bookings:", err);
    }
    setLoadingBookings(false);
  };

  const closeCustomer = () => {
    setSelectedCustomer(null);
    setCustomerBookings([]);
  };

  // Customer statistics
  const stats = useMemo(() => {
    if (!customerBookings.length) return null;

    const nonCancelled = customerBookings.filter((b) => b.status !== "cancelled");
    const totalSpent = nonCancelled.reduce((sum, b) => sum + (b.total_price || b.totalPrice || 0), 0);
    const completedTrips = customerBookings.filter((b) => b.status === "completed").length;
    const activeTrips = customerBookings.filter((b) => b.status === "active" || b.status === "confirmed").length;
    const cancelledTrips = customerBookings.filter((b) => b.status === "cancelled").length;
    const totalBookings = customerBookings.length;

    const totalDays = nonCancelled.reduce((sum, b) => {
      const pickup = new Date((b.pickup_date || b.pickupDate || "") + "T00:00:00");
      const ret = new Date((b.return_date || b.returnDate || "") + "T00:00:00");
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
        <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <button onClick={closeCustomer} className="flex items-center gap-1 text-sm text-purple-300 hover:text-white mb-2 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to all customers
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
              <button
                onClick={closeCustomer}
                className="rounded-full p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
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
                <div className="space-y-4">
                  {/* Customer Info Card */}
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Customer Info</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-gray-400">Full Name</span>
                          <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">Email</span>
                          <p className="text-gray-700">{selectedCustomer.email}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">Phone</span>
                          <p className="text-gray-700">{selectedCustomer.phone || "Not provided"}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">Member Since</span>
                          <p className="text-lg font-bold text-black">{formatFullDate(selectedCustomer.createdAt)}</p>
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
                    </CardContent>
                  </Card>

                  {/* Document Status Card */}
                  <Card>
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

                      {/* ID Document Preview */}
                      {latestIdUrl && (
                        <div className="mt-4 pt-3 border-t">
                          <p className="text-xs text-gray-400 mb-2">ID Document Preview</p>
                          <a href={latestIdUrl} target="_blank" rel="noopener noreferrer" className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={latestIdUrl}
                              alt="Customer ID"
                              className="rounded-lg border w-full max-h-40 object-cover hover:opacity-80 transition-opacity"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </a>
                        </div>
                      )}

                      {/* Insurance Preview */}
                      {latestInsuranceUrl && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-400 mb-2">Insurance Proof Preview</p>
                          <a href={latestInsuranceUrl} target="_blank" rel="noopener noreferrer" className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={latestInsuranceUrl}
                              alt="Insurance Proof"
                              className="rounded-lg border w-full max-h-40 object-cover hover:opacity-80 transition-opacity"
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
                <div className="lg:col-span-2">
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
                              const pickupDate = b.pickup_date || b.pickupDate || "";
                              const returnDate = b.return_date || b.returnDate || "";
                              const price = b.total_price || b.totalPrice || 0;
                              const vehicle = b.vehicle_name || b.vehicleName || "Unknown";

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
                className="cursor-pointer hover:border-purple-300 hover:shadow-md transition-all"
                onClick={() => openCustomer(c)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
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
    </>
  );
}
