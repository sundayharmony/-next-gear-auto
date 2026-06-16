"use client";

import { Sheet, SheetBody, SheetContent } from "@/components/ui/sheet";
import { CustomerDetailDrawer } from "./customer-detail-drawer";
import type { CustomerRow } from "./use-customers-data";
import type { StaffPanelBase } from "@/lib/admin/staff-panel-base";

interface CustomerDetailSheetProps {
  customer: CustomerRow;
  open: boolean;
  onClose: () => void;
  panelBase: StaffPanelBase;
  canMutateCustomers: boolean;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerRow[]>>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onRefreshList: () => void;
}

/** Mobile/tablet slide-over for customer detail (xl+ uses inline master-detail). */
export function CustomerDetailSheet({
  customer,
  open,
  onClose,
  panelBase,
  canMutateCustomers,
  setCustomers,
  onSuccess,
  onError,
  onRefreshList,
}: CustomerDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        tier="staff"
        showClose={false}
        className="xl:hidden p-0 gap-0 w-full max-w-none sm:max-w-lg"
      >
        <SheetBody className="p-0 sm:p-0 overflow-y-auto">
          <CustomerDetailDrawer
            customer={customer}
            panelBase={panelBase}
            canMutateCustomers={canMutateCustomers}
            setCustomers={setCustomers}
            onClose={onClose}
            onSuccess={onSuccess}
            onError={onError}
            onRefreshList={onRefreshList}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
