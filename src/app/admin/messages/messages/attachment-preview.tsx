"use client";

import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { isImageAttachmentUrl } from "@/lib/messaging/service";
import { fileLabelFromUrl } from "./message-utils";

export interface PendingAttachment {
  url: string;
  name: string;
}

export function PendingAttachmentsPreview({
  attachments,
  busy,
  uploading,
  onRemove,
}: {
  attachments: PendingAttachment[];
  busy: boolean;
  uploading: boolean;
  onRemove: (url: string) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((p) => (
        <div
          key={p.url}
          className={cn(
            "relative flex shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100",
            isImageAttachmentUrl(p.url) ? "h-16 w-16" : "h-16 max-w-[200px] min-w-[120px] items-center px-2"
          )}
        >
          {isImageAttachmentUrl(p.url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.url} alt="" className="h-full w-full object-cover" />
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
            onClick={() => onRemove(p.url)}
            disabled={busy || uploading}
            aria-label="Remove attachment"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

export function MessageAttachments({
  urls,
  isOwn,
  showText,
}: {
  urls: string[];
  isOwn: boolean;
  showText: boolean;
}) {
  if (urls.length === 0) return null;
  return (
    <div className={cn("gap-2", showText ? "mb-2" : "")}>
      {urls.every(isImageAttachmentUrl) && urls.length > 1 ? (
        <div className="grid grid-cols-2 gap-2">
          {urls.map((src) => (
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
          {urls.map((src) => {
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
                  <img src={src} alt="" className="max-h-64 w-full max-w-full object-contain" />
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
  );
}
