"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, Plus, Users, FileText, ArrowUpLeft } from "lucide-react";
import { searchVehiclesAction, type CommandSearchResult } from "./command-search-actions";

const RECENTS_KEY = "pa_command_recents";
const MAX_RECENTS = 6;

type RecentEntry = { query: string; meta: string };

function readRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

function writeRecents(entries: RecentEntry[]) {
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(entries));
}

const STATUS_STYLE: Record<string, string> = {
  checked_in: "bg-brand-blue/15 text-brand-blue-deep",
  parked: "bg-brand-blue/15 text-brand-blue-deep",
  requested: "bg-[var(--warn)]/15 text-[var(--warn)]",
  in_transit: "bg-brand-orange/15 text-brand-orange",
  arrived: "bg-[var(--ok)]/15 text-[var(--ok-text)]",
  completed: "bg-[var(--ok)]/15 text-[var(--ok-text)]",
  voided: "bg-status-danger/15 text-status-danger",
};

/**
 * HANDOFF 28-Jul §10, screen 6c "⌘K search — recents & quick actions". New feature
 * (confirmed with product owner): live results reuse the same query the Vehicles
 * page's `q` filter already runs; recent searches persist in localStorage (client-
 * local, no new table); quick actions link to existing pages -- no new functionality
 * beyond the search/recents/shortcuts affordance itself.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandSearchResult[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPalette = useCallback(() => {
    setRecents(readRecents());
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      } else if (event.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, openPalette]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    let cancelled = false;
    searchVehiclesAction(trimmed).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  function commitSearch(plate: string, meta: string) {
    const next = [{ query: plate, meta }, ...recents.filter((r) => r.query !== plate)].slice(0, MAX_RECENTS);
    writeRecents(next);
    setOpen(false);
    router.push(`/parking-admin/vehicles?q=${encodeURIComponent(plate)}`);
  }

  function clearRecents() {
    writeRecents([]);
    setRecents([]);
  }

  return (
    <>
      <button
        onClick={openPalette}
        className="flex flex-1 items-center gap-2 rounded-full border border-input bg-muted/50 px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1">Search plates, guests, operators…</span>
        <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-xs sm:inline">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex justify-center bg-[rgba(15,23,42,0.36)] pt-[8vh] backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <div
            className="h-fit w-[640px] max-w-[92vw] overflow-hidden rounded-[22px] bg-popover shadow-[0_40px_100px_rgba(15,23,42,0.30)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <Search className="size-4 shrink-0 text-brand-blue" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plate, guest or slot…"
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground">ESC</kbd>
            </div>

            {results.length > 0 && (
              <div className="px-2 pb-2 pt-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Results</p>
                {results.map((r) => (
                  <button
                    key={r.plate}
                    onClick={() => commitSearch(r.plate, r.meta)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{r.plate}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.meta}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[r.status] ?? "bg-muted text-muted-foreground"}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between px-5 pb-1 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent searches</p>
              {recents.length > 0 && (
                <button onClick={clearRecents} className="text-xs font-medium text-brand-blue">
                  Clear
                </button>
              )}
            </div>
            <div className="px-2 pb-2">
              {recents.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No recent searches yet.</p>
              ) : (
                recents.map((r) => (
                  <button
                    key={r.query}
                    onClick={() => setQuery(r.query)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Clock className="size-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.query}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.meta}</p>
                    </div>
                    <ArrowUpLeft className="size-4 text-muted-foreground/50" />
                  </button>
                ))
              )}
            </div>

            <p className="px-5 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</p>
            <div className="flex gap-2.5 px-5 pb-5">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/parking-admin/queue");
                }}
                className="flex flex-1 items-center gap-2 rounded-2xl bg-[var(--tint-orange)] px-3.5 py-3 text-sm font-semibold text-brand-orange"
              >
                <Plus className="size-4" /> Check-in vehicle
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/parking-admin/operators");
                }}
                className="flex flex-1 items-center gap-2 rounded-2xl bg-blue-tint px-3.5 py-3 text-sm font-semibold text-brand-blue-deep"
              >
                <Users className="size-4" /> Dispatch operator
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/parking-admin/reports");
                }}
                className="flex flex-1 items-center gap-2 rounded-2xl bg-[var(--tint-green)] px-3.5 py-3 text-sm font-semibold text-[var(--ok-text)]"
              >
                <FileText className="size-4" /> Today's report
              </button>
            </div>

            <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-5 py-2.5 text-[11px] text-muted-foreground">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>⌘K close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
