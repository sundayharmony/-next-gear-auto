"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Link2, Unlink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { csrfFetch } from "@/lib/utils/csrf-fetch";
import { logger } from "@/lib/utils/logger";

interface GoogleCalendarConnectProps {
  onStatusChange?: (connected: boolean) => void;
}

export function GoogleCalendarConnect({ onStatusChange }: GoogleCalendarConnectProps) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google/status");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setConfigured(data.data.configured);
        setConnected(data.data.connected);
        onStatusChange?.(data.data.connected);
      }
    } catch (err) {
      logger.error("Failed to check Google Calendar status:", err);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    checkStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      setMessage({ type: "success", text: "Google Calendar connected successfully! Your trips will now sync automatically." });
      setConnected(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("google_connected");
      window.history.replaceState({}, "", url.toString());
    } else if (params.get("error")?.startsWith("google_")) {
      const errorCode = params.get("error");
      const errorMessages: Record<string, string> = {
        google_not_configured: "Google Calendar integration is not configured.",
        google_auth_denied: "Google Calendar access was denied.",
        google_invalid_callback: "Invalid callback from Google.",
        google_invalid_state: "Invalid authorization state.",
        google_state_expired: "Authorization session expired. Please try again.",
        google_storage_failed: "Failed to save Google connection.",
        google_auth_failed: "Google authentication failed.",
      };
      setMessage({ type: "error", text: errorMessages[errorCode || ""] || "Failed to connect Google Calendar." });
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [checkStatus]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleConnect = () => {
    window.location.href = "/api/auth/google/authorize";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await csrfFetch("/api/auth/google/disconnect", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setConnected(false);
        onStatusChange?.(false);
        setMessage({ type: "success", text: "Google Calendar disconnected." });
      } else {
        setMessage({ type: "error", text: data.message || "Failed to disconnect." });
      }
    } catch (err) {
      logger.error("Failed to disconnect Google Calendar:", err);
      setMessage({ type: "error", text: "Failed to disconnect Google Calendar." });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="text-gray-500">Checking Google Calendar status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!configured) {
    return null;
  }

  return (
    <Card className={connected ? "border-green-200 bg-green-50/50" : ""}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${connected ? "bg-green-100" : "bg-gray-100"}`}>
            <Calendar className={`h-6 w-6 ${connected ? "text-green-600" : "text-gray-500"}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Google Calendar Sync</h3>
            <p className="text-sm text-gray-500 mb-4">
              {connected
                ? "Your trips are automatically added to your Google Calendar when you book."
                : "Connect your Google Calendar to automatically add your trips when you book."}
            </p>

            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
                message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                {message.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {connected ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-red-600 hover:bg-red-50"
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Unlink className="h-3.5 w-3.5 mr-1" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect} className="bg-purple-600 hover:bg-purple-700">
                <Link2 className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
