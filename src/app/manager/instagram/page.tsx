import AdminInstagramPage from "@/app/admin/instagram/page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerInstagramPage() {
  return <AdminInstagramPage panelConfig={managerPanelConfig} />;
}
