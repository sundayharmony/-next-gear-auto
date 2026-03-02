"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge } from "@/components/ui";
import {
  Search,
  ShieldCheck,
  ShieldX,
  Clock,
  Eye,
  X,
  Mail,
  Phone,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Booking, Customer } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/date-helpers";

interface CustomerWithBookings extends Customer {
  bookingHistory: Booking[];
  totalSpent: number;
}

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<CustomerWithBookings[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState<"all" | "verified" | "unverified">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBookings | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes] = await Promise.all([
          fetch("/api/bookings"),
        ]);
        const bookingsData = await bookingsRes.json();
        const allBookings: Booking[] = bookingsData.data || [];

        // Build customer list from bookings
        const customerMap = new Map<string, CustomerWithBookings>();
        allBookings.forEach((b) => {
          if (!customerMap.has(b.customerId)) {
            customerMap.set(b.customerId, {
              id: b.customerId,
              name: b.customerName || `Customer ${b.customerId.slice(-4)}`,
              email: `${(b.customerName || "customer").toLowerCase().replace(/\s+/g, ".")}@example.com`,
              phone: "(555) 000-0000",
              dob: "1990-01-01",
              driverLicense: Math.random() > 0.3
                ? {
                    imageUrl: "/images/id-placeholder.jpg",
                    verified: Math.random() > 0.5,
                    verifiedAt: Math.random() > 0.5 ? new Date().toISOString() : null,
                    verifiedBy: Math.random() > 0.5 ? "admin" : null,
                  }
                : null,
              paymentMethods: [],
              bookings: [],
              createdAt: b.createdAt,
              role: "customer",
              bookingHistory: [],
              totalSpent: 0,
            });
          }
          const customer = customerMap.get(b.customerId)!;
          customer.bookingHistory.push(b);
          if (b.status !== "cancelled") {
            customer.totalSpent += b.totalPrice;
          }
        });

        setCustomers(Array.from(customerMap.values()));
      } catch (error) {
        console.error("Failed to fetch customers:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterVerified === "all" ||
      (filterVerified === "verified" && c.driverLicense?.verified) ||
      (filterVerified === "unverified" && (!c.driverLicense || !c.driverLicense.verified));
    return matchesSearch && matchesFilter;
  });

  const handleVerifyId = (customerId: string, verified: boolean) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              driverLicense: c.driverLicense
                ? {
                    ...c.driverLicense,
                    verified,
                    verifiedAt: verified ? new Date().toISOString() : null,
                    verifiedBy: verified ? "admin" : null,
                  }
                : null,
            }
          : c
      )
    );
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer((prev) =>
        prev
          ? {
              ...prev,
              driverLicense: prev.driverLicense
                ? {
                    ...prev.driverLicense,
                    verified,
                    verifiedAt: verified ? new Date().toISOString() : null,
                    verifiedBy: verified ? "admin" : null,
                  }
                : null,
            }
          : null
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "verified", "unverified"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterVerified(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filterVerified === filter
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter((c) => c.driverLicense?.verified).length}
              </p>
              <p className="text-xs text-gray-500">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter((c) => c.driverLicense && !c.driverLicense.verified).length}
              </p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter((c) => !c.driverLicense).length}
              </p>
              <p className="text-xs text-gray-500">No ID</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary-light rounded-full flex items-center justify-center text-primary font-medium text-sm">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {customer.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Since {new Date(customer.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700">{customer.email}</p>
                        <p className="text-xs text-gray-500">{customer.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        {customer.driverLicense?.verified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        ) : customer.driverLicense ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <ShieldX className="w-3 h-3" />
                            Not Submitted
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {customer.bookingHistory.length}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedCustomer(customer)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                            title="View profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {customer.driverLicense && !customer.driverLicense.verified && (
                            <>
                              <button
                                onClick={() => handleVerifyId(customer.id, true)}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Verify ID"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleVerifyId(customer.id, false)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject ID"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Detail Panel */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedCustomer(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedCustomer.name}</h2>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {selectedCustomer.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedCustomer.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Member since {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* ID Verification */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500">ID Verification</h3>
                {selectedCustomer.driverLicense ? (
                  <div className={`p-4 rounded-lg border ${
                    selectedCustomer.driverLicense.verified
                      ? "bg-green-50 border-green-200"
                      : "bg-amber-50 border-amber-200"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-medium">
                          Driver&apos;s License
                        </span>
                      </div>
                      {selectedCustomer.driverLicense.verified ? (
                        <Badge variant="default">Verified</Badge>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyId(selectedCustomer.id, true)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyId(selectedCustomer.id, false)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No ID submitted</p>
                )}
              </div>

              {/* Booking History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">Booking History</h3>
                  <span className="text-sm text-gray-400">
                    Total: {formatCurrency(selectedCustomer.totalSpent)}
                  </span>
                </div>
                {selectedCustomer.bookingHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No bookings</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.bookingHistory.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {booking.vehicleName || booking.vehicleId}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(booking.pickupDate).toLocaleDateString()} -{" "}
                            {new Date(booking.returnDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(booking.totalPrice)}</p>
                          <span className="text-xs capitalize text-gray-500">{booking.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
