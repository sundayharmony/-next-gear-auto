"use client";

import React, { createContext, useContext } from "react";
import {
  adminPanelConfig,
  type StaffPanelConfig,
} from "@/lib/admin/staff-panel-config";

const StaffPanelConfigContext = createContext<StaffPanelConfig>(adminPanelConfig);

export function StaffPanelConfigProvider({
  config,
  children,
}: {
  config: StaffPanelConfig;
  children: React.ReactNode;
}) {
  return (
    <StaffPanelConfigContext.Provider value={config}>
      {children}
    </StaffPanelConfigContext.Provider>
  );
}

export function useStaffPanelConfig(): StaffPanelConfig {
  return useContext(StaffPanelConfigContext);
}
