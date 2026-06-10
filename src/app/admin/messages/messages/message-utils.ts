import DOMPurify from "isomorphic-dompurify";
import { escapeHtml } from "@/lib/utils/validation";

export function sanitizeEditorHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "br", "div", "p"],
    ALLOWED_ATTR: [],
  });
}

function applyMarkdownMarkers(text: string, bold: boolean, italic: boolean): string {
  if (!text) return "";
  if (bold && italic) return `***${text}***`;
  if (bold) return `**${text}**`;
  if (italic) return `*${text}*`;
  return text;
}

export function editorHtmlToMarkdown(html: string): string {
  if (!html) return "";
  const root = document.createElement("div");
  root.innerHTML = sanitizeEditorHtml(html);

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

export function markdownToEditorHtml(markdown: string): string {
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

export function placeCaretAtEnd(el: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function fileLabelFromUrl(url: string): string {
  try {
    const seg = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return seg || "File";
  } catch {
    return "File";
  }
}

export function formatShortTime(iso: string): string {
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

export function formatMessageDetailTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
