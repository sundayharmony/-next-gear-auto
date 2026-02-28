"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car, Calendar, Clock, MapPin, FileText, User, Settings,
  CreditCard, ChevronRight, Download, XCircle, Star, LogOut, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/context/auth-context";
import bookings from "@/data/bookings.json";
import vehicles from "@/data/vehicles.json";

type Tab = "upcoming" | "past" | "profile" | "payment";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-green-100 text-green-700 border-green-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  "no-show": "bg-red-100 text-red-700 border-red-200",
};

export default function AccountPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <PageContainer className="py-20">
        <div className="mx-auto max-w-md text-center">
          <User className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-500 mb-6">Please sign in to access your account and manage your rentals.</p>
          <Link href="/login">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const upcomingBookings = bookings.filter((b) =>
    ["pending", "confirmed"].includes(b.status)
  );
  const pastBookings = bookings.filter((b) =>
    ["completed", "cancelled", "no-show"].includes(b.status)
  );

  const getVehicle = (vehicleId: string) => vehicles.find((v) => v.id === vehicleId);

  const tabs = [
    { id: "upcoming" as Tab, label: "Upcoming", icon: Calendar, count: upcomingBookings.length },
    { id: "past" as Tab, label: "Past Rentals", icon: Clock, count: pastBookings.length },
    { id: "profile" as Tab, label: "Profile", icon: User },
    { id: "payment" as Tab, label: "Payment", icon: CreditCard },
  ];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/30 text-xl font-bold">
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]}</h1>
                <p className="text-purple-200">Manage your rentals and account settings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user.role === "admin" && (
                <Link href="/admin">
                  <Button size="sm" variant="outline" className="border-purple-400 text-purple-200 hover:bg-purple-800">
                    <Shield className="h-4 w-4 mr-1" /> Admin Dashboard
                  </Button>
                </Link>
              )}
              <Button size="sm" variant="outline" className="border-purple-400 text-purple-200 hover:bg-purple-800" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Sidebar tabs */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </span>
                  {tab.count !== undefined && (
                    <Badge variant="secondary" className="text-xs">{tab.count}</Badge>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Upcoming */}
            {activeTab === "upcoming" && (
              <>
                <h2 className="text-xl font-semibold text-gray-900">Upcoming Rentals</h2>
                {upcomingBookings.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-4">No upcoming rentals.</p>
                      <Link href="/fleet"><Button>Browse Fleet</Button></Link>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingBookings.map((booking) => {
                    const vehicle = getVehicle(booking.vehicleId);
                    return (
                      <Card key={booking.id} className="transition-shadow hover:shadow-md">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{vehicle?.name || "Vehicle"}</h3>
                              <p className="text-xs text-gray-400 mt-0.5">Booking #{booking.id}</p>
                            </div>
                            <Badge className={statusColors[booking.status]}>{booking.status}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div className="flex items-center gap-2 text-gray-500">
                              <Calendar className="h-4 w-4" />
                              <span>{booking.pickupDate} - {booking.returnDate}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <CreditCard className="h-4 w-4" />
                              <span className="font-medium text-gray-900">${booking.totalPrice}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <FileText className="h-3.5 w-3.5 mr-1" /> View Details
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </>
            )}

            {/* Past Rentals */}
            {activeTab === "past" && (
              <>
                <h2 className="text-xl font-semibold text-gray-900">Past Rentals</h2>
                {pastBookings.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Clock className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500">No past rentals yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  pastBookings.map((booking) => {
                    const vehicle = getVehicle(booking.vehicleId);
                    return (
                      <Card key={booking.id}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{vehicle?.name || "Vehicle"}</h3>
                              <p className="text-xs text-gray-400">Booking #{booking.id}</p>
                            </div>
                            <Badge className={statusColors[booking.status]}>{booking.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                            <span>{booking.pickupDate} - {booking.returnDate}</span>
                            <span className="font-medium text-gray-900">${booking.totalPrice}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-3.5 w-3.5 mr-1" /> Receipt
                            </Button>
                            <Button size="sm" variant="outline">
                              <Star className="h-3.5 w-3.5 mr-1" /> Leave Review
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </>
            )}

            {/* Profile */}
            {activeTab === "profile" && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Settings</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
                        <Input defaultValue={user.name} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                        <Input type="email" defaultValue={user.email} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
                        <Input type="tel" defaultValue={user.phone || ""} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Date of Birth</label>
                        <Input type="date" defaultValue={user.dob || ""} />
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-3">Change Password</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">Current Password</label>
                          <Input type="password" placeholder="Current password" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">New Password</label>
                          <Input type="password" placeholder="New password" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button>Save Changes</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Methods */}
            {activeTab === "payment" && (
              <>
                <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
                {user.paymentMethods && Array.isArray(user.paymentMethods) && user.paymentMethods.length > 0 ? (
                  (user.paymentMethods as Array<{ id: string; type: string; last4: string; expiryMonth: number; expiryYear: number; isDefault: boolean }>).map((pm) => (
                    <Card key={pm.id}>
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-14 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-700">
                            {pm.type.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{pm.type.charAt(0).toUpperCase() + pm.type.slice(1)} ending in {pm.last4}</p>
                            <p className="text-xs text-gray-400">Expires {pm.expiryMonth}/{pm.expiryYear}</p>
                          </div>
                        </div>
                        {pm.isDefault && <Badge className="bg-green-100 text-green-700">Default</Badge>}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-4">No payment methods on file.</p>
                    </CardContent>
                  </Card>
                )}
                <Button variant="outline" className="mt-2">
                  <CreditCard className="h-4 w-4 mr-2" /> Add Payment Method
                </Button>
              </>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
