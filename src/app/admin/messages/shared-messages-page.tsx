"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { MessagingPushRegistration } from "@/components/messaging/push-registration";

interface ThreadRow {
  id: string;
  thread_type: "dm" | "channel";
  title: string | null;
  unread_count: number;
  last_message: { body: string; created_at: string } | null;
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    const res = await adminFetch("/api/admin/messages/threads");
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || "Failed to load threads");
    setThreads(json.data || []);
  }, []);

  const fetchMessages = useCallback(async (threadId: string) => {
    const res = await adminFetch(`/api/admin/messages/threads/${threadId}/messages?limit=100`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || "Failed to load messages");
    setMessages(json.data || []);
    await adminFetch(`/api/admin/messages/threads/${threadId}/read`, { method: "POST" });
  }, []);

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
        setThreads(threadsJson.data || []);
        if (staffRes.ok && staffJson.success) setStaff(staffJson.data || []);
        setError(null);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    const timer = setInterval(() => { fetchThreads().catch(() => undefined); }, 15000);
    return () => { mounted = false; clearInterval(timer); };
  }, [fetchThreads]);

  useEffect(() => {
    const urlThread = searchParams.get("thread");
    if (urlThread) setSelectedThreadId(urlThread);
    else if (!selectedThreadId && threads[0]) setSelectedThreadId(threads[0].id);
  }, [searchParams, threads, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    fetchMessages(selectedThreadId).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [selectedThreadId, fetchMessages]);

  const selectedThread = useMemo(() => threads.find((t) => t.id === selectedThreadId) || null, [threads, selectedThreadId]);
  const unreadCount = useMemo(() => threads.reduce((sum, t) => sum + (t.unread_count || 0), 0), [threads]);

  const openThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    router.replace(`${panelPath}?thread=${threadId}`);
  };

  const createDm = async () => {
    if (!dmTarget) return;
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
    if (!channelTitle.trim()) return;
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
    if (!selectedThreadId || !composer.trim()) return;
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

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold">{panelTitle}</h1>
          <p className="mt-1 text-purple-200">Unread messages: {unreadCount}</p>
        </div>
      </section>

      <PageContainer className="py-5 sm:py-8 space-y-4">
        <MessagingPushRegistration />
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900"><MessageSquare className="h-4 w-4" /> Threads</div>
            <div className="flex gap-2">
              <Select value={dmTarget} onChange={(e) => setDmTarget(e.target.value)}>
                <option value="">Start direct message...</option>
                {staff.map((s) => <option key={`${s.role}:${s.id}`} value={`${s.role}:${s.id}`}>{s.name} ({s.role})</option>)}
              </Select>
              <Button size="sm" onClick={createDm} disabled={busy || !dmTarget}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex gap-2">
              <Input value={channelTitle} onChange={(e) => setChannelTitle(e.target.value)} placeholder="Channel title" />
              <Button size="sm" variant="outline" onClick={createChannel} disabled={busy || !channelTitle.trim()}>Create Channel</Button>
            </div>
            <div className="space-y-2">
              {loading && <p className="text-xs text-gray-500">Loading threads...</p>}
              {!loading && threads.length === 0 && <p className="text-xs text-gray-500">No threads yet.</p>}
              {threads.map((t) => (
                <button key={t.id} onClick={() => openThread(t.id)} className={`w-full rounded-md border px-3 py-2 text-left ${selectedThreadId === t.id ? "border-purple-300 bg-purple-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title || "Direct Message"}</p>
                    {t.unread_count > 0 && <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white">{t.unread_count}</span>}
                  </div>
                  {t.last_message && <p className="text-xs text-gray-500 truncate mt-1">{t.last_message.body}</p>}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col min-h-[420px]">
            <div className="border-b pb-2 mb-3">
              <p className="text-sm font-semibold text-gray-900">{selectedThread?.title || "Select a thread"}</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {!selectedThreadId && <p className="text-sm text-gray-500">Choose or create a thread to start messaging.</p>}
              {selectedThreadId && messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
              {messages.map((m) => (
                <div key={m.id} className="rounded-md bg-gray-50 px-3 py-2 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{m.sender_role} · {new Date(m.created_at).toLocaleString()}</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
              <Button onClick={sendMessage} disabled={busy || !selectedThreadId || !composer.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
