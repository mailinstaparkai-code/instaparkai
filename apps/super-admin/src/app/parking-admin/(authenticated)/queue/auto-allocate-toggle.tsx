"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

export function AutoAllocateToggle({
  defaultChecked,
  action,
}: {
  defaultChecked: boolean;
  action: (formData: FormData) => Promise<void> | void;
}) {
  const [pending, setPending] = useState(false);

  async function handleChange(checked: boolean) {
    setPending(true);
    try {
      const formData = new FormData();
      if (checked) formData.set("auto_allocate_operator", "on");
      await action(formData);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass-card flex items-center justify-between gap-4 bg-gradient-to-br from-brand-blue/10 via-card to-card p-3">
      <div>
        <p className="text-sm font-medium">Auto-allocate operators</p>
        <p className="text-xs text-muted-foreground">
          Round-robin dispatch to the next available operator, no manual pick needed.
        </p>
      </div>
      <Switch
        key={String(defaultChecked)}
        defaultChecked={defaultChecked}
        disabled={pending}
        onCheckedChange={handleChange}
      />
    </div>
  );
}
