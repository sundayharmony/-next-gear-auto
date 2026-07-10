"use client";

import { useLayoutEffect, useState } from "react";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CustomerDetailPanel } from "./components/CustomerDetailPanel";
import type { CustomerRow } from "./use-customers-data";
import type { StaffPanelBase } from "@/lib/admin/staff-panel-base";

const NARROW_MQ = "(max-width: 1279px)";

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

/** Mobile/tablet full-screen sheet (xl+ uses inline master-detail). */
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
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(NARROW_MQ);
    const apply = () => setIsNarrowViewport(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const sheetOpen = open && isNarrowViewport;

  return (
    <Sheet open={sheetOpen} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" tier="staff" showClose={false} className="p-0 gap-0 w-full max-w-none sm:max-w-lg">
        <SheetTitle className="sr-only">{customer.name} — customer details</SheetTitle>
        <SheetDescription className="sr-only">
          Customer profile, documents, tickets, and booking history.
        </SheetDescription>
        <SheetBody className="p-0 sm:p-0 h-full overflow-hidden">
          <CustomerDetailPanel
            customer={customer}
            panelBase={panelBase}
            canMutateCustomers={canMutateCustomers}
            setCustomers={setCustomers}
            onClose={onClose}
            onSuccess={onSuccess}
            onError={onError}
            onRefreshList={onRefreshList}
            showBack
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
