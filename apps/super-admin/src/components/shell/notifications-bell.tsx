"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  getRecentNotifications,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/app/parking-admin/(authenticated)/actions";

const POLL_MS = 20000;

const KIND_LABEL: Record<string, string> = {
  vehicle_checked_in: "Checked in",
  vehicle_requested: "Pickup requested",
  vehicle_dispatched: "Dispatched",
  vehicle_arrived: "Arrived",
  handover_complete: "Handover complete",
};

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  async function refresh() {
    setNotifications(await getRecentNotifications());
  }

  useEffect(() => {
    let cancelled = false;
    getRecentNotifications().then((data) => {
      if (!cancelled) setNotifications(data);
    });
    const interval = setInterval(() => {
      getRecentNotifications().then((data) => {
        if (!cancelled) setNotifications(data);
      });
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
          <div className="glass-card absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto p-2">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Notifications
            </p>
            {notifications.map((n) => (
              <div key={n.id} className="rounded-lg px-2 py-2 hover:bg-muted">
                <p className={`text-sm ${n.read_at ? "text-muted-foreground" : "font-medium"}`}>
                  {n.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {KIND_LABEL[n.kind] ?? n.kind} · {new Date(n.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
            {!notifications.length && (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
