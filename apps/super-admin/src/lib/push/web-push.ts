import "server-only";
import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT are not set");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Best-effort, never throws -- caller (dispatch.ts) decides whether a dead
// subscription (410 Gone / 404 Not Found) should be removed from valet_push_tokens.
export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<{ ok: true } | { ok: false; deadToken: boolean }> {
  try {
    ensureConfigured();
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    const deadToken = statusCode === 404 || statusCode === 410;
    return { ok: false, deadToken };
  }
}
