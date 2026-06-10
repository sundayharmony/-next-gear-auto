import AdminPromoCodesPage from "@/app/admin/promo-codes/page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerPromoCodesPage() {
  return <AdminPromoCodesPage panelConfig={managerPanelConfig} />;
}
