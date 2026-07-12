"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function SettingsForm({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<void> | void;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    try {
      await action(new FormData(event.currentTarget));
      setSaved(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {children}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {saved && <span className="text-sm text-status-success">Saved</span>}
      </div>
    </form>
  );
}
