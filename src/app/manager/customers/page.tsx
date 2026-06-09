import AdminCustomersPage from "@/app/admin/customers/page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerCustomersPage() {
  return <AdminCustomersPage panelConfig={managerPanelConfig} />;
}
