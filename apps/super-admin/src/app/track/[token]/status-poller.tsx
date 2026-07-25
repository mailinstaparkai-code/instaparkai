"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getGuestTicketStatus } from "./actions";

const POLL_MS = 6000;

// Guest sessions aren't Supabase-authenticated, so there's no RLS-gated Realtime
// channel to subscribe to here -- this polls so status changes made by staff on the
// Live Queue show up without the guest having to manually reload.
//
// It polls a status-only server action rather than calling router.refresh() on a
// timer: a blind refresh re-ran the page's whole server component (full ticket +
// site-name query, fresh RSC payload) every 6s even though the status usually
// hasn't moved. Now the expensive refresh only fires when the status actually
// changes. Polling also pauses while the tab is hidden -- a guest leaves this page
// open on their phone for the whole parking session -- and re-checks immediately on
// return so nothing is missed.
export function StatusPoller({
  token,
  status,
  active,
}: {
  token: string;
  status: string;
  active: boolean;
}) {
  const router = useRouter();
  // Kept in a ref so the effect doesn't re-subscribe on every render; it only
  // needs the status the currently-rendered page was built from.
  const renderedStatus = useRef(status);
  renderedStatus.current = status;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const latest = await getGuestTicketStatus(token);
        if (!cancelled && latest && latest !== renderedStatus.current) {
          router.refresh();
        }
      } catch {
        // Transient network/server hiccup -- just try again on the next tick.
      }
    }

    function start() {
      timer ??= setInterval(check, POLL_MS);
    }

    function stop() {
      clearInterval(timer);
      timer = undefined;
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void check();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, token, router]);

  return null;
}
