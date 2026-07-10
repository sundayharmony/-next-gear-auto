"use client";

import { Loader2 } from "lucide-react";
import type { StaffPanelBase } from "@/lib/admin/staff-panel-base";
import type { CustomerRow } from "../use-customers-data";
import { useCustomerDetail } from "../use-customer-detail";
import { CustomerProfileHeader } from "./CustomerProfileHeader";
import { CustomerStatsGrid } from "./CustomerStatsGrid";
import { CustomerContactCard } from "./CustomerContactCard";
import { CustomerDocumentsCard } from "./CustomerDocumentsCard";
import { CustomerRiskCard } from "./CustomerRiskCard";
import { CustomerTicketsCard } from "./CustomerTicketsCard";
import { CustomerBookingsCard } from "./CustomerBookingsCard";
import { ProfilePictureCropModal } from "./ProfilePictureCropModal";

export function CustomerDetailPanel({
  customer,
  panelBase,
  canMutateCustomers,
  setCustomers,
  onClose,
  onSuccess,
  onError,
  onRefreshList,
  showBack = false,
}: {
  customer: CustomerRow;
  panelBase: StaffPanelBase;
  canMutateCustomers: boolean;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerRow[]>>;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefreshList: () => void;
  showBack?: boolean;
}) {
  const detail = useCustomerDetail({
    initialCustomer: customer,
    setCustomers,
    onSuccess,
    onError,
    onRefreshList,
    onClose,
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <CustomerProfileHeader
        customer={detail.customer}
        panelBase={panelBase}
        canMutateCustomers={canMutateCustomers}
        showBack={showBack}
        onClose={onClose}
        detail={detail}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
        {detail.loadingBookings ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-3" />
            <p className="text-sm">Loading customer data…</p>
          </div>
        ) : (
          <>
            <CustomerStatsGrid stats={detail.stats} />
            <CustomerContactCard
              customer={detail.customer}
              stats={detail.stats}
              canMutateCustomers={canMutateCustomers}
              detail={detail}
            />
            <CustomerDocumentsCard
              bookings={detail.customerBookings}
              stats={detail.stats}
              detail={detail}
            />
            <CustomerRiskCard stats={detail.stats} bookings={detail.customerBookings} />
            <CustomerTicketsCard tickets={detail.customerTickets} />
            <CustomerBookingsCard bookings={detail.customerBookings} panelBase={panelBase} />
          </>
        )}
      </div>

      <ProfilePictureCropModal open={detail.showCropModal} crop={detail} />
    </div>
  );
}
