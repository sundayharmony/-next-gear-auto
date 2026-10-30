"use client";

export type VehiclesPanelMode = "admin" | "manager";

export interface VehiclesPageConfig {
  mode: VehiclesPanelMode;
  homeHref: string;
  title: string;
  subtitle: string;
  vehiclesEndpoint: string;
  capabilities: {
    canAddVehicle: boolean;
    canEditVehicle: boolean;
    canDeleteVehicle: boolean;
    canViewSensitiveFields: boolean;
  };
}

export const adminVehiclesConfig: VehiclesPageConfig = {
  mode: "admin",
  homeHref: "/admin",
  title: "Fleet Management",
  subtitle: "Manage your rental vehicle fleet",
  vehiclesEndpoint: "/api/admin/vehicles",
  capabilities: {
    canAddVehicle: true,
    canEditVehicle: true,
    canDeleteVehicle: true,
    canViewSensitiveFields: true,
  },
};

export const managerVehiclesConfig: VehiclesPageConfig = {
  mode: "manager",
  homeHref: "/manager",
  title: "Fleet Management",
  subtitle: "Manage your rental vehicle fleet",
  vehiclesEndpoint: "/api/admin/vehicles",
  capabilities: {
    canAddVehicle: true,
    canEditVehicle: false,
    canDeleteVehicle: false,
    canViewSensitiveFields: false,
  },
};
