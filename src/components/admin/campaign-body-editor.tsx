"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, List, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface CampaignBodyEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function CampaignBodyEditor({
  value,
  onChange,
  placeholder = "Write your email message…",
  className,
}: CampaignBodyEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastExternalValue = useRef(value);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== lastExternalValue.current && el.innerHTML !== value) {
      el.innerHTML = value;
      lastExternalValue.current = value;
    }
  }, [value]);

  const syncHtml = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    lastExternalValue.current = el.innerHTML;
    onChange(el.innerHTML);
  }, [onChange]);

  const handleFormat = (command: string) => {
    editorRef.current?.focus();
    exec(command);
    syncHtml();
  };

  const handleLink = () => {
    const url = window.prompt("Enter URL (https://…)");
    if (!url?.trim()) return;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      window.alert("Please use a URL starting with http:// or https://");
      return;
    }
    editorRef.current?.focus();
    exec("createLink", trimmed);
    syncHtml();
  };

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 p-2 dark:border-gray-700">
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFormat("bold")} aria-label="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFormat("italic")} aria-label="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFormat("insertUnorderedList")} aria-label="Bullet list">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleLink} aria-label="Insert link">
          <Link2 className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        data-placeholder={placeholder}
        className={cn(
          "min-h-[200px] max-h-[360px] overflow-y-auto px-4 py-3 text-sm text-gray-800 outline-none dark:text-gray-100",
          "empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]",
        )}
        onInput={syncHtml}
        onBlur={syncHtml}
      />
    </div>
  );
}
