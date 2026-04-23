"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bold, ChevronLeft, FileText, Hash, Italic, Loader2, MessageSquare, Paperclip, Plus, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { MessagingPushRegistration } from "@/components/messaging/push-registration";
import { ToastContainer, ToastNotification } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { isImageAttachmentUrl, parseMessageBodyRuns } from "@/lib/messaging/service";
import {
  STAFF_ATTACHMENT_ACCEPT_ATTR,
  STAFF_ATTACHMENT_ALLOWED_MIMES,
  STAFF_ATTACHMENT_MAX_BYTES,
} from "@/lib/messaging/staff-attachment-allowlist";

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
    preview?: string;
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
  metadata?: { image_urls?: string[] } | null;
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

const MAX_MESSAGE_ATTACHMENTS = 6;
const MAX_MESSAGE_BODY_CHARS = 4000;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyMarkdownMarkers(text: string, bold: boolean, italic: boolean): string {
  if (!text) return "";
  if (bold && italic) return `***${text}***`;
  if (bold) return `**${text}**`;
  if (italic) return `*${text}*`;
  return text;
}

function editorHtmlToMarkdown(html: string): string {
  if (!html) return "";
  const root = document.createElement("div");
  root.innerHTML = html;

  const walk = (node: Node, fmt: { bold: boolean; italic: boolean }): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      return applyMarkdownMarkers(text, fmt.bold, fmt.italic);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") return "\n";

    const nextFmt = {
      bold: fmt.bold || tag === "b" || tag === "strong",
      italic: fmt.italic || tag === "i" || tag === "em",
    };

    let out = "";
    el.childNodes.forEach((child) => {
      out += walk(child, nextFmt);
    });
    if (tag === "div" || tag === "p") out += "\n";
    return out;
  };

  let markdown = "";
  root.childNodes.forEach((n) => {
    markdown += walk(n, { bold: false, italic: false });
  });

  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}

function markdownToEditorHtml(markdown: string): string {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  const rendered = lines.map((line) => {
    const escaped = escapeHtml(line);
    return escaped
      .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  });
  return rendered.join("<br>");
}

