import AdminReviewsPage from "@/app/admin/reviews/page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerReviewsPage() {
  return <AdminReviewsPage panelConfig={managerPanelConfig} />;
}
