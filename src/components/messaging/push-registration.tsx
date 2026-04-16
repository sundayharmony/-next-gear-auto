"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type PushStatus = "unsupported" | "checking" | "blocked" | "ready" | "subscribed" | "error";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((ch) => ch.charCodeAt(0)));
}

async function getServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) throw new Error("Service Worker not supported");
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

export function MessagingPushRegistration({ className }: { className?: string }) {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
          if (mounted) setStatus("unsupported");
          return;
        }
        const permission = Notification.permission;
        if (permission === "denied") {
          if (mounted) setStatus("blocked");
          return;
        }
        const registration = await getServiceWorkerRegistration();
        const existing = await registration.pushManager.getSubscription();
        if (!mounted) return;
        if (existing) {
          setStatus("subscribed");
        } else {
          setStatus("ready");
        }
      } catch (e) {
        if (mounted) {
          setStatus("error");
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const canToggle = useMemo(() => status === "ready" || status === "subscribed", [status]);

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "ready");
        return;
      }

      const registration = await getServiceWorkerRegistration();
      const cfgRes = await fetch("/api/admin/messages/push-config", { credentials: "same-origin" });
      const cfgJson = await cfgRes.json();
      if (!cfgRes.ok || !cfgJson?.success || !cfgJson?.data?.publicKey) {
        throw new Error(cfgJson?.message || "Failed to load push config");
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cfgJson.data.publicKey),
        });
      }

      const saveRes = await fetch("/api/admin/messages/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(subscription.toJSON()),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson?.success) {
        throw new Error(saveJson?.message || "Failed to save push subscription");
      }
      setStatus("subscribed");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = encodeURIComponent(subscription.endpoint);
        await fetch(`/api/admin/messages/push-subscriptions?endpoint=${endpoint}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        await subscription.unsubscribe();
      }
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white p-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">iPhone Push Notifications</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {status === "unsupported" && "This browser does not support push notifications."}
            {status === "checking" && "Checking push notification support..."}
            {status === "blocked" && "Notifications are blocked in browser settings."}
            {status === "ready" && "Enable push to get staff message alerts on this device."}
            {status === "subscribed" && "Push notifications are enabled for this device."}
            {status === "error" && (error || "Failed to configure push notifications.")}
          </p>
        </div>
        {canToggle && (
          <Button
            size="sm"
            variant={status === "subscribed" ? "outline" : "default"}
            disabled={busy}
            onClick={status === "subscribed" ? disable : enable}
            className="shrink-0"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === "subscribed" ? (
              <>
                <BellOff className="h-4 w-4 mr-1" />
                Disable
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-1" />
                Enable
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
