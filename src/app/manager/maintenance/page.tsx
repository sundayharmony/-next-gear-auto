import AdminMaintenancePage from "@/app/admin/maintenance/page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerMaintenancePage() {
  return <AdminMaintenancePage panelConfig={managerPanelConfig} />;
}
