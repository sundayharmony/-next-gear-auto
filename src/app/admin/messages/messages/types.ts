export interface ThreadRow {
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

export interface MessageRow {
  id: string;
  body: string;
  sender_user_id: string;
  sender_role: "admin" | "manager";
  created_at: string;
  metadata?: { image_urls?: string[] } | null;
}

export interface StaffRow {
  id: string;
  role: "admin" | "manager";
  name: string;
  email: string;
}

export type InboundToast = { key: string; type: "info"; title: string; message?: string };

export const TOAST_THROTTLE_MS = 4000;
export const MAX_TOAST_DEDUPE_IDS = 400;
export const MAX_MESSAGE_ATTACHMENTS = 6;
export const MAX_MESSAGE_BODY_CHARS = 4000;
