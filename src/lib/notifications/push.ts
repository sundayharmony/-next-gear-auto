import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Missing WEB_PUSH_VAPID_PUBLIC_KEY / WEB_PUSH_VAPID_PRIVATE_KEY / WEB_PUSH_SUBJECT");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface WebPushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: WebPushPayload
): Promise<void> {
  ensureConfigured();
  await webpush.sendNotification(
    subscription,
    JSON.stringify({
      ...payload,
      timestamp: Date.now(),
    })
  );
}
