"use client";

import { cn } from "@/lib/utils/cn";
import type { StaffPanelBase } from "@/lib/admin/staff-panel-base";
import type { CustomerRow } from "../use-customers-data";
import { CustomerListPanel } from "./CustomerListPanel";
import { CustomerDetailPanel } from "./CustomerDetailPanel";

export function CustomersWorkspace({
  customers,
  paginatedCustomers,
  loading,
  searchInput,
  onSearchInputChange,
  onSearch,
  onRefresh,
  selectedCustomer,
  onSelectCustomer,
  onAddCustomer,
  canAddCustomer,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  panelBase,
  canMutateCustomers,
  setCustomers,
  onSuccess,
  onError,
  onRefreshList,
}: {
  customers: CustomerRow[];
  paginatedCustomers: CustomerRow[];
  loading: boolean;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  selectedCustomer: CustomerRow | null;
  onSelectCustomer: (customer: CustomerRow | null) => void;
  onAddCustomer: () => void;
  canAddCustomer: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  panelBase: StaffPanelBase;
  canMutateCustomers: boolean;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerRow[]>>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefreshList: () => void;
}) {
  const showListOnMobile = !selectedCustomer;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,320px)_1fr] xl:items-stretch">
      <div
        className={cn(
          "flex min-h-[min(70vh,640px)] flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden",
          !showListOnMobile && "max-xl:hidden"
        )}
      >
        <CustomerListPanel
          customers={customers}
          paginatedCustomers={paginatedCustomers}
          loading={loading}
          searchInput={searchInput}
          onSearchInputChange={onSearchInputChange}
          onSearch={onSearch}
          onRefresh={onRefresh}
          onOpenCustomer={onSelectCustomer}
          onAddCustomer={onAddCustomer}
          canAddCustomer={canAddCustomer}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          selectedCustomerId={selectedCustomer?.id}
        />
      </div>

      <div
        className={cn(
          "hidden xl:flex min-h-[min(70vh,640px)] flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        )}
      >
        {selectedCustomer ? (
          <CustomerDetailPanel
            key={selectedCustomer.id}
            customer={selectedCustomer}
            panelBase={panelBase}
            canMutateCustomers={canMutateCustomers}
            setCustomers={setCustomers}
            onClose={() => onSelectCustomer(null)}
            onSuccess={onSuccess}
            onError={onError}
            onRefreshList={onRefreshList}
            showBack={false}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-500">
            Select a customer from the list to view their profile, documents, and booking history.
          </div>
        )}
      </div>
    </div>
  );
}
