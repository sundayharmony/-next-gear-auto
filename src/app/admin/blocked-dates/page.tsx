"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vehicle, getVehicleDisplayName } from "@/lib/types";
import {
  ShieldBan,
  Plus,
  Trash2,
  Loader2,
  Mail,
  Check,
  X,
  AlertTriangle,
  Calendar,
  Car,
  Pencil,
  Save,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getTuroDriverFromReason } from "@/lib/utils/turo-blocked-date";

interface BlockedDate {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  location: string | null;
  earnings: number | null;
  source: string;
  reason: string | null;
  is_extension: boolean | null;
  original_end_date: string | null;
  created_at: string;
}

interface OverlapConflict {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface ParseResult {
  guestName: string | null;
  vehicleDescription: string | null;
  startDate: string | null;
  endDate: string | null;
  pickupTime: string | null;
  returnTime: string | null;
  location: string | null;
  earnings: number | null;
  isExtension: boolean;
  originalEndDate: string | null;
  confidence: "high" | "medium" | "low";
  rawMatches: string[];
}

export default function BlockedDatesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, setError, success, setSuccess } = useAutoToast();

  // Manual block form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualVehicleId, setManualVehicleId] = useState("");
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  // Email paste form
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [emailVehicleId, setEmailVehicleId] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Filter
  const [filterVehicleId, setFilterVehicleId] = useState("");

  // Deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Editing
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
      const [vRes, bRes] = await Promise.all([
        adminFetch("/api/admin/vehicles"),
        adminFetch("/api/admin/blocked-dates"),
      ]);

      if (vRes.ok) {
        const vData = await vRes.json();
        if (vData.success) setVehicles(vData.data);
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.success) setBlockedDates(bData.data);
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

  const getVehicleName = (vehicleId: string) => {
    const v = vehicles.find((v) => v.id === vehicleId);
    return v ? getVehicleDisplayName(v) : "Unknown Vehicle";
  };

  // ── Manual Block ──
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

  // ── Email Parse ──
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
        // Try to auto-match vehicle
        if (data.data.vehicleDescription) {
          const desc = data.data.vehicleDescription.toLowerCase();
          const match = vehicles.find((v) => {
            const name = getVehicleDisplayName(v).toLowerCase();
            return name.includes(desc) || desc.includes(name) ||
              (desc.includes(v.make.toLowerCase()) && desc.includes(v.model.toLowerCase()));
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
    if (!parseResult?.startDate || !parseResult?.endDate || !emailVehicleId) {
      setError("Please select a vehicle and verify the dates");
      return;
    }
    setSavingEmail(true);
    try {
      const reason = parseResult.guestName
        ? `Turo booking — ${parseResult.guestName}`
        : "Turo booking (from email)";

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

  // ── Delete ──
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

  // ── Edit ──
  const startEditing = (block: BlockedDate) => {
    setEditingId(block.id);
    setEditVehicleId(block.vehicle_id);
    setEditStartDate(block.start_date);
    setEditEndDate(block.end_date);
    setEditReason(block.reason || "");
    setEditPickupTime(toTimeInput(block.pickup_time));
    setEditReturnTime(toTimeInput(block.return_time));
    setEditLocation(block.location || "");
    setEditEarnings(block.earnings != null ? String(block.earnings) : "");
    setEditOriginalEndDate(block.end_date);
    setOverlapConflicts([]);
    setForceOverride(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setOverlapConflicts([]);
    setForceOverride(false);
  };

  const isExtending = editingId !== null && editEndDate > editOriginalEndDate;
  const extensionDays = isExtending
    ? Math.ceil(
        (new Date(editEndDate + "T00:00:00").getTime() - new Date(editOriginalEndDate + "T00:00:00").getTime()) / 86400000
      )
    : 0;

  /** Format YYYY-MM-DD to human-readable "Apr 6, 2026" */
  const formatDate = (d: string): string => {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  /** Format YYYY-MM-DD to short "Apr 6" */
  const formatDateShort = (d: string): string => {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

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
          prev.map((b) => (b.id === editingId ? data.data : b))
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
        );
        setSuccess(isExtending ? `Trip extended by ${extensionDays} day${extensionDays !== 1 ? "s" : ""}` : "Blocked date updated");
        setEditingId(null);
        setOverlapConflicts([]);
        setForceOverride(false);
      } else if (res.status === 409 && data.overlapping) {
        // Overlap conflict — show warning and let admin force
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

  /** Format "HH:MM:SS" or "HH:MM" TIME value to "8:00 AM" display string */
  const formatTime = (t: string | null): string => {
    if (!t) return "";
    const parts = t.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    if (isNaN(h)) return "";
    const ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${m} ${ampm}`;
  };

  /** Strip seconds from "HH:MM:SS" for <input type="time"> which expects "HH:MM" */
  const toTimeInput = (t: string | null): string => {
    if (!t) return "";
    return t.substring(0, 5); // "08:00:00" → "08:00"
  };

  const filteredBlocks = filterVehicleId
    ? blockedDates.filter((b) => b.vehicle_id === filterVehicleId)
    : blockedDates;

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Blocked Dates</h1>
              <p className="mt-1 text-purple-200">
                Block dates manually or from Turo booking emails
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => { setShowEmailForm(!showEmailForm); setShowManualForm(false); }}
                variant="outline"
                className="border-purple-300 text-purple-100 hover:bg-purple-800/30"
              >
                {showEmailForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Mail className="h-4 w-4 mr-2" /> Paste Turo Email</>}
              </Button>
              <Button
                onClick={() => { setShowManualForm(!showManualForm); setShowEmailForm(false); }}
                className="bg-white text-purple-900 hover:bg-gray-100"
              >
                {showManualForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Block Dates</>}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        {/* Toasts */}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center justify-between">
            <span className="flex items-center gap-2"><Check className="h-4 w-4" />{success}</span>
            <button onClick={() => setSuccess(null)} aria-label="Dismiss" className="text-green-500 hover:text-green-700"><X className="h-4 w-4" /></button>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss" className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Email Paste Form */}
        {showEmailForm && (
          <Card className="mb-6 border-blue-200 bg-blue-50/30">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Paste Turo Booking Email
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Copy the full text of the Turo booking confirmation email and paste it below.
                The system will extract the vehicle, dates, and guest name automatically.
              </p>
              <Textarea
                value={emailText}
                onChange={(e) => { setEmailText(e.target.value); setParseResult(null); }}
                placeholder="Paste the full Turo booking confirmation email here..."
              />
              <div className="flex gap-2 mt-3">
                <Button onClick={handleParseEmail} disabled={parsing || !emailText.trim()} size="sm">
                  {parsing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing...</> : "Parse Email"}
                </Button>
              </div>

              {/* Parse Results */}
              {parseResult && (
                <div className="mt-4 p-4 bg-white rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      className={
                        parseResult.confidence === "high"
                          ? "bg-green-100 text-green-700"
                          : parseResult.confidence === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {parseResult.confidence} confidence
                    </Badge>
                    {parseResult.rawMatches.length > 0 && (
                      <span className="text-xs text-gray-400">
                        Found: {parseResult.rawMatches.join(" · ")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Start Date</label>
                      <p className="font-semibold">
                        {parseResult.startDate || <span className="text-red-500">Not found</span>}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">End Date</label>
                      <p className="font-semibold">
                        {parseResult.endDate || <span className="text-red-500">Not found</span>}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Guest</label>
                      <p className="font-semibold">{parseResult.guestName || "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Vehicle Detected</label>
                      <p className="font-semibold">{parseResult.vehicleDescription || "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Pickup Time</label>
                      <p className="font-semibold">{parseResult.pickupTime ? formatTime(parseResult.pickupTime) : "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Return Time</label>
                      <p className="font-semibold">{parseResult.returnTime ? formatTime(parseResult.returnTime) : "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500">Pickup Location</label>
                      <p className="font-semibold">{parseResult.location || "—"}</p>
                    </div>
                  </div>

                  {parseResult.startDate && parseResult.endDate && (
                    <div className="mt-4 pt-3 border-t">
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Select Vehicle to Block
                      </label>
                      <Select
                        value={emailVehicleId}
                        onChange={(e) => setEmailVehicleId(e.target.value)}
                        aria-label="Vehicle for email block"
                      >
                        <option value="">Choose vehicle...</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>{getVehicleDisplayName(v)}</option>
                        ))}
                      </Select>
                      <Button
                        onClick={handleConfirmEmailBlock}
                        disabled={!emailVehicleId || savingEmail}
                        className="mt-3 bg-blue-600 hover:bg-blue-700"
                        size="sm"
                      >
                        {savingEmail ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Blocking...</>
                        ) : (
                          <><ShieldBan className="h-4 w-4 mr-2" /> Block {parseResult.startDate} → {parseResult.endDate}</>
                        )}
                      </Button>
                    </div>
                  )}

                  {(!parseResult.startDate || !parseResult.endDate) && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Could not extract complete dates from the email. You can block dates manually instead
                        using the &quot;Block Dates&quot; button.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Block Form */}
        {showManualForm && (
          <Card className="mb-6 border-purple-200 bg-purple-50/30">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Block Date Range
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Vehicle</label>
                  <Select
                    value={manualVehicleId}
                    onChange={(e) => setManualVehicleId(e.target.value)}
                    aria-label="Vehicle for manual block"
                  >
                    <option value="">Choose vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{getVehicleDisplayName(v)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Start Date</label>
                  <DatePicker
                    value={manualStartDate}
                    min={today}
                    onChange={(val) => setManualStartDate(val)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">End Date</label>
                  <DatePicker
                    value={manualEndDate}
                    min={manualStartDate || today}
                    onChange={(val) => setManualEndDate(val)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Reason (optional)</label>
                  <Input
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="e.g. Turo booking, personal use"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleManualBlock} disabled={savingManual} className="w-full">
                    {savingManual ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><ShieldBan className="h-4 w-4 mr-2" /> Block</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-gray-700">Filter by vehicle:</label>
          <Select
            value={filterVehicleId}
            onChange={(e) => setFilterVehicleId(e.target.value)}
            aria-label="Filter blocked dates by vehicle"
          >
            <option value="">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{getVehicleDisplayName(v)}</option>
            ))}
          </Select>
          <span className="text-xs text-gray-400">
            {filteredBlocks.length} blocked range{filteredBlocks.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Blocked Dates List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading blocked dates...</p>
          </div>
        ) : filteredBlocks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
            <ShieldBan className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700">No blocked dates</h3>
            <p className="text-sm text-gray-400 mt-1">
              Block dates manually or paste a Turo email to sync bookings.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBlocks.map((block) => {
              const isEditing = editingId === block.id;
              const dayCount =
                Math.ceil(
                  (new Date(block.end_date + "T00:00:00").getTime() - new Date(block.start_date + "T00:00:00").getTime()) / 86400000
                ) + 1;
              const isPast = block.end_date < today;

              if (isEditing) {
                return (
                  <div key={block.id} className="rounded-lg border-2 border-purple-300 bg-purple-50/30 p-4">
                    {/* Extension indicator */}
                    {isExtending && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>
                            <strong>Extending trip</strong> — end date moves from{" "}
                            <span className="line-through">{formatDateShort(editOriginalEndDate)}</span>
                            {" → "}
                            <strong>{formatDate(editEndDate)}</strong>
                            {" "}
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                              +{extensionDays} day{extensionDays !== 1 ? "s" : ""}
                            </span>
                          </span>
                        </div>
                        {block.is_extension && block.original_end_date && (
                          <p className="text-xs text-blue-500 mt-1 ml-6">
                            Note: This trip was previously extended from {formatDate(block.original_end_date)}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Show previous extension info when not currently extending */}
                    {!isExtending && block.is_extension && block.original_end_date && (
                      <div className="mb-3 p-2 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-2 text-xs text-blue-600">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Previously extended — originally ended {formatDate(block.original_end_date)}</span>
                      </div>
                    )}

                    {/* Overlap warning */}
                    {overlapConflicts.length > 0 && (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                        <div className="flex items-start gap-2 text-sm text-amber-800">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>Overlap conflict{overlapConflicts.length > 1 ? "s" : ""} detected:</strong>
                            <ul className="mt-1 space-y-1">
                              {overlapConflicts.map((c) => (
                                <li key={c.id} className="text-xs">
                                  {formatDate(c.start_date)} → {formatDate(c.end_date)}{c.reason ? ` (${c.reason})` : ""}
                                </li>
                              ))}
                            </ul>
                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={forceOverride}
                                onChange={(e) => setForceOverride(e.target.checked)}
                                className="rounded border-amber-400"
                              />
                              <span className="text-xs font-medium">Force override — save anyway</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Vehicle</label>
                        <Select
                          value={editVehicleId}
                          onChange={(e) => setEditVehicleId(e.target.value)}
                          aria-label="Edit vehicle"
                        >
                          <option value="">Choose vehicle...</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>{getVehicleDisplayName(v)}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Start Date</label>
                        <DatePicker
                          value={editStartDate}
                          onChange={(val) => setEditStartDate(val)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
                          End Date
                          {isExtending && <span className="ml-1 text-blue-600 normal-case font-normal">(extending)</span>}
                        </label>
                        <DatePicker
                          value={editEndDate}
                          min={editStartDate}
                          onChange={(val) => { setEditEndDate(val); setOverlapConflicts([]); setForceOverride(false); }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Reason</label>
                        <Input
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="e.g. Turo booking, personal use"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Pickup Time</label>
                        <Input
                          type="time"
                          value={editPickupTime}
                          onChange={(e) => setEditPickupTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Return Time</label>
                        <Input
                          type="time"
                          value={editReturnTime}
                          onChange={(e) => setEditReturnTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Location</label>
                        <Input
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="e.g. Newark, NJ"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Earnings ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editEarnings}
                          onChange={(e) => setEditEarnings(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button onClick={handleSaveEdit} disabled={savingEdit || (overlapConflicts.length > 0 && !forceOverride)} size="sm">
                        {savingEdit ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isExtending ? (
                          <><Calendar className="h-4 w-4 mr-1" /> Extend Trip</>
                        ) : (
                          <><Save className="h-4 w-4 mr-1" /> Save</>
                        )}
                      </Button>
                      <Button onClick={cancelEditing} variant="outline" size="sm" disabled={savingEdit}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockDetail(block)}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    isPast
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : block.is_extension
                      ? "bg-blue-50/40 border-blue-200 hover:border-blue-300"
                      : "bg-white border-gray-200 hover:border-purple-200"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <Car className={`h-5 w-5 ${block.is_extension ? "text-blue-400" : "text-gray-400"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getVehicleName(block.vehicle_id)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDateShort(block.start_date)}
                        {block.pickup_time ? ` ${formatTime(block.pickup_time)}` : ""}
                        {" → "}
                        {formatDate(block.end_date)}
                        {block.return_time ? ` ${formatTime(block.return_time)}` : ""}
                        <span className="text-gray-400 ml-1">({dayCount} day{dayCount !== 1 ? "s" : ""})</span>
                      </p>
                      {block.is_extension && block.original_end_date && (
                        <p className="text-xs text-blue-500 mt-0.5">
                          Originally ended {formatDate(block.original_end_date)}
                        </p>
                      )}
                      {(block.location || block.earnings != null) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {block.location && <span>{block.location}</span>}
                          {block.location && block.earnings != null && <span className="mx-1">·</span>}
                          {block.earnings != null && (
                            <span className="text-green-600 font-medium">${Number(block.earnings).toFixed(2)}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    {block.reason && (
                      <span className="text-xs text-gray-500 max-w-[200px] truncate hidden sm:inline" title={block.reason}>
                        {block.reason}
                      </span>
                    )}
                    {block.is_extension && (
                      <Badge
                        variant="outline"
                        className="text-blue-700 border-blue-300 bg-blue-50 text-[10px]"
                        title={block.original_end_date ? `Originally ended ${block.original_end_date}` : "Trip was extended"}
                      >
                        Extended
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        block.source === "turo-email"
                          ? "text-blue-600 border-blue-200 bg-blue-50 text-[10px]"
                          : "text-gray-600 border-gray-200 bg-gray-50 text-[10px]"
                      }
                    >
                      {block.source === "turo-email" ? "Turo" : "Manual"}
                    </Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditing(block); }}
                      disabled={!!editingId}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
                      aria-label="Edit block"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(block.id); }}
                      disabled={deletingId === block.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      aria-label="Remove block"
                    >
                      {deletingId === block.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Block details modal */}
        {selectedBlockDetail && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/50" onClick={() => setSelectedBlockDetail(null)} />
            <div className="w-full max-w-[calc(100vw-1rem)] sm:max-w-lg bg-white shadow-xl overflow-y-auto" role="dialog" aria-modal="true" aria-label="Blocked trip details">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Blocked Trip Details</h2>
                <button onClick={() => setSelectedBlockDetail(null)} className="p-2 text-gray-400 hover:text-gray-600 -mr-2" aria-label="Close blocked trip details">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Vehicle</p>
                  <p className="font-semibold">{getVehicleName(selectedBlockDetail.vehicle_id)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Start</p>
                    <p className="font-medium">{formatDate(selectedBlockDetail.start_date)}</p>
                    <p className="text-sm text-gray-500">{selectedBlockDetail.pickup_time ? formatTime(selectedBlockDetail.pickup_time) : "Time not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">End</p>
                    <p className="font-medium">{formatDate(selectedBlockDetail.end_date)}</p>
                    <p className="text-sm text-gray-500">{selectedBlockDetail.return_time ? formatTime(selectedBlockDetail.return_time) : "Time not provided"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Driver</p>
                  <p className="font-medium">{getTuroDriverFromReason(selectedBlockDetail.reason) || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pickup Location</p>
                  <p className="font-medium">{selectedBlockDetail.location || "Not available"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Earnings</p>
                  <p className="font-medium">
                    {selectedBlockDetail.earnings != null ? `$${Number(selectedBlockDetail.earnings).toFixed(2)}` : "Not available"}
                  </p>
                </div>
                {selectedBlockDetail.is_extension && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    Extension detected
                    {selectedBlockDetail.original_end_date ? ` — originally ended ${formatDate(selectedBlockDetail.original_end_date)}` : ""}
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Source</p>
                  <p className="font-medium">{selectedBlockDetail.source === "turo-email" ? "Turo Email" : "Manual"}</p>
                </div>
                {selectedBlockDetail.reason && (
                  <div>
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="font-medium">{selectedBlockDetail.reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}
