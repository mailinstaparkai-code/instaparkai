"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Car,
  Check,
  Clock,
  KeyRound,
  MapPin,
  Send,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  getRecentNotifications,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/app/parking-admin/(authenticated)/actions";
import { formatISTTime } from "@/lib/format-date";

const POLL_MS = 20000;

const KIND_LABEL: Record<string, string> = {
  vehicle_checked_in: "Checked in",
  vehicle_parked: "Parked",
  vehicle_requested: "Pickup requested",
  vehicle_dispatched: "Dispatched",
  vehicle_arrived: "Arrived",
  handover_complete: "Handover complete",
  vehicle_voided: "Voided",
};

const KIND_ICON: Record<string, { icon: LucideIcon; className: string }> = {
  vehicle_checked_in: { icon: Check, className: "bg-status-success/15 text-status-success" },
  vehicle_parked: { icon: Car, className: "bg-brand-blue/15 text-brand-blue" },
  vehicle_requested: { icon: Clock, className: "bg-status-warning/15 text-status-warning" },
  vehicle_dispatched: { icon: Send, className: "bg-brand-blue/15 text-brand-blue" },
  vehicle_arrived: { icon: MapPin, className: "bg-status-success/15 text-status-success" },
  handover_complete: { icon: KeyRound, className: "bg-status-success/15 text-status-success" },
  vehicle_voided: { icon: XCircle, className: "bg-status-danger/15 text-status-danger" },
};
const DEFAULT_KIND_ICON = { icon: Bell, className: "bg-muted text-muted-foreground" };

// Foreground-only haptic feedback: vibrates when a poll tick finds MORE unread
// notifications than the previous tick. Android Chrome only (no-op elsewhere, e.g.
// iOS Safari) and requires no permission prompt, unlike the Notification API. Doesn't
// fire on the very first load (only on genuine increments while the page stays open).
function vibrateIfSupported() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(200);
  }
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const lastUnreadCount = useRef<number | null>(null);

  async function refresh() {
    setNotifications(await getRecentNotifications());
  }

  useEffect(() => {
    let cancelled = false;

    function applyData(data: NotificationRow[]) {
      if (cancelled) return;
      const unread = data.filter((n) => !n.read_at).length;
      if (lastUnreadCount.current !== null && unread > lastUnreadCount.current) {
        vibrateIfSupported();
      }
      lastUnreadCount.current = unread;
      setNotifications(data);
    }

    getRecentNotifications().then(applyData);
    const interval = setInterval(() => {
      getRecentNotifications().then(applyData);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await markAllNotificationsRead();
      refresh();
    }
  }

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        className="relative rounded-lg p-2 hover:bg-muted"
        onClick={handleToggle}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand-orange text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            <p className="border-b border-border px-3 py-2.5 text-sm font-semibold">
              Notifications
            </p>
            <div className="max-h-80 divide-y divide-border overflow-y-auto p-1">
              {notifications.map((n) => {
                const { icon: Icon, className } = KIND_ICON[n.kind] ?? DEFAULT_KIND_ICON;
                return (
                  <div key={n.id} className="flex items-start gap-3 px-2 py-2.5">
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4 ${className}`}
                    >
                      <Icon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.read_at ? "text-muted-foreground" : "font-medium"}`}>
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {KIND_LABEL[n.kind] ?? n.kind} · {formatISTTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {!notifications.length && (
                <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
                  <BellOff className="size-6 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
