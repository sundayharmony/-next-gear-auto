"use client";

import { Hash, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import type { StaffRow, ThreadRow } from "./types";
import { formatShortTime } from "./message-utils";

export interface ThreadListProps {
  threadSearch: string;
  onThreadSearchChange: (value: string) => void;
  dmTarget: string;
  onDmTargetChange: (value: string) => void;
  channelTitle: string;
  onChannelTitleChange: (value: string) => void;
  loading: boolean;
  serverMessagingOn: boolean;
  busy: boolean;
  filteredThreads: ThreadRow[];
  threads: ThreadRow[];
  selectedThreadId: string | null;
  staffForDm: StaffRow[];
  onCreateDm: () => void;
  onCreateChannel: () => void;
  onOpenThread: (threadId: string) => void;
  showThreadList: boolean;
}

export function ThreadList({
  threadSearch,
  onThreadSearchChange,
  dmTarget,
  onDmTargetChange,
  channelTitle,
  onChannelTitleChange,
  loading,
  serverMessagingOn,
  busy,
  filteredThreads,
  threads,
  selectedThreadId,
  staffForDm,
  onCreateDm,
  onCreateChannel,
  onOpenThread,
  showThreadList,
}: ThreadListProps) {
  return (
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
        onChange={(e) => onThreadSearchChange(e.target.value)}
        placeholder="Search threads..."
        disabled={!serverMessagingOn}
        className="text-sm"
        aria-label="Search threads"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <Select value={dmTarget} onChange={(e) => onDmTargetChange(e.target.value)} disabled={!serverMessagingOn} className="min-w-0 flex-1">
          <option value="">Start direct message...</option>
          {staffForDm.map((s) => (
            <option key={`${s.role}:${s.id}`} value={`${s.role}:${s.id}`}>
              {s.name} ({s.role})
            </option>
          ))}
        </Select>
        <Button size="sm" type="button" className="shrink-0" onClick={onCreateDm} disabled={!serverMessagingOn || busy || !dmTarget}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={channelTitle}
          onChange={(e) => onChannelTitleChange(e.target.value)}
          placeholder="Channel title"
          disabled={!serverMessagingOn}
          className="min-w-0 flex-1"
        />
        <Button
          size="sm"
          type="button"
          variant="outline"
          className="shrink-0 whitespace-nowrap"
          onClick={onCreateChannel}
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
            onClick={() => onOpenThread(t.id)}
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
  );
}
