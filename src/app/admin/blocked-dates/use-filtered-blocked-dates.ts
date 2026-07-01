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

/** Upcoming trips first; on Turo tab optionally hide ended trips (default). */
export function useDisplayBlockedDates(
  filteredBlocks: BlockedDate[],
  listTab: BlockedDatesListTab,
  today: string,
  showPastTuroTrips: boolean
) {
  return useMemo(() => {
    let rows = filteredBlocks;
    if (listTab === "turo" && !showPastTuroTrips) {
      rows = rows.filter((b) => b.end_date >= today);
    }

    return [...rows].sort((a, b) => {
      const aPast = a.end_date < today;
      const bPast = b.end_date < today;
      if (aPast !== bPast) return aPast ? 1 : -1;
      if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
      return a.end_date.localeCompare(b.end_date);
    });
  }, [filteredBlocks, listTab, showPastTuroTrips, today]);
}
