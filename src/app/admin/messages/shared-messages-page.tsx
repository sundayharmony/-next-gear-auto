"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Hash, Loader2, MessageSquare, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { MessagingPushRegistration } from "@/components/messaging/push-registration";
import { ToastContainer, ToastNotification } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

interface ThreadRow {
  id: string;
  thread_type: "dm" | "channel";
  title: string | null;
  display_title?: string;
  counterpart: { id: string; role: string; name: string; email: string } | null;
  unread_count: number;
  last_message: {
    id: string;
    body: string;
    created_at: string;
    sender_user_id: string;
  } | null;
}

interface MessageRow {
  id: string;
  body: string;
  sender_user_id: string;
  sender_role: "admin" | "manager";
  created_at: string;
}

interface StaffRow {
  id: string;
  role: "admin" | "manager";
  name: string;
  email: string;
}

type InboundToast = { key: string; type: "info"; title: string; message?: string };

const TOAST_THROTTLE_MS = 4000;
const MAX_TOAST_DEDUPE_IDS = 400;

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && d.toDateString() === now.toDateString()) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageDetailTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function SharedMessagesPage({ panelPath, panelTitle }: { panelPath: "/admin/messages" | "/manager/messages"; panelTitle: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [dmTarget, setDmTarget] = useState("");
  const [channelTitle, setChannelTitle] = useState("All Staff");
  const [threadSearch, setThreadSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverMessagingOn, setServerMessagingOn] = useState(true);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<InboundToast[]>([]);
  const [isNarrow, setIsNarrow] = useState(false);
  const [mobileTab, setMobileTab] = useState<"list" | "chat">("list");

  const selectedThreadIdRef = useRef<string | null>(null);
  const threadLastMessageBaselineRef = useRef<Map<string, string | null> | null>(null);
  const toastShownMessageIdsRef = useRef<Set<string>>(new Set());
  const lastToastAtRef = useRef(0);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsNarrow(mq.matches);
    const apply = () => setIsNarrow(mq.matches);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, selectedThreadId]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.key !== id));
  }, []);

  const maybeNotifyInbound = useCallback(
    (incoming: ThreadRow[], viewerId: string | null) => {
      if (!viewerId || typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;

      const baseline = threadLastMessageBaselineRef.current;
      const nextMap = new Map<string, string | null>(incoming.map((t) => [t.id, t.last_message?.id ?? null]));

      if (baseline === null) {
        threadLastMessageBaselineRef.current = nextMap;
        return;
      }

      const now = Date.now();
      for (const t of incoming) {
        const mid = t.last_message?.id ?? null;
        const prev = baseline.get(t.id) ?? null;
        if (!mid || mid === prev) continue;
        if (!t.last_message || t.last_message.sender_user_id === viewerId) continue;
        if (t.id === selectedThreadIdRef.current) continue;
        if (toastShownMessageIdsRef.current.has(mid)) continue;
        if (now - lastToastAtRef.current < TOAST_THROTTLE_MS) continue;

        toastShownMessageIdsRef.current.add(mid);
        if (toastShownMessageIdsRef.current.size > MAX_TOAST_DEDUPE_IDS) {
          const arr = [...toastShownMessageIdsRef.current];
          toastShownMessageIdsRef.current = new Set(arr.slice(-200));
        }
        lastToastAtRef.current = now;

        const title = t.display_title || t.title || "New message";
        const body = t.last_message.body?.slice(0, 120) || "";
        setToasts((prev) => [...prev, { key: mid, type: "info", title, message: body || undefined }]);
      }

      threadLastMessageBaselineRef.current = nextMap;
    },
    []
  );

  const fetchThreads = useCallback(async () => {
    const res = await adminFetch("/api/admin/messages/threads");
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || "Failed to load threads");
    const on = json.messagingEnabled !== false;
    setServerMessagingOn(on);
    const list: ThreadRow[] = on ? json.data || [] : [];
    setThreads(list);
    const vid = json.viewer?.userId ?? null;
    if (vid) setViewerUserId(vid);
    if (on) maybeNotifyInbound(list, vid);
    if (!on) {
      setSelectedThreadId(null);
      setMessages([]);
      threadLastMessageBaselineRef.current = null;
      router.replace(panelPath);
    }
  }, [router, panelPath, maybeNotifyInbound]);

  const fetchMessages = useCallback(
    async (threadId: string) => {
      if (!serverMessagingOn) {
        setMessages([]);
        return;
      }
      setMessagesLoading(true);
      try {
        const res = await adminFetch(`/api/admin/messages/threads/${threadId}/messages?limit=100`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load messages");
        setMessages(json.data || []);
        if (json.messagingEnabled !== false) {
          await adminFetch(`/api/admin/messages/threads/${threadId}/read`, { method: "POST" });
        }
      } finally {
        setMessagesLoading(false);
      }
    },
    [serverMessagingOn]
  );

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const [threadsRes, staffRes] = await Promise.all([
          adminFetch("/api/admin/messages/threads"),
          adminFetch("/api/admin/messages/staff"),
        ]);
        const threadsJson = await threadsRes.json();
        const staffJson = await staffRes.json();
        if (!mounted) return;
        if (!threadsRes.ok || !threadsJson.success) throw new Error(threadsJson.message || "Failed to load threads");
        const messagingOn = threadsJson.messagingEnabled !== false;
        setServerMessagingOn(messagingOn);
        const list: ThreadRow[] = messagingOn ? threadsJson.data || [] : [];
        setThreads(list);
        if (threadsJson.viewer?.userId) setViewerUserId(threadsJson.viewer.userId);
        if (messagingOn) {
          maybeNotifyInbound(list, threadsJson.viewer?.userId ?? null);
        } else {
          threadLastMessageBaselineRef.current = null;
        }
        if (!messagingOn) {
          setSelectedThreadId(null);
          setMessages([]);
          router.replace(panelPath);
        }
        if (staffRes.ok && staffJson.success) {
          setStaff(staffJson.messagingEnabled === false ? [] : staffJson.data || []);
        }
        setError(null);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    const timer = setInterval(() => {
      fetchThreads().catch(() => undefined);
    }, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [fetchThreads, router, panelPath, maybeNotifyInbound]);

  useEffect(() => {
    const urlThread = searchParams.get("thread");
    if (urlThread) {
      setSelectedThreadId(urlThread);
      if (isNarrow) setMobileTab("chat");
      return;
    }
    if (!isNarrow && threads.length > 0) {
      setSelectedThreadId((prev) => prev ?? threads[0].id);
    }
  }, [searchParams, threads, isNarrow]);

  useEffect(() => {
    if (!selectedThreadId || !serverMessagingOn) return;
    fetchMessages(selectedThreadId).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [selectedThreadId, fetchMessages, serverMessagingOn]);

  const selectedThread = useMemo(() => threads.find((t) => t.id === selectedThreadId) || null, [threads, selectedThreadId]);
  const unreadCount = useMemo(() => threads.reduce((sum, t) => sum + (t.unread_count || 0), 0), [threads]);

  const filteredThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const title = (t.display_title || t.title || "").toLowerCase();
      const preview = (t.last_message?.body || "").toLowerCase();
      return title.includes(q) || preview.includes(q);
    });
  }, [threads, threadSearch]);

  const staffForDm = useMemo(() => {
    if (!viewerUserId) return staff;
    return staff.filter((s) => s.id !== viewerUserId);
  }, [staff, viewerUserId]);

  const threadHeaderTitle = selectedThread
    ? selectedThread.display_title || selectedThread.title || (selectedThread.thread_type === "dm" ? "Direct message" : "Channel")
    : "Select a thread";

  const openThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setMobileTab("chat");
    router.replace(`${panelPath}?thread=${threadId}`);
  };

  const backToThreads = () => {
    setSelectedThreadId(null);
    setMobileTab("list");
    router.replace(panelPath);
  };

  const createDm = async () => {
    if (!serverMessagingOn || !dmTarget) return;
    const [role, userId] = dmTarget.split(":");
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadType: "dm", peerUserId: userId, peerRole: role }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to create DM");
      await fetchThreads();
      openThread(json.data.id);
      setDmTarget("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const createChannel = async () => {
    if (!serverMessagingOn || !channelTitle.trim()) return;
    setBusy(true);
    try {
      const members = staff.map((s) => ({ userId: s.id, role: s.role }));
      const res = await adminFetch("/api/admin/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadType: "channel", title: channelTitle.trim(), members }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to create channel");
      await fetchThreads();
      openThread(json.data.id);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!serverMessagingOn || !selectedThreadId || !composer.trim()) return;
    setBusy(true);
    try {
      const res = await adminFetch(`/api/admin/messages/threads/${selectedThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: composer, clientMessageId: crypto.randomUUID() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to send message");
      setComposer("");
      await fetchMessages(selectedThreadId);
      await fetchThreads();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const showThreadList = !isNarrow || mobileTab === "list";
  const showConversation = !isNarrow || mobileTab === "chat";

  return (
    <>
      <ToastContainer>
        {toasts.map((t) => (
          <ToastNotification key={t.key} id={t.key} type={t.type} title={t.title} message={t.message} onDismiss={dismissToast} />
        ))}
      </ToastContainer>

      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold">{panelTitle}</h1>
          <p className="mt-1 text-purple-200">Unread messages: {unreadCount}</p>
        </div>
      </section>

      <PageContainer className="py-5 sm:py-8 space-y-4">
        <MessagingPushRegistration />
        {!serverMessagingOn && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Internal messaging is turned off in production settings. In Vercel, set{" "}
            <code className="rounded bg-amber-100/80 px-1">FF_STAFF_MESSAGING_ENABLED</code> to{" "}
            <code className="rounded bg-amber-100/80 px-1">true</code>, optionally{" "}
            <code className="rounded bg-amber-100/80 px-1">FF_STAFF_MESSAGING_EMAIL_ENABLED</code> /{" "}
            <code className="rounded bg-amber-100/80 px-1">FF_STAFF_MESSAGING_PUSH_ENABLED</code>, then redeploy. Run{" "}
            <code className="rounded bg-amber-100/80 px-1">supabase-internal-messaging.sql</code> and{" "}
            <code className="rounded bg-amber-100/80 px-1">supabase-internal-messaging-dm-pair.sql</code> on your database if you have not already.
          </div>
        )}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
          <div
            className={cn(
              "flex flex-col rounded-lg border border-gray-200 bg-white p-3 space-y-3",
              !showThreadList && "hidden",
              "lg:flex"
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MessageSquare className="h-4 w-4 shrink-0" /> Threads
            </div>
            <Input
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              placeholder="Search threads..."
              disabled={!serverMessagingOn}
              className="text-sm"
              aria-label="Search threads"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Select value={dmTarget} onChange={(e) => setDmTarget(e.target.value)} disabled={!serverMessagingOn} className="min-w-0 flex-1">
                <option value="">Start direct message...</option>
                {staffForDm.map((s) => (
                  <option key={`${s.role}:${s.id}`} value={`${s.role}:${s.id}`}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </Select>
              <Button size="sm" type="button" className="shrink-0" onClick={createDm} disabled={!serverMessagingOn || busy || !dmTarget}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={channelTitle}
                onChange={(e) => setChannelTitle(e.target.value)}
                placeholder="Channel title"
                disabled={!serverMessagingOn}
                className="min-w-0 flex-1"
              />
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="shrink-0 whitespace-nowrap"
                onClick={createChannel}
                disabled={!serverMessagingOn || busy || !channelTitle.trim()}
              >
                Create Channel
              </Button>
            </div>
            <div className="space-y-2">
              {loading && <p className="text-xs text-gray-500">Loading threads...</p>}
              {!loading && serverMessagingOn && filteredThreads.length === 0 && (
                <p className="text-xs text-gray-500">{threads.length === 0 ? "No threads yet." : "No matching threads."}</p>
              )}
              {!loading && !serverMessagingOn && <p className="text-xs text-gray-500">Messaging is disabled.</p>}
              {filteredThreads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openThread(t.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-colors",
                    selectedThreadId === t.id ? "border-purple-400 bg-purple-50 ring-1 ring-purple-200" : "border-gray-200 bg-white hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-purple-600" aria-hidden>
                        {t.thread_type === "channel" ? <Hash className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {t.display_title || t.title || (t.thread_type === "dm" ? "Direct message" : "Channel")}
                        </p>
                        {t.last_message && <p className="text-xs text-gray-500 truncate mt-0.5">{t.last_message.body}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {t.last_message && (
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatShortTime(t.last_message.created_at)}</span>
                      )}
                      {t.unread_count > 0 && (
                        <span className="rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {t.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "flex min-h-[min(70vh,520px)] flex-col rounded-lg border border-gray-200 bg-white lg:min-h-[420px]",
              !showConversation && "hidden",
              "lg:flex"
            )}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 py-2">
              {isNarrow && mobileTab === "chat" && (
                <Button type="button" variant="ghost" size="sm" className="-ml-1 h-8 px-2" onClick={backToThreads} aria-label="Back to threads">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <p className="text-sm font-semibold text-gray-900 truncate">{threadHeaderTitle}</p>
            </div>

            <div ref={messagesScrollRef} className="min-h-0 flex-1 overflow-y-auto space-y-3 px-3 py-3">
              {!selectedThreadId && <p className="text-sm text-gray-500">Choose or create a thread to start messaging.</p>}
              {selectedThreadId && messagesLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-hidden />
                  <span className="sr-only">Loading messages</span>
                </div>
              )}
              {selectedThreadId && !messagesLoading && messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
              {selectedThreadId &&
                !messagesLoading &&
                messages.map((m) => {
                  const isOwn = viewerUserId != null && m.sender_user_id === viewerUserId;
                  return (
                    <div key={m.id} className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[min(100%,28rem)] rounded-2xl px-3 py-2 shadow-sm",
                          isOwn ? "bg-purple-600 text-white" : "border border-gray-200 bg-gray-50 text-gray-900"
                        )}
                      >
                        <p className={cn("text-[11px] mb-1", isOwn ? "text-purple-100" : "text-gray-500")}>
                          {m.sender_role} · {formatMessageDetailTime(m.created_at)}
                        </p>
                        <p className={cn("text-sm whitespace-pre-wrap break-words", isOwn ? "text-white" : "text-gray-900")}>{m.body}</p>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div
              className={cn(
                "mt-auto flex shrink-0 gap-2 border-t border-gray-200 p-3",
                "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px)+12px)] lg:pb-3"
              )}
            >
              <textarea
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Type a message..."
                disabled={!serverMessagingOn}
                rows={2}
                className={cn(
                  "min-h-[44px] max-h-[160px] w-full flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                type="button"
                className="shrink-0 self-end"
                onClick={sendMessage}
                disabled={!serverMessagingOn || busy || !selectedThreadId || !composer.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
