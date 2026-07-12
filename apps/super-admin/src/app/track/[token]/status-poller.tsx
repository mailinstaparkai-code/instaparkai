"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Guest sessions aren't Supabase-authenticated, so there's no RLS-gated Realtime
// channel to subscribe to here -- this just periodically re-fetches the server
// component so status changes made by staff on the Live Queue show up without the
// guest having to manually reload.
export function StatusPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(interval);
  }, [active, router]);

  return null;
}