function fileLabelFromUrl(url: string): string {
  try {
    const seg = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return seg || "File";
  } catch {
    return "File";
  }
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverMessagingOn, setServerMessagingOn] = useState(true);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<InboundToast[]>([]);
  const [isNarrow, setIsNarrow] = useState(false);
  const [mobileTab, setMobileTab] = useState<"list" | "chat">("list");
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ url: string; name: string }>>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [notificationChannels, setNotificationChannels] = useState<{ email: boolean; push: boolean } | null>(null);

  const selectedThreadIdRef = useRef<string | null>(null);
  const threadLastMessageBaselineRef = useRef<Map<string, string | null> | null>(null);
  const toastShownMessageIdsRef = useRef<Set<string>>(new Set());
  const lastToastAtRef = useRef(0);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
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
      if (!trimmed) {
        window.localStorage.removeItem(draftStorageKey);
      } else {
        window.localStorage.setItem(draftStorageKey, composer);
      }
    } catch {
      // Ignore storage errors
    }
  }, [composer, draftStorageKey]);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const html = markdownToEditorHtml(composer);
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }, [composer, selectedThreadId]);

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
        const preview =
          (t.last_message.preview ?? t.last_message.body)?.slice(0, 120) || "";
        setToasts((prev) => [...prev, { key: mid, type: "info", title, message: preview || undefined }]);
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
    if (json.channels && typeof json.channels.email === "boolean" && typeof json.channels.push === "boolean") {
      setNotificationChannels({ email: json.channels.email, push: json.channels.push });
    }
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
        if (
          threadsJson.channels &&
          typeof threadsJson.channels.email === "boolean" &&
          typeof threadsJson.channels.push === "boolean"
        ) {
          setNotificationChannels({ email: threadsJson.channels.email, push: threadsJson.channels.push });
        }
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
      const preview = (t.last_message?.preview ?? t.last_message?.body ?? "").toLowerCase();
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

  const uploadAttachment = useCallback(
    async (file: File, threadId: string): Promise<{ url: string; name: string }> => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminFetch(`/api/admin/messages/threads/${threadId}/attachments`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Upload failed");
      const url = json.url as string;
      const name = typeof json.filename === "string" && json.filename.trim() ? json.filename.trim() : fileLabelFromUrl(url);
      return { url, name };
    },
    []
  );

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
        setError(
          "Unsupported file type. Use images, PDF, TXT, CSV, or Word/Excel/PowerPoint files (see upload restrictions)."
        );
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
      for (const file of list) {
        const item = await uploadAttachment(file, selectedThreadId);
        added.push(item);
      }
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
      setComposer("");
      setPendingAttachments([]);
      if (draftStorageKey && typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }
      await fetchMessages(selectedThreadId);
      await fetchThreads();
      setError(null);
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
      const res = await adminFetch(`/api/admin/messages/threads/${selectedThreadId}/messages/${messageId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to delete message");
      await fetchMessages(selectedThreadId);
      await fetchThreads();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  };

  const showThreadList = !isNarrow || mobileTab === "list";
  const showConversation = !isNarrow || mobileTab === "chat";
  const composerChars = composer.length;

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
                        {t.last_message && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {t.last_message.preview ?? t.last_message.body}
                          </p>
                        )}
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
                        {attachmentUrls.length > 0 && (
                          <div className={cn("gap-2", showText ? "mb-2" : "")}>
                            {attachmentUrls.every(isImageAttachmentUrl) && attachmentUrls.length > 1 ? (
                              <div className="grid grid-cols-2 gap-2">
                                {attachmentUrls.map((src) => (
                                  <a
                                    key={src}
                                    href={src}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block aspect-square overflow-hidden rounded-lg ring-1 ring-black/10"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt="" className="h-full w-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {attachmentUrls.map((src) => {
                                  const label = fileLabelFromUrl(src);
                                  if (isImageAttachmentUrl(src)) {
                                    return (
                                      <a
                                        key={src}
                                        href={src}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block overflow-hidden rounded-lg ring-1 ring-black/10"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={src}
                                          alt=""
                                          className="max-h-64 w-full max-w-full object-contain"
                                        />
                                      </a>
                                    );
                                  }
                                  return (
                                    <a
                                      key={src}
                                      href={src}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                        isOwn
                                          ? "border-white/30 bg-white/10 text-white hover:bg-white/15"
                                          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                                      )}
                                    >
                                      <FileText className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                                      <span className="min-w-0 truncate">{label}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
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

            <div
              className={cn(
                "mt-auto flex shrink-0 flex-col gap-2 border-t border-gray-200 p-3",
                "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px)+12px)] lg:pb-3"
              )}
            >
              <input
                ref={attachmentInputRef}
                type="file"
                accept={STAFF_ATTACHMENT_ACCEPT_ATTR}
                multiple
                className="hidden"
                aria-hidden
                onChange={onAttachmentFilesSelected}
              />
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingAttachments.map((p) => (
                    <div
                      key={p.url}
                      className={cn(
                        "relative flex shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100",
                        isImageAttachmentUrl(p.url) ? "h-16 w-16" : "h-16 max-w-[200px] min-w-[120px] items-center px-2"
                      )}
                    >
                      {isImageAttachmentUrl(p.url) ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="" className="h-full w-full object-cover" />
                        </>
                      ) : (
                        <div className="flex w-full items-center gap-1.5 px-1">
                          <FileText className="h-4 w-4 shrink-0 text-gray-600" aria-hidden />
                          <span className="truncate text-xs text-gray-800" title={p.name}>
                            {p.name}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                        onClick={() => removePendingAttachment(p.url)}
                        disabled={busy || uploadingAttachments}
                        aria-label="Remove attachment"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                <span>
                  Formatting shortcuts: <code className="rounded bg-gray-100 px-1">Ctrl/Cmd + B</code>,{" "}
                  <code className="rounded bg-gray-100 px-1">Ctrl/Cmd + I</code>
                </span>
                <div className="flex items-center gap-2">
                  {composer.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setComposer("")}
                      className="rounded px-1.5 py-0.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    >
                      Clear draft
                    </button>
                  )}
                  <span className={cn(composerChars > MAX_MESSAGE_BODY_CHARS * 0.9 && "text-amber-600")}>
                    {composerChars}/{MAX_MESSAGE_BODY_CHARS}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex shrink-0 flex-col gap-1 self-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    disabled={!serverMessagingOn || busy || !selectedThreadId}
                    onClick={() => applyComposerFormat("bold")}
                    aria-label="Bold selected text"
                    title="Bold (Ctrl/Cmd+B)"
                  >
                    <Bold className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    disabled={!serverMessagingOn || busy || !selectedThreadId}
                    onClick={() => applyComposerFormat("italic")}
                    aria-label="Italicize selected text"
                    title="Italic (Ctrl/Cmd+I)"
                  >
                    <Italic className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <div className="relative w-full flex-1">
                  {composerChars === 0 && (
                    <div className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
                      Type a message...
                    </div>
                  )}
                  <div
                    ref={composerRef}
                    contentEditable={serverMessagingOn && !!selectedThreadId}
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    aria-label="Type a message"
                    className={cn(
                      "min-h-[44px] max-h-[160px] w-full flex-1 overflow-y-auto rounded-md border border-input bg-background px-3 py-2 text-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      (!serverMessagingOn || !selectedThreadId) && "cursor-not-allowed bg-gray-100 text-gray-500"
                    )}
                    onInput={(e) => {
                      const html = (e.currentTarget as HTMLDivElement).innerHTML;
                      const markdown = editorHtmlToMarkdown(html);
                      if (markdown.length > MAX_MESSAGE_BODY_CHARS) {
                        setError(`Message text is too long (${markdown.length}/${MAX_MESSAGE_BODY_CHARS}).`);
                        return;
                      }
                      setComposer(markdown);
                    }}
                    onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
                      e.preventDefault();
                      applyComposerFormat("bold");
                      return;
                    }
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                      e.preventDefault();
                      applyComposerFormat("italic");
                      return;
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const hasContent = composer.trim().length > 0 || pendingAttachments.length > 0;
                      if (hasContent && !busy && !uploadingAttachments && selectedThreadId && serverMessagingOn) {
                        sendMessage();
                      }
                    }
                  }}
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-1 self-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    disabled={
                      !serverMessagingOn ||
                      busy ||
                      uploadingAttachments ||
                      !selectedThreadId ||
                      pendingAttachments.length >= MAX_MESSAGE_ATTACHMENTS
                    }
                    onClick={() => attachmentInputRef.current?.click()}
                    aria-label="Attach files"
                    title="Attach images, PDF, or Office files (max 10MB each)"
                  >
                    {uploadingAttachments ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Paperclip className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="h-10 w-10"
                    onClick={sendMessage}
                    disabled={
                      !serverMessagingOn ||
                      busy ||
                      uploadingAttachments ||
                      !selectedThreadId ||
                      (!composer.trim() && pendingAttachments.length === 0)
                    }
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
