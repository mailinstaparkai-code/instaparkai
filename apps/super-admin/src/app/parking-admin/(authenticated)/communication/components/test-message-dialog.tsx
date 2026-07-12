"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "../../../components/field";
import type { Channel, TriggerKey } from "@/lib/communication-triggers";
import { sendTestMessage } from "../actions";

export function TestMessageDialog({
  triggerKey,
  channel,
  disabled,
}: {
  triggerKey: TriggerKey;
  channel: Channel;
  disabled: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const res = await sendTestMessage(new FormData(event.currentTarget));
      setResult(res.ok ? { ok: true } : { ok: false, error: res.error });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog onOpenChange={() => setResult(null)}>
      <DialogTrigger
        render={
          <Button size="sm" disabled={disabled}>
            Test
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send test message</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="trigger_key" value={triggerKey} />
          <input type="hidden" name="channel" value={channel} />
          <Field label={channel === "email" ? "Test email address" : "Test phone number"}>
            <Input
              name="recipient"
              required
              placeholder={channel === "email" ? "you@example.com" : "9876543210"}
            />
          </Field>
          {result && (
            <p className={`text-sm ${result.ok ? "text-status-success" : "text-status-danger"}`}>
              {result.ok ? "Test message sent." : result.error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send test"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
