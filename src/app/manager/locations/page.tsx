import AdminLocationsPage from "@/app/admin/locations/page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerLocationsPage() {
  return <AdminLocationsPage panelConfig={managerPanelConfig} />;
}
