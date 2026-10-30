"use client";

import { SharedVehiclesPage } from "@/app/admin/vehicles/shared-vehicles-page";
import { managerVehiclesConfig } from "@/app/admin/vehicles/config";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerVehiclesPage() {
  return (
    <SharedVehiclesPage
      config={{
        ...managerVehiclesConfig,
        homeHref: managerPanelConfig.panelBase,
      }}
    />
  );
}
