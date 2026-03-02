"use client";

import React, { useEffect, useState } from "react";
import { Users, Search, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
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

interface Booking {
  id: string;
  vehicle_name?: string;
  vehicleName?: string;
  pickup_date?: string;
  pickupDate?: string;
  return_date?: string;
  returnDate?: string;
  total_price?: number;
  totalPrice?: number;
  status: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({});
  const [loadingBookings, setLoadingBookings] = useState<string | null>(null);

  const fetchCustomers = async (query = "") => {
    setLoading(true);
    try {
      const url = query ? `/api/admin/customers?search=${encodeURIComponent(query)}` : "/api/admin/customers";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleSearch = () => {
    setSearch(searchInput);
    fetchCustomers(searchInput);
  };

  const toggleBookings = async (customerId: string, email: string) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customerId);
    if (bookings[customerId]) return;

    setLoadingBookings(customerId);
    try {
      const res = await fetch(`/api/bookings?customer_email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success) {
        setBookings((prev) => ({ ...prev, [customerId]: data.data || [] }));
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
    setLoadingBookings(null);
  };

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Customers</h1>
              <p className="mt-1 text-purple-200">{customers.length} customers</p>
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
          <Button variant="outline" size="sm" onClick={() => { setSearchInput(""); setSearch(""); fetchCustomers(); }} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    {search ? "No customers match your search." : "No customers found."}
                  </td></tr>
                ) : (
                  customers.map((c) => (
                    <React.Fragment key={c.id}>
                      <tr className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-medium text-gray-900">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.email}</td>
                        <td className="px-4 py-3 text-gray-600">{c.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge className={c.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}>
                            {c.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => toggleBookings(c.id, c.email)}
                          >
                            {expandedId === c.id ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                            View
                          </Button>
                        </td>
                      </tr>
                      {/* Expanded bookings row */}
                      {expandedId === c.id && (
                        <tr>
                          <td colSpan={6} className="px-8 py-3 bg-gray-50">
                            {loadingBookings === c.id ? (
                              <p className="text-sm text-gray-400">Loading bookings...</p>
                            ) : !bookings[c.id] || bookings[c.id].length === 0 ? (
                              <p className="text-sm text-gray-400">No bookings found for this customer.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="text-left py-1 pr-4 font-medium">Booking ID</th>
                                    <th className="text-left py-1 pr-4 font-medium">Vehicle</th>
                                    <th className="text-left py-1 pr-4 font-medium">Dates</th>
                                    <th className="text-left py-1 pr-4 font-medium">Total</th>
                                    <th className="text-left py-1 font-medium">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bookings[c.id].map((b) => (
                                    <tr key={b.id} className="border-t border-gray-200">
                                      <td className="py-1.5 pr-4 font-mono text-gray-600">{b.id?.slice(0, 12)}...</td>
                                      <td className="py-1.5 pr-4">{b.vehicle_name || b.vehicleName || "—"}</td>
                                      <td className="py-1.5 pr-4 text-gray-500">
                                        {(b.pickup_date || b.pickupDate) ? new Date(b.pickup_date || b.pickupDate || "").toLocaleDateString() : "—"}
                                        {" → "}
                                        {(b.return_date || b.returnDate) ? new Date(b.return_date || b.returnDate || "").toLocaleDateString() : "—"}
                                      </td>
                                      <td className="py-1.5 pr-4 font-medium">${b.total_price || b.totalPrice || 0}</td>
                                      <td className="py-1.5">
                                        <Badge variant="secondary" className="text-xs">{b.status}</Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>
    </>
  );
}
