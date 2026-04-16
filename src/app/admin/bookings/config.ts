"use client";

export type BookingsPanelMode = "admin" | "manager";

export interface BookingsPageConfig {
  mode: BookingsPanelMode;
  homeHref: string;
  title: string;
  subtitle: string;
  bookingsEndpoint: string;
  vehiclesEndpoint: string;
  customersEndpoint: string;
  sendBookingEmailEndpoint: string | null;
  customerDetailsBasePath: string;
  ticketsPagePath: string;
  capabilities: {
    canExportCsv: boolean;
    canBulkUpdate: boolean;
    canBulkEmail: boolean;
    canCreateBookings: boolean;
    canSendBookingEmail: boolean;
    canViewAdminNotes: boolean;
    canViewActivityTimeline: boolean;
    canManagePayments: boolean;
    canExtendBooking: boolean;
  };
}

export const adminBookingsConfig: BookingsPageConfig = {
  mode: "admin",
  homeHref: "/admin",
  title: "All Bookings",
  subtitle: "Manage and track all reservations.",
  bookingsEndpoint: "/api/bookings",
  vehiclesEndpoint: "/api/admin/vehicles",
  customersEndpoint: "/api/admin/customers",
  sendBookingEmailEndpoint: "/api/admin/send-booking-email",
  customerDetailsBasePath: "/admin/customers",
  ticketsPagePath: "/admin/tickets",
  capabilities: {
    canExportCsv: true,
    canBulkUpdate: true,
    canBulkEmail: true,
    canCreateBookings: true,
    canSendBookingEmail: true,
    canViewAdminNotes: true,
    canViewActivityTimeline: true,
    canManagePayments: true,
    canExtendBooking: true,
  },
};

export const managerBookingsConfig: BookingsPageConfig = {
  mode: "manager",
  homeHref: "/manager",
  title: "Bookings",
  subtitle: "View all active and upcoming trips. Pricing is shown only on trips you created.",
  bookingsEndpoint: "/api/manager/bookings",
  vehiclesEndpoint: "/api/admin/vehicles",
  customersEndpoint: "/api/admin/customers",
  sendBookingEmailEndpoint: null,
  customerDetailsBasePath: "/manager/customers",
  ticketsPagePath: "/manager/tickets",
  capabilities: {
    canExportCsv: false,
    canBulkUpdate: false,
    canBulkEmail: false,
    canCreateBookings: true,
    canSendBookingEmail: false,
    canViewAdminNotes: false,
    canViewActivityTimeline: false,
    canManagePayments: false,
    canExtendBooking: false,
  },
};
