"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Plus, Mail, X } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { AdminPageBody, AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminStatusBanner } from "@/components/admin/ui-feedback";
import { Button } from "@/components/ui/button";
import { Vehicle, getVehicleDisplayName } from "@/lib/types";
import { getLocalYmd } from "@/lib/utils/date-helpers";
import {
  type BlockedDate,
  type OverlapConflict,
  type TuroSyncStatus,
  type ParseResult,
  type BlockedDatesListTab,
  toBlockedTimeInput,
} from "./blocked-dates-types";
import { BlockedDatesFilters } from "./blocked-dates-filters";
import { BlockedDatesGrid } from "./blocked-dates-grid";
import {
  BlockedDatesManualForm,
  BlockedDatesEmailForm,
  BlockedDatesEditDrawer,
  BlockedDatesDetailDrawer,
} from "./blocked-dates-drawer";
import { useTuroSyncActions } from "./use-turo-sync-actions";
import { useFilteredBlockedDates, useDisplayBlockedDates } from "./use-filtered-blocked-dates";
import { isBlockedDateCancelled } from "@/lib/utils/blocked-dates";

export default function BlockedDatesPage() {
  const pathname = usePathname();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [turoSyncStatus, setTuroSyncStatus] = useState<TuroSyncStatus | null>(null);
  const { error, setError, success, setSuccess } = useAutoToast();

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualVehicleId, setManualVehicleId] = useState("");
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [emailVehicleId, setEmailVehicleId] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [filterVehicleId, setFilterVehicleId] = useState("");
  const [listTab, setListTab] = useState<BlockedDatesListTab>("turo");
  const [showPastTuroTrips, setShowPastTuroTrips] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVehicleId, setEditVehicleId] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editPickupTime, setEditPickupTime] = useState("");
  const [editReturnTime, setEditReturnTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editEarnings, setEditEarnings] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editOriginalEndDate, setEditOriginalEndDate] = useState("");
  const [overlapConflicts, setOverlapConflicts] = useState<OverlapConflict[]>([]);
  const [forceOverride, setForceOverride] = useState(false);
  const [selectedBlockDetail, setSelectedBlockDetail] = useState<BlockedDate | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
  const [vehicles, visibleBlocks, cancelledBlocks, syncRes] = await Promise.all([
        adminFetch("/api/admin/vehicles"),
        adminFetch("/api/admin/blocked-dates?scope=visible"),
        adminFetch("/api/admin/blocked-dates?scope=cancelledTuro"),
        adminFetch("/api/admin/blocked-dates/sync-cancellations"),
      ]);

      if (vehicles.ok) {
        const vData = await vehicles.json();
        if (vData.success) setVehicles(vData.data);
      }
      const merged: BlockedDate[] = [];
      if (visibleBlocks.ok) {
        const bData = await visibleBlocks.json();
        if (bData.success) merged.push(...bData.data);
      }
      if (cancelledBlocks.ok) {
        const cData = await cancelledBlocks.json();
        if (cData.success) merged.push(...cData.data);
      }
      setBlockedDates(merged);
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.success) setTuroSyncStatus(syncData.data);
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { cancellingId, syncingStatus, refreshSyncStatus, handleMarkCancelled } =
    useTuroSyncActions(fetchData, setTuroSyncStatus, setSuccess, setError);

  const getVehicleName = useCallback(
    (vehicleId: string) => {
      const v = vehicles.find((v) => v.id === vehicleId);
      return v ? getVehicleDisplayName(v) : "Unknown Vehicle";
    },
    [vehicles]
  );

  const handleManualBlock = async () => {
    if (!manualVehicleId || !manualStartDate || !manualEndDate) {
      setError("Please select a vehicle and date range");
      return;
    }
    if (manualEndDate < manualStartDate) {
      setError("End date must be on or after start date");
      return;
    }

    setSavingManual(true);
    try {
      const res = await adminFetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: manualVehicleId,
          startDate: manualStartDate,
          endDate: manualEndDate,
          source: "manual",
          reason: manualReason.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setSuccess(`Dates blocked for ${getVehicleName(manualVehicleId)}`);
        setBlockedDates((prev) =>
          [...prev, data.data].sort((a, b) => a.start_date.localeCompare(b.start_date))
        );
        setManualStartDate("");
        setManualEndDate("");
        setManualReason("");
        setShowManualForm(false);
      } else {
        setError(data.message || "Failed to block dates");
      }
    } catch {
      setError("Network error — could not block dates");
    } finally {
      setSavingManual(false);
    }
  };

  const handleParseEmail = async () => {
    if (!emailText.trim()) {
      setError("Please paste the Turo email content");
      return;
    }
    setParsing(true);
    setParseResult(null);
    try {
      const res = await adminFetch("/api/admin/blocked-dates/parse-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setParseResult(data.data);
        if (data.data.vehicleDescription) {
          const desc = data.data.vehicleDescription.toLowerCase();
          const match = vehicles.find((v) => {
            const name = getVehicleDisplayName(v).toLowerCase();
            return (
              name.includes(desc) ||
              desc.includes(name) ||
              (desc.includes(v.make.toLowerCase()) && desc.includes(v.model.toLowerCase()))
            );
          });
          if (match) setEmailVehicleId(match.id);
        }
      } else {
        setError(data.message || "Failed to parse email");
      }
    } catch {
      setError("Network error — could not parse email");
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmEmailBlock = async () => {
    if (!parseResult?.startDate || !parseResult?.endDate) {
      setError("Please verify the dates were extracted from the email");
      return;
    }

    if (parseResult.isCancellation) {
      setSavingEmail(true);
      try {
        const res = await adminFetch("/api/admin/blocked-dates/sync-cancellations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailText,
            delete: true,
            purgeAlreadyCancelled: true,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          const removed = data.data.deleted + data.data.marked;
          if (removed > 0) {
            await fetchData();
            setSuccess(`Removed ${removed} cancelled Turo trip(s) from the calendar`);
          } else {
            setError(
              data.data.errors?.[0] ||
                "No matching active Turo trip found for this cancellation email"
            );
          }
          if (removed > 0) {
            setEmailText("");
            setParseResult(null);
            setEmailVehicleId("");
            setShowEmailForm(false);
          }
        } else {
          setError(data.message || "Failed to process cancellation");
        }
      } catch {
        setError("Network error — could not process cancellation");
      } finally {
        setSavingEmail(false);
      }
      return;
    }

    if (!emailVehicleId) {
      setError("Please select a vehicle and verify the dates");
      return;
    }
    setSavingEmail(true);
    try {
      const guest = (parseResult.guestName || "").trim() || "Guest";
      const amt =
        typeof parseResult.earnings === "number" &&
        Number.isFinite(parseResult.earnings) &&
        parseResult.earnings > 0
          ? parseResult.earnings
          : null;
      const reason =
        amt != null ? `Turo: ${guest} — $${amt.toFixed(2)}` : `Turo: ${guest}`;

      const res = await adminFetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: emailVehicleId,
          startDate: parseResult.startDate,
          endDate: parseResult.endDate,
          pickupTime: parseResult.pickupTime,
          returnTime: parseResult.returnTime,
          location: parseResult.location,
          earnings: parseResult.earnings,
          source: "turo-email",
          reason,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setSuccess(`Turo dates blocked for ${getVehicleName(emailVehicleId)}`);
        setBlockedDates((prev) =>
          [...prev, data.data].sort((a, b) => a.start_date.localeCompare(b.start_date))
        );
        setEmailText("");
        setParseResult(null);
        setEmailVehicleId("");
        setShowEmailForm(false);
      } else {
        setError(data.message || "Failed to block dates");
      }
    } catch {
      setError("Network error — could not block dates");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this blocked date range?")) return;
    setDeletingId(id);
    try {
      const res = await adminFetch(`/api/admin/blocked-dates?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setBlockedDates((prev) => prev.filter((b) => b.id !== id));
        setSuccess("Block removed");
      } else {
        setError(data.message || "Failed to remove block");
      }
    } catch {
      setError("Network error — could not remove block");
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (block: BlockedDate) => {
    setEditingId(block.id);
    setEditVehicleId(block.vehicle_id);
    setEditStartDate(block.start_date);
    setEditEndDate(block.end_date);
    setEditReason(block.reason || "");
    setEditPickupTime(toBlockedTimeInput(block.pickup_time));
    setEditReturnTime(toBlockedTimeInput(block.return_time));
    setEditLocation(block.location || "");
    setEditEarnings(block.earnings != null ? String(block.earnings) : "");
    setEditOriginalEndDate(block.end_date);
    setOverlapConflicts([]);
    setForceOverride(false);
    setSelectedBlockDetail(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setOverlapConflicts([]);
    setForceOverride(false);
  };

  const editingBlock = useMemo(
    () => (editingId ? blockedDates.find((b) => b.id === editingId) ?? null : null),
    [blockedDates, editingId]
  );

  const isExtending = editingId !== null && editEndDate > editOriginalEndDate;
  const extensionDays = isExtending
    ? Math.ceil(
        (new Date(editEndDate + "T00:00:00").getTime() -
          new Date(editOriginalEndDate + "T00:00:00").getTime()) /
          86400000
      )
    : 0;

  const handleSaveEdit = async () => {
    if (!editingId || !editVehicleId || !editStartDate || !editEndDate) {
      setError("Please fill in all required fields");
      return;
    }
    if (editEndDate < editStartDate) {
      setError("End date must be on or after start date");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await adminFetch("/api/admin/blocked-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          vehicleId: editVehicleId,
          startDate: editStartDate,
          endDate: editEndDate,
          reason: editReason.trim() || null,
          pickupTime: editPickupTime.trim() || null,
          returnTime: editReturnTime.trim() || null,
          location: editLocation.trim() || null,
          earnings: editEarnings ? parseFloat(editEarnings) : null,
          forceOverride: forceOverride,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBlockedDates((prev) =>
          prev
            .map((b) => (b.id === editingId ? data.data : b))
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
        );
        setSuccess(
          isExtending
            ? `Trip extended by ${extensionDays} day${extensionDays !== 1 ? "s" : ""}`
            : "Blocked date updated"
        );
        setEditingId(null);
        setOverlapConflicts([]);
        setForceOverride(false);
      } else if (res.status === 409 && data.overlapping) {
        setOverlapConflicts(data.overlapping);
        setError(data.message);
      } else {
        setError(data.message || "Failed to update blocked date");
      }
    } catch {
      setError("Network error — could not update blocked date");
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredBlocks = useFilteredBlockedDates(blockedDates, filterVehicleId, listTab);
  const today = useMemo(() => getLocalYmd(new Date()), []);
  const displayBlocks = useDisplayBlockedDates(
    filteredBlocks,
    listTab,
    today,
    showPastTuroTrips
  );

  const upcomingTuroCount = useMemo(
    () =>
      blockedDates.filter(
        (b) =>
          b.source === "turo-email" &&
          !isBlockedDateCancelled(b) &&
          b.end_date >= today &&
          (!filterVehicleId || b.vehicle_id === filterVehicleId)
      ).length,
    [blockedDates, today, filterVehicleId]
  );

  const lastTuroIngest = useMemo(() => {
    const turoRows = blockedDates.filter((b) => b.source === "turo-email");
    if (!turoRows.length) return null;
    return turoRows.reduce(
      (latest, row) => (row.created_at > latest ? row.created_at : latest),
      turoRows[0].created_at
    );
  }, [blockedDates]);

  const handleEmailTextChange = (text: string) => {
    setEmailText(text);
    setParseResult(null);
  };

  const handleEditEndDateChange = (date: string) => {
    setEditEndDate(date);
    setOverlapConflicts([]);
    setForceOverride(false);
  };

  return (
    <>
      <AdminPageHeader
        title="Blocked Dates"
        subtitle="Manual blocks and Turo trips are tracked separately — they do not merge"
        actions={
          <>
            <Button
              onClick={() => {
                setShowEmailForm(!showEmailForm);
                setShowManualForm(false);
              }}
              variant="outline"
              className="page-hero-btn-outline"
            >
              {showEmailForm ? (
                <>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" /> Paste Turo Email
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setShowManualForm(!showManualForm);
                setShowEmailForm(false);
              }}
              className="bg-white text-purple-900 hover:bg-purple-50"
            >
              {showManualForm ? (
                <>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" /> Block Dates
                </>
              )}
            </Button>
          </>
        }
      />

      <AdminPageBody>
        {error ? (
          <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} />
        ) : null}
        {success ? (
          <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        ) : null}

        <BlockedDatesEmailForm
          show={showEmailForm}
          vehicles={vehicles}
          emailText={emailText}
          onEmailTextChange={handleEmailTextChange}
          parsing={parsing}
          parseResult={parseResult}
          emailVehicleId={emailVehicleId}
          onEmailVehicleIdChange={setEmailVehicleId}
          saving={savingEmail}
          onParse={handleParseEmail}
          onConfirm={handleConfirmEmailBlock}
        />

        <BlockedDatesManualForm
          show={showManualForm}
          vehicles={vehicles}
          today={today}
          manualVehicleId={manualVehicleId}
          onManualVehicleIdChange={setManualVehicleId}
          manualStartDate={manualStartDate}
          onManualStartDateChange={setManualStartDate}
          manualEndDate={manualEndDate}
          onManualEndDateChange={setManualEndDate}
          manualReason={manualReason}
          onManualReasonChange={setManualReason}
          saving={savingManual}
          onSubmit={handleManualBlock}
        />

        <BlockedDatesFilters
          listTab={listTab}
          onListTabChange={setListTab}
          filterVehicleId={filterVehicleId}
          onFilterVehicleIdChange={setFilterVehicleId}
          vehicles={vehicles}
          filteredCount={displayBlocks.length}
          upcomingTuroCount={upcomingTuroCount}
          showPastTuroTrips={showPastTuroTrips}
          onShowPastTuroTripsChange={setShowPastTuroTrips}
          turoSyncStatus={turoSyncStatus}
          lastTuroIngest={lastTuroIngest}
          syncingStatus={syncingStatus}
          onRefreshSyncStatus={refreshSyncStatus}
        />

        <BlockedDatesGrid
          blocks={displayBlocks}
          loading={loading}
          today={today}
          pathname={pathname}
          editingId={editingId}
          deletingId={deletingId}
          cancellingId={cancellingId}
          getVehicleName={getVehicleName}
          onSelectDetail={setSelectedBlockDetail}
          onStartEdit={startEditing}
          onDelete={handleDelete}
          onMarkCancelled={handleMarkCancelled}
        />

        <BlockedDatesEditDrawer
          block={editingBlock}
          vehicles={vehicles}
          editVehicleId={editVehicleId}
          onEditVehicleIdChange={setEditVehicleId}
          editStartDate={editStartDate}
          onEditStartDateChange={setEditStartDate}
          editEndDate={editEndDate}
          onEditEndDateChange={handleEditEndDateChange}
          editReason={editReason}
          onEditReasonChange={setEditReason}
          editPickupTime={editPickupTime}
          onEditPickupTimeChange={setEditPickupTime}
          editReturnTime={editReturnTime}
          onEditReturnTimeChange={setEditReturnTime}
          editLocation={editLocation}
          onEditLocationChange={setEditLocation}
          editEarnings={editEarnings}
          onEditEarningsChange={setEditEarnings}
          editOriginalEndDate={editOriginalEndDate}
          isExtending={isExtending}
          extensionDays={extensionDays}
          overlapConflicts={overlapConflicts}
          forceOverride={forceOverride}
          onForceOverrideChange={setForceOverride}
          saving={savingEdit}
          onSave={handleSaveEdit}
          onCancel={cancelEditing}
        />

        <BlockedDatesDetailDrawer
          block={selectedBlockDetail}
          pathname={pathname}
          getVehicleName={getVehicleName}
          onClose={() => setSelectedBlockDetail(null)}
        />
      </AdminPageBody>
    </>
  );
}
