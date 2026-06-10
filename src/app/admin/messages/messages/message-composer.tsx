"use client";

import { type ChangeEvent, type RefObject } from "react";
import { Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  STAFF_ATTACHMENT_ACCEPT_ATTR,
  STAFF_ATTACHMENT_ALLOWED_MIMES,
  STAFF_ATTACHMENT_MAX_BYTES,
} from "@/lib/messaging/staff-attachment-allowlist";
import { PendingAttachmentsPreview, type PendingAttachment } from "./attachment-preview";
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  placeCaretAtEnd,
  sanitizeEditorHtml,
} from "./message-utils";
import { MAX_MESSAGE_ATTACHMENTS, MAX_MESSAGE_BODY_CHARS } from "./types";

export interface MessageComposerProps {
  serverMessagingOn: boolean;
  selectedThreadId: string | null;
  composer: string;
  onComposerChange: (value: string) => void;
  pendingAttachments: PendingAttachment[];
  uploadingAttachments: boolean;
  busy: boolean;
  error: string | null;
  onErrorChange: (value: string | null) => void;
  onSend: () => void;
  onRemoveAttachment: (url: string) => void;
  onAttachmentFilesSelected: (e: ChangeEvent<HTMLInputElement>) => void;
  applyComposerFormat: (command: "bold" | "italic") => void;
  attachmentInputRef: RefObject<HTMLInputElement | null>;
  composerRef: RefObject<HTMLDivElement | null>;
}

export function MessageComposer({
  serverMessagingOn,
  selectedThreadId,
  composer,
  onComposerChange,
  pendingAttachments,
  uploadingAttachments,
  busy,
  error,
  onErrorChange,
  onSend,
  onRemoveAttachment,
  onAttachmentFilesSelected,
  applyComposerFormat,
  attachmentInputRef,
  composerRef,
}: MessageComposerProps) {
  const composerChars = composer.length;

  return (
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
      <PendingAttachmentsPreview
        attachments={pendingAttachments}
        busy={busy}
        uploading={uploadingAttachments}
        onRemove={onRemoveAttachment}
      />
      <div className="flex items-center justify-end gap-2 text-[11px] text-gray-500">
        <div className="flex items-center gap-2">
          {composer.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onComposerChange("")}
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
              const editor = e.currentTarget as HTMLDivElement;
              const html = sanitizeEditorHtml(editor.innerHTML);
              const markdownRaw = editorHtmlToMarkdown(html);
              const tooLong = markdownRaw.length > MAX_MESSAGE_BODY_CHARS;
              const markdown = tooLong ? markdownRaw.slice(0, MAX_MESSAGE_BODY_CHARS) : markdownRaw;

              if (tooLong) {
                onErrorChange(`Message text is too long (${markdownRaw.length}/${MAX_MESSAGE_BODY_CHARS}).`);
                const normalizedHtml = markdownToEditorHtml(markdown);
                if (editor.innerHTML !== normalizedHtml) {
                  editor.innerHTML = normalizedHtml;
                  placeCaretAtEnd(editor);
                }
              } else if (error && error.startsWith("Message text is too long")) {
                onErrorChange(null);
              }

              onComposerChange(markdown);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.nativeEvent as KeyboardEvent).isComposing) return;
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
                  onSend();
                }
                return;
              }
              if (e.key === "Escape" && error) {
                e.preventDefault();
                onErrorChange(null);
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
            onClick={onSend}
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
  );
}

export { STAFF_ATTACHMENT_ALLOWED_MIMES, STAFF_ATTACHMENT_MAX_BYTES, MAX_MESSAGE_ATTACHMENTS };
