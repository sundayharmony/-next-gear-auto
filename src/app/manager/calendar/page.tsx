import AdminCalendarPage from "@/app/admin/calendar/page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerCalendarPage() {
  return <AdminCalendarPage panelConfig={managerPanelConfig} />;
}
