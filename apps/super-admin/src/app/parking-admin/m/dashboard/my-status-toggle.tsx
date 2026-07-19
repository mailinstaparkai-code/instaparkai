"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "in", label: "In" },
  { value: "break", label: "Break" },
  { value: "out", label: "Out" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  in: "Clocked in",
  break: "On break",
  out: "Clocked out",
  leave: "On leave",
};

export function MyStatusToggle({
  status,
  action,
}: {
  status: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(value: string) {
    if (value === current || pending) return;
    setPending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("status", value);
      await action(formData);
      setCurrent(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update status.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">My status</p>
        <p className="text-xs text-muted-foreground">
          You are currently {current ? STATUS_LABEL[current] ?? current : "not marked"}
        </p>
      </div>
      <div className="flex gap-2 rounded-full bg-muted p-1">
        {OPTIONS.map((opt) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={pending || current === "leave"}
              onClick={() => handlePick(opt.value)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300",
                active
                  ? "bg-status-success text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                (pending || current === "leave") && "opacity-60"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {current === "leave" && (
        <p className="text-xs text-muted-foreground">
          You&apos;re marked on leave today — ask your Parking Admin to change it.
        </p>
      )}
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
