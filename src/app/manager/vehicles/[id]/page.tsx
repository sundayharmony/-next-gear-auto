import { SharedVehicleDetailsPage } from "@/app/admin/vehicles/details/shared-vehicle-details-page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerVehicleDetailsPage() {
  return <SharedVehicleDetailsPage panelConfig={managerPanelConfig} />;
}
