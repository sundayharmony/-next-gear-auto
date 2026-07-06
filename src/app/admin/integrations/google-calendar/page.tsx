"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Loader2, Plug, RefreshCw, Unplug } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { AdminPageBody, AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminStatusBanner } from "@/components/admin/ui-feedback";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { logger } from "@/lib/utils/logger";

type Status = {
  connected: boolean;
  configured: boolean;
  calendarId: string | null;
  calendarSummary: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

type CalendarOption = {
  id: string;
  summary: string;
  primary?: boolean;
};

export default function GoogleCalendarIntegrationPage() {
  const searchParams = useSearchParams();
  const { error, setError, success, setSuccess } = useAutoToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");

  const queryMessage = useMemo(() => {
    const err = searchParams.get("error");
    if (err) return decodeURIComponent(err);
    if (searchParams.get("connected") === "1") return "Google Calendar connected.";
    return null;
  }, [searchParams]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/integrations/google-calendar");
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load Google Calendar status");
        return;
      }
      const data = json.data as Status;
      setStatus(data);
      setSelectedCalendarId(data.calendarId || "");
      if (data.connected) {
        const calRes = await adminFetch("/api/admin/integrations/google-calendar/calendars");
        const calJson = await calRes.json();
        if (calRes.ok && calJson.success) {
          setCalendars(calJson.data as CalendarOption[]);
        }
      } else {
        setCalendars([]);
      }
    } catch (err) {
      logger.error("Google Calendar status load failed", err);
      setError("Failed to load Google Calendar status");
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (queryMessage) {
      if (searchParams.get("error")) setError(queryMessage);
      else setSuccess(queryMessage);
    }
  }, [queryMessage, searchParams, setError, setSuccess]);

  const handleConnect = () => {
    window.location.href = "/api/admin/integrations/google-calendar/connect";
  };

  const handleDisconnect = async () => {
    try {
      const res = await adminFetch("/api/admin/integrations/google-calendar/disconnect", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to disconnect");
        return;
      }
      setSuccess("Disconnected Google Calendar");
      await loadStatus();
    } catch (err) {
      logger.error("Google Calendar disconnect failed", err);
      setError("Failed to disconnect");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await adminFetch("/api/admin/integrations/google-calendar/sync", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Sync failed");
        return;
      }
      const data = json.data as { upserted: number; deleted: number; skipped: number };
      setSuccess(
        `Sync complete — ${data.upserted} updated, ${data.deleted} removed, ${data.skipped} unchanged`
      );
      await loadStatus();
    } catch (err) {
      logger.error("Google Calendar sync failed", err);
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleCalendarChange = async (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    const selected = calendars.find((c) => c.id === calendarId);
    try {
      const res = await adminFetch("/api/admin/integrations/google-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
          calendarSummary: selected?.summary || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to save calendar selection");
        return;
      }
      setSuccess(`Fleet calendar set to ${selected?.summary || calendarId}`);
      await loadStatus();
    } catch (err) {
      logger.error("Google Calendar selection failed", err);
      setError("Failed to save calendar selection");
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Google Calendar"
        subtitle="One-way sync of website bookings, Turo trips, and manual blocks to your fleet calendar"
      />
      <AdminPageBody>
        {error ? (
          <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} />
        ) : null}
        {success ? (
          <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        ) : null}

        <Card>
          <CardContent className="p-6 space-y-5">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading connection status…
              </div>
            ) : (
              <>
                {!status?.configured && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                    Server OAuth is not configured. Add `GOOGLE_CALENDAR_CLIENT_ID`,
                    `GOOGLE_CALENDAR_CLIENT_SECRET`, and `GOOGLE_CALENDAR_ENCRYPTION_KEY` in Vercel,
                    then apply `supabase-google-calendar.sql`.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    {status?.connected
                      ? status.calendarSummary || status.calendarId
                      : "Not connected"}
                  </div>
                  {status?.connected ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                      Connected
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      Disconnected
                    </span>
                  )}
                </div>

                {status?.connected && (
                  <div className="text-sm text-gray-600 space-y-1">
                    {status.connectedAt && (
                      <p>Connected: {new Date(status.connectedAt).toLocaleString()}</p>
                    )}
                    {status.lastSyncAt && (
                      <p>Last sync: {new Date(status.lastSyncAt).toLocaleString()}</p>
                    )}
                    {status.lastError && (
                      <p className="text-red-600">Last error: {status.lastError}</p>
                    )}
                  </div>
                )}

                {status?.connected && calendars.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700" htmlFor="fleet-calendar">
                      Fleet calendar
                    </label>
                    <select
                      id="fleet-calendar"
                      className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm"
                      value={selectedCalendarId}
                      onChange={(e) => void handleCalendarChange(e.target.value)}
                    >
                      {calendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.summary}
                          {cal.primary ? " (primary)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  {!status?.connected ? (
                    <Button onClick={handleConnect} disabled={!status?.configured}>
                      <Plug className="h-4 w-4 mr-2" />
                      Connect Google Calendar
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSync} disabled={syncing}>
                        {syncing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Sync now
                      </Button>
                      <Button variant="outline" onClick={handleDisconnect}>
                        <Unplug className="h-4 w-4 mr-2" />
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>

                <p className="text-xs text-gray-500 pt-2">
                  Events include pickup locations when available. Past-ended Turo trips are not
                  re-synced to protect finances. A reconcile job also runs every 15 minutes.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </AdminPageBody>
    </>
  );
}
