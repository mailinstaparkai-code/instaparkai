"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { registerPushSubscription } from "./push-actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushSubscribeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (Notification.permission === "default") setVisible(true);
  }, []);

  async function enable() {
    setVisible(false);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    await registerPushSubscription({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
  }

  if (!visible) return null;

  return (
    <button
      onClick={enable}
      className="glass-card mx-4 mt-3 flex items-center gap-2 p-3 text-left text-sm text-brand-orange"
    >
      <Bell className="size-4 shrink-0" />
      Enable notifications for vehicle pickups
    </button>
  );
}
