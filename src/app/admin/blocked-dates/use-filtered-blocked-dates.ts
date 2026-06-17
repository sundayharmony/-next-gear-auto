import { useMemo } from "react";
import { isBlockedDateCancelled } from "@/lib/utils/blocked-dates";
import type { BlockedDate, BlockedDatesListTab } from "./blocked-dates-types";

export function useFilteredBlockedDates(
  blockedDates: BlockedDate[],
  filterVehicleId: string,
  listTab: BlockedDatesListTab
) {
  return useMemo(() => {
    let rows = filterVehicleId
      ? blockedDates.filter((b) => b.vehicle_id === filterVehicleId)
      : blockedDates;
    if (listTab === "manual") {
      rows = rows.filter((b) => b.source !== "turo-email");
    } else if (listTab === "turo") {
      rows = rows.filter(
        (b) => b.source === "turo-email" && !isBlockedDateCancelled(b)
      );
    } else if (listTab === "cancelled") {
      rows = rows.filter(
        (b) => b.source === "turo-email" && isBlockedDateCancelled(b)
      );
    } else {
      rows = rows.filter(
        (b) => !(b.source === "turo-email" && isBlockedDateCancelled(b))
      );
    }
    return rows;
  }, [blockedDates, filterVehicleId, listTab]);
}
