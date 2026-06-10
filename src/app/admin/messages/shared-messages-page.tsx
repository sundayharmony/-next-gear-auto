"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageBody, AdminPageHeader } from "@/components/admin/admin-shell";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { staffKeys, useStaffQuery } from "@/lib/hooks/use-staff-query";
import { MessagingPushRegistration } from "@/components/messaging/push-registration";
import { ToastContainer, ToastNotification } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { parseMessageBodyRuns } from "@/lib/messaging/service";
import { MessageAttachments } from "./messages/attachment-preview";
import {
  MessageComposer,
  STAFF_ATTACHMENT_ALLOWED_MIMES,
  STAFF_ATTACHMENT_MAX_BYTES,
  MAX_MESSAGE_ATTACHMENTS,
} from "./messages/message-composer";
import {
  editorHtmlToMarkdown,
  fileLabelFromUrl,
  formatMessageDetailTime,
  markdownToEditorHtml,
} from "./messages/message-utils";
import { ThreadList } from "./messages/thread-list";
import {
  MAX_MESSAGE_BODY_CHARS,
  MAX_TOAST_DEDUPE_IDS,
  TOAST_THROTTLE_MS,
  type InboundToast,
  type MessageRow,
  type StaffRow,
  type ThreadRow,
} from "./messages/types";

interface ThreadsQueryPayload {
  threads: ThreadRow[];
  messagingEnabled: boolean;
  channels?: { email: boolean; push: boolean };
  viewerUserId: string | null;
}

