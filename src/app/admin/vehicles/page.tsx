"use client";

import { SharedVehiclesPage } from "./shared-vehicles-page";
import { adminVehiclesConfig } from "./config";

export default function AdminVehiclesPage() {
  return <SharedVehiclesPage config={adminVehiclesConfig} />;
}
