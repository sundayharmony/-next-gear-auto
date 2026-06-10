"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Send,
  Car,
  Users,
  Upload,
  Search,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { AdminPageBody, AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CampaignBodyEditor } from "@/components/admin/campaign-body-editor";
import { AdminStatusBanner } from "@/components/admin/ui-feedback";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";
import { MARKETING_VEHICLE_MARKER } from "@/lib/email/sanitize-campaign-html";
import { stripRichHtmlToText } from "@/lib/utils/validation";
import { parseApiJsonResponse } from "@/lib/utils/parse-api-json";

type RecipientMode = "all" | "selected" | "import";

interface AdminVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  category?: string;
  images: string[];
  dailyRate: number;
  isAvailable: boolean;
  isPublished?: boolean;
}

interface CustomerRow {
  id: string;
  name: string;
  email: string;
}

export default function AdminMarketingPage() {
  const { error, setError, success, setSuccess } = useAutoToast();
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p>Hi there,</p><p>We wanted to share an update on vehicles you might like.</p>");
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  const [importText, setImportText] = useState("");
  const [sending, setSending] = useState(false);

  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  const fetchVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    try {
      const res = await adminFetch("/api/admin/vehicles");
      const json = await res.json();
      if (res.ok && json.success) {
        const list = (json.data as AdminVehicle[]).filter((v) => v.isPublished !== false);
        setVehicles(list);
      } else {
        setError(json.message || "Failed to load vehicles");
      }
    } catch (err) {
      logger.error("Marketing: failed to load vehicles", err);
      setError("Failed to load vehicles");
    } finally {
      setVehiclesLoading(false);
    }
  }, [setError]);

  const fetchCustomers = useCallback(async (search: string) => {
    setCustomersLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (search.trim()) params.set("search", search.trim());
      const res = await adminFetch(`/api/admin/customers?${params}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setCustomers(
          (json.data as CustomerRow[]).filter((c) => c.email?.trim()),
        );
      }
    } catch (err) {
      logger.error("Marketing: failed to load customers", err);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    if (recipientMode !== "selected") return;
    const t = window.setTimeout(() => fetchCustomers(customerSearch), 300);
    return () => clearTimeout(t);
  }, [recipientMode, customerSearch, fetchCustomers]);

  const publishedVehicles = useMemo(
    () => vehicles.filter((v) => v.isPublished !== false),
    [vehicles],
  );

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const insertVehiclePlaceholder = () => {
    if (bodyHtml.includes(MARKETING_VEHICLE_MARKER)) {
      setSuccess("Vehicle block already in the email body.");
      return;
    }
    setBodyHtml((prev) => `${prev}<p><br></p>${MARKETING_VEHICLE_MARKER}`);
    setSuccess("Vehicle cards will appear where you inserted them when the email is sent.");
  };

  const selectAllVehicles = () => {
    setSelectedVehicleIds(new Set(publishedVehicles.map((v) => v.id)));
  };

  const clearVehicles = () => setSelectedVehicleIds(new Set());

  const importEmails = useMemo(() => {
    return importText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
  }, [importText]);

  const recipientCountEstimate = useMemo(() => {
    if (recipientMode === "all") return "All customers";
    if (recipientMode === "selected") return `${selectedCustomerIds.size} selected`;
    return `${importEmails.length} imported`;
  }, [recipientMode, selectedCustomerIds.size, importEmails.length]);

  const sendCampaign = async () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      setError("Subject is required");
      return;
    }
    if (!stripRichHtmlToText(bodyHtml).trim()) {
      setError("Email body is required");
      return;
    }
    if (recipientMode === "selected" && selectedCustomerIds.size === 0) {
      setError("Select at least one customer");
      return;
    }
    if (recipientMode === "import" && importEmails.length === 0) {
      setError("Add at least one email address");
      return;
    }

    if (
      !window.confirm(
        `Send this campaign to ${recipientCountEstimate}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await adminFetch("/api/admin/marketing/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: trimmedSubject,
          bodyHtml,
          vehicleIds: Array.from(selectedVehicleIds),
          recipientMode,
          customerIds: recipientMode === "selected" ? Array.from(selectedCustomerIds) : undefined,
          importEmails: recipientMode === "import" ? importEmails : undefined,
        }),
      });
      const parsed = await parseApiJsonResponse(res);
      if (!parsed.ok) {
        logger.error("Marketing send failed", { status: res.status, message: parsed.message });
        setError(
          parsed.message.includes("Server error")
            ? `${parsed.message}. Check Vercel logs or SMTP configuration.`
            : parsed.message
        );
        return;
      }
      const json = parsed.data;
      if (res.ok && json.success) {
        const data = json.data as {
          sent?: number;
          failed?: unknown[];
          attempted?: number;
        } | undefined;
        const sent = data?.sent ?? 0;
        const failed = data?.failed;
        const attempted = data?.attempted;
        if (Array.isArray(failed) && failed.length > 0) {
          setError(
            (typeof json.message === "string" ? json.message : null) ||
              `Sent ${sent} of ${attempted}. ${failed.length} failed.`,
          );
        } else {
          setSuccess(
            (typeof json.message === "string" ? json.message : null) ||
              `Campaign sent to ${sent} recipients.`,
          );
        }
      } else {
        setError(
          (typeof json.message === "string" ? json.message : null) ||
            "Failed to send campaign",
        );
      }
    } catch (err) {
      logger.error("Marketing send failed", err);
      setError("Network error — could not send campaign");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Marketing"
        subtitle="Compose and send email campaigns to customers with optional vehicle highlights."
      />

      <AdminPageBody className="space-y-6">
        {error ? <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} /> : null}
        {success ? (
          <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Email</h2>
              <div>
                <label htmlFor="campaign-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <Input
                  id="campaign-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. New vehicles available this week"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Body
                </label>
                <CampaignBodyEditor value={bodyHtml} onChange={setBodyHtml} />
                <p className="mt-2 text-xs text-gray-500">
                  Use bold, lists, and links. Insert a vehicle block below to place cards in the message.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Car className="h-5 w-5 text-purple-600" />
                  Vehicles
                </h2>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllVehicles}>
                    All
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearVehicles}>
                    Clear
                  </Button>
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={insertVehiclePlaceholder} className="w-full">
                Insert vehicle cards into email
              </Button>
              {vehiclesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                </div>
              ) : publishedVehicles.length === 0 ? (
                <p className="text-sm text-gray-500">No published vehicles found.</p>
              ) : (
                <div className="grid gap-3 max-h-[420px] overflow-y-auto pr-1 sm:grid-cols-2">
                  {publishedVehicles.map((v) => {
                    const selected = selectedVehicleIds.has(v.id);
                    const name = getVehicleDisplayName(v);
                    const thumb = v.images?.[0];
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleVehicle(v.id)}
                        className={`text-left rounded-lg border p-2 transition-colors ${
                          selected
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex gap-2">
                          <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="80px"
                                unoptimized={thumb.startsWith("http")}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-gray-400">
                                No img
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{name}</p>
                            <p className="text-sm text-purple-700 font-semibold">${v.dailyRate}/day</p>
                            <Badge
                              className={
                                v.isAvailable
                                  ? "bg-green-100 text-green-800 text-[10px] mt-1"
                                  : "bg-amber-100 text-amber-800 text-[10px] mt-1"
                              }
                            >
                              {v.isAvailable ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          <span className="shrink-0 text-purple-600">
                            {selected ? (
                              <CheckSquare className="h-5 w-5" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-300" />
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-gray-500">
                {selectedVehicleIds.size} vehicle{selectedVehicleIds.size === 1 ? "" : "s"} selected for the campaign.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Recipients
            </h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { mode: "all" as const, label: "All clients" },
                  { mode: "selected" as const, label: "Select clients" },
                  { mode: "import" as const, label: "Import emails" },
                ] as const
              ).map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRecipientMode(mode)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    recipientMode === mode
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {recipientMode === "selected" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name or email…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
                {customersLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                    {customers.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">No customers match your search.</p>
                    ) : (
                      customers.map((c) => {
                        const checked = selectedCustomerIds.has(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCustomer(c.id)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium truncate">{c.name || "—"}</span>
                              <span className="block text-xs text-gray-500 truncate">{c.email}</span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {recipientMode === "import" && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Upload className="h-4 w-4" />
                  One email per line (or comma-separated)
                </label>
                <textarea
                  className="w-full min-h-[120px] rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="customer@example.com&#10;another@example.com"
                />
                <p className="text-xs text-gray-500">{importEmails.length} address(es) detected</p>
              </div>
            )}

            {recipientMode === "all" && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sends to all customer accounts with a valid email (excludes admin and manager accounts).
                Maximum 300 recipients per campaign.
              </p>
            )}

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recipients: <strong>{recipientCountEstimate}</strong>
                {selectedVehicleIds.size > 0 && (
                  <> · Vehicles: <strong>{selectedVehicleIds.size}</strong></>
                )}
              </p>
              <Button
                onClick={sendCampaign}
                disabled={sending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminPageBody>
    </>
  );
}
