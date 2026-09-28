import { redirect } from "next/navigation";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerInvoicesPage() {
  redirect(`${managerPanelConfig.panelBase}/tickets?tab=invoices`);
}
