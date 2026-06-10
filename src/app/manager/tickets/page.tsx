import AdminTicketsPage from "@/app/admin/tickets/page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerTicketsPage() {
  return <AdminTicketsPage panelConfig={managerPanelConfig} />;
}