export function SharedMessagesPage({ panelPath, panelTitle }: { panelPath: "/admin/messages" | "/manager/messages"; panelTitle: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [dmTarget, setDmTarget] = useState("");
  const [channelTitle, setChannelTitle] = useState("All Staff");
  const [threadSearch, setThreadSearch] = useState("");
  const [staffLoading, setStaffLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverMessagingOn, setServerMessagingOn] = useState(true);
  const [toasts, setToasts] = useState<InboundToast[]>([]);
  const [isNarrow, setIsNarrow] = useState(false);
  const [mobileTab, setMobileTab] = useState<"list" | "chat">("list");
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ url: string; name: string }>>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [notificationChannels, setNotificationChannels] = useState<{ email: boolean; push: boolean } | null>(null);

  const threadsQuery = useStaffQuery<ThreadsQueryPayload>(
    staffKeys.messageThreads(panelPath),
    "/api/admin/messages/threads",
    {
      queryFn: async () => {
        const res = await adminFetch("/api/admin/messages/threads");
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load threads");
        const messagingEnabled = json.messagingEnabled !== false;
        return {
          threads: messagingEnabled ? (json.data || []) : [],
          messagingEnabled,
          channels:
            json.channels &&
            typeof json.channels.email === "boolean" &&
            typeof json.channels.push === "boolean"
              ? { email: json.channels.email, push: json.channels.push }
              : undefined,
          viewerUserId: json.viewer?.userId ?? null,
        };
      },
      refetchInterval: () =>
        typeof document !== "undefined" && document.hidden ? false : 15_000,
      staleTime: 10_000,
    }
  );

  const threads = threadsQuery.data?.threads ?? [];
  const viewerUserId = threadsQuery.data?.viewerUserId ?? null;
  const loading = threadsQuery.isLoading || staffLoading;

  const selectedThreadIdRef = useRef<string | null>(null);
  const threadLastMessageBaselineRef = useRef<Map<string, string | null> | null>(null);
  const toastShownMessageIdsRef = useRef<Set<string>>(new Set());
  const lastToastAtRef = useRef(0);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const lastRenderedThreadRef = useRef<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const draftStorageKey = selectedThreadId ? `staff-message-draft:${panelPath}:${selectedThreadId}` : null;

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    setPendingAttachments([]);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!draftStorageKey || typeof window === "undefined") {
      if (!selectedThreadId) setComposer("");
      return;
    }
    try {
      const stored = window.localStorage.getItem(draftStorageKey);
      setComposer(stored || "");
    } catch {
      setComposer("");
    }
  }, [draftStorageKey, selectedThreadId]);

  useEffect(() => {
    if (!draftStorageKey || typeof window === "undefined") return;
    try {
      const trimmed = composer.trim();
      if (!trimmed) window.localStorage.removeItem(draftStorageKey);
      else window.localStorage.setItem(draftStorageKey, composer);
    } catch {
      // Ignore storage errors
    }
  }, [composer, draftStorageKey]);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const html = markdownToEditorHtml(composer);
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [composer, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId || !serverMessagingOn) return;
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [selectedThreadId, serverMessagingOn]);

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
    const threadChanged = lastRenderedThreadRef.current !== selectedThreadId;
    if (threadChanged || shouldStickToBottomRef.current) el.scrollTop = el.scrollHeight;
    lastRenderedThreadRef.current = selectedThreadId;
  }, [messages, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    setError(null);
  }, [selectedThreadId]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.key !== id));
  }, []);

  const maybeNotifyInbound = useCallback((incoming: ThreadRow[], viewerId: string | null) => {
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
      const preview = (t.last_message.preview ?? t.last_message.body)?.slice(0, 120) || "";
      setToasts((prev) => [...prev, { key: mid, type: "info", title, message: preview || undefined }]);
    }

    threadLastMessageBaselineRef.current = nextMap;
  }, []);

  const refreshThreads = useCallback(async () => {
    await threadsQuery.refetch();
  }, [threadsQuery]);

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
    if (!threadsQuery.data) return;
    const { threads: list, messagingEnabled, channels, viewerUserId: vid } = threadsQuery.data;
    setServerMessagingOn(messagingEnabled);
    if (channels) setNotificationChannels(channels);
    if (messagingEnabled) maybeNotifyInbound(list, vid);
    else threadLastMessageBaselineRef.current = null;
    if (!messagingEnabled) {
      setSelectedThreadId(null);
      setMessages([]);
      router.replace(panelPath);
    }
  }, [threadsQuery.data, maybeNotifyInbound, router, panelPath]);

  useEffect(() => {
    if (threadsQuery.error) {
      setError(threadsQuery.error.message);
    }
  }, [threadsQuery.error]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setStaffLoading(true);
        const staffRes = await adminFetch("/api/admin/messages/staff");
        const staffJson = await staffRes.json();
        if (!mounted) return;
        if (staffRes.ok && staffJson.success) {
          setStaff(staffJson.messagingEnabled === false ? [] : staffJson.data || []);
        }
        setError(null);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setStaffLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

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

  const unreadCount = useMemo(() => threads.reduce((sum, t) => sum + (t.unread_count || 0), 0), [threads]);

  const filteredThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const title = (t.display_title || t.title || "").toLowerCase();
      const preview = (t.last_message?.preview ?? t.last_message?.body ?? "").toLowerCase();
      return title.includes(q) || preview.includes(q);
    });
  }, [threads, threadSearch]);

  const staffForDm = useMemo(() => {
    if (!viewerUserId) return staff;
    return staff.filter((s) => s.id !== viewerUserId);
  }, [staff, viewerUserId]);

  const selectedThread = useMemo(() => threads.find((t) => t.id === selectedThreadId) || null, [threads, selectedThreadId]);

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
      await refreshThreads();
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
      await refreshThreads();
      openThread(json.data.id);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const uploadAttachment = useCallback(async (file: File, threadId: string): Promise<{ url: string; name: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await adminFetch(`/api/admin/messages/threads/${threadId}/attachments`, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || "Upload failed");
    const url = json.url as string;
    const name = typeof json.filename === "string" && json.filename.trim() ? json.filename.trim() : fileLabelFromUrl(url);
    return { url, name };
  }, []);

  const onAttachmentFilesSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length || !selectedThreadId || !serverMessagingOn) return;

    const remaining = MAX_MESSAGE_ATTACHMENTS - pendingAttachments.length;
    if (remaining <= 0) {
      setError(`You can attach up to ${MAX_MESSAGE_ATTACHMENTS} files per message.`);
      return;
    }

    const list = Array.from(files).slice(0, remaining);
    for (const file of list) {
      if (!STAFF_ATTACHMENT_ALLOWED_MIMES.has(file.type)) {
        setError("Unsupported file type. Use images, PDF, TXT, CSV, or Word/Excel/PowerPoint files (see upload restrictions).");
        return;
      }
      if (file.size > STAFF_ATTACHMENT_MAX_BYTES) {
        setError("Each file must be 10MB or smaller.");
        return;
      }
    }

    setUploadingAttachments(true);
    setError(null);
    try {
      const added: Array<{ url: string; name: string }> = [];
      for (const file of list) added.push(await uploadAttachment(file, selectedThreadId));
      setPendingAttachments((prev) => [...prev, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingAttachments(false);
    }
  };

  const removePendingAttachment = (url: string) => {
    setPendingAttachments((prev) => prev.filter((p) => p.url !== url));
  };

  const sendMessage = async () => {
    if (!serverMessagingOn || !selectedThreadId) return;
    const text = composer.trim();
    const urls = pendingAttachments.map((p) => p.url);
    if (!text && urls.length === 0) return;
    if (text.length > MAX_MESSAGE_BODY_CHARS) {
      setError(`Message text is too long (${text.length}/${MAX_MESSAGE_BODY_CHARS}).`);
      return;
    }
    setBusy(true);
    try {
      const res = await adminFetch(`/api/admin/messages/threads/${selectedThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text || undefined,
          attachmentUrls: urls.length ? urls : undefined,
          clientMessageId: crypto.randomUUID(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to send message");
      const created = json.data as MessageRow | undefined;
      if (created?.id) {
        setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
      }
      setComposer("");
      setPendingAttachments([]);
      if (composerRef.current) composerRef.current.innerHTML = "";
      if (draftStorageKey && typeof window !== "undefined") window.localStorage.removeItem(draftStorageKey);
      setError(null);
      void Promise.all([fetchMessages(selectedThreadId), refreshThreads()]).catch((e) =>
        setError(e instanceof Error ? e.message : String(e))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const applyComposerFormat = useCallback(
    (command: "bold" | "italic") => {
      const el = composerRef.current;
      if (!el || !serverMessagingOn) return;
      el.focus();
      document.execCommand(command);
      setComposer(editorHtmlToMarkdown(el.innerHTML));
    },
    [serverMessagingOn]
  );

  const deleteMessage = async (messageId: string) => {
    if (!serverMessagingOn || !selectedThreadId) return;
    if (!window.confirm("Delete this message? This cannot be undone.")) return;
    setDeletingId(messageId);
    try {
      const res = await adminFetch(`/api/admin/messages/threads/${selectedThreadId}/messages/${messageId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to delete message");
      await fetchMessages(selectedThreadId);
      await refreshThreads();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
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

      <AdminPageHeader
        title={panelTitle}
        subtitle={`Unread messages: ${unreadCount}`}
      />

      <AdminPageBody className="py-5 sm:py-8 space-y-4">
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
        {serverMessagingOn && notificationChannels && !notificationChannels.email && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
            Email notifications are off for this deployment. Recipients will not get email when you message them. To turn them on, set{" "}
            <code className="rounded bg-sky-100/90 px-1">FF_STAFF_MESSAGING_EMAIL_ENABLED</code> or{" "}
            <code className="rounded bg-sky-100/90 px-1">NEXT_PUBLIC_FF_STAFF_MESSAGING_EMAIL_ENABLED</code> to{" "}
            <code className="rounded bg-sky-100/90 px-1">true</code> in Vercel (or unset both so the default applies), then redeploy.
          </div>
        )}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
          <ThreadList
            threadSearch={threadSearch}
            onThreadSearchChange={setThreadSearch}
            dmTarget={dmTarget}
            onDmTargetChange={setDmTarget}
            channelTitle={channelTitle}
            onChannelTitleChange={setChannelTitle}
            loading={loading}
            serverMessagingOn={serverMessagingOn}
            busy={busy}
            filteredThreads={filteredThreads}
            threads={threads}
            selectedThreadId={selectedThreadId}
            staffForDm={staffForDm}
            onCreateDm={createDm}
            onCreateChannel={createChannel}
            onOpenThread={openThread}
            showThreadList={showThreadList}
          />

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

            <div
              ref={messagesScrollRef}
              className="min-h-0 flex-1 overflow-y-auto space-y-3 px-3 py-3"
              onScroll={(e) => {
                const el = e.currentTarget;
                shouldStickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
              }}
            >
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
                  const isDeleting = deletingId === m.id;
                  const attachmentUrls = m.metadata?.image_urls?.filter(Boolean) ?? [];
                  const showText = (m.body || "").trim().length > 0;
                  const formattedLines = showText ? parseMessageBodyRuns(m.body) : [];
                  return (
                    <div key={m.id} className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "relative max-w-[min(100%,28rem)] rounded-2xl px-3 py-2 shadow-sm",
                          isOwn ? "bg-purple-600 text-white" : "border border-gray-200 bg-gray-50 text-gray-900"
                        )}
                      >
                        <div className={cn("flex items-start justify-between gap-2", isOwn ? "text-purple-100" : "text-gray-500")}>
                          <p className="text-[11px] mb-1">
                            {m.sender_role} · {formatMessageDetailTime(m.created_at)}
                          </p>
                          {isOwn && serverMessagingOn && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 shrink-0 p-0 text-white opacity-80 hover:bg-white/15 hover:opacity-100"
                              disabled={isDeleting}
                              onClick={() => deleteMessage(m.id)}
                              aria-label="Delete message"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              )}
                            </Button>
                          )}
                        </div>
                        <MessageAttachments urls={attachmentUrls} isOwn={isOwn} showText={showText} />
                        {showText && (
                          <p className={cn("text-sm whitespace-pre-wrap break-words pr-1", isOwn ? "text-white" : "text-gray-900")}>
                            {formattedLines.map((line, lineIdx) => (
                              <span key={`${m.id}-line-${lineIdx}`}>
                                {line.map((run, runIdx) => (
                                  <span
                                    key={`${m.id}-line-${lineIdx}-run-${runIdx}`}
                                    className={cn(run.bold && "font-semibold", run.italic && "italic")}
                                  >
                                    {run.text}
                                  </span>
                                ))}
                                {lineIdx < formattedLines.length - 1 ? "\n" : ""}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <MessageComposer
              serverMessagingOn={serverMessagingOn}
              selectedThreadId={selectedThreadId}
              composer={composer}
              onComposerChange={setComposer}
              pendingAttachments={pendingAttachments}
              uploadingAttachments={uploadingAttachments}
              busy={busy}
              error={error}
              onErrorChange={setError}
              onSend={sendMessage}
              onRemoveAttachment={removePendingAttachment}
              onAttachmentFilesSelected={onAttachmentFilesSelected}
              applyComposerFormat={applyComposerFormat}
              attachmentInputRef={attachmentInputRef}
              composerRef={composerRef}
            />
          </div>
        </div>
      </AdminPageBody>
    </>
  );
}
