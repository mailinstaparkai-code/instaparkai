"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "../../components/field";

export function MarkParkedButton({
  ticketId,
  slots,
  action,
}: {
  ticketId: string;
  slots: { id: string; label: string }[];
  action: (formData: FormData) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await action(new FormData(event.currentTarget));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" disabled={!slots.length}>
            Mark as parked
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as parked</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={ticketId} />
          {slots.length ? (
            <Field label="Slot">
              <select
                name="slot_id"
                required
                defaultValue={slots[0]?.id}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">No available slots.</p>
          )}
          {error && <p className="text-sm text-status-danger">{error}</p>}
          <Button type="submit" disabled={pending || !slots.length}>
            {pending ? "Saving…" : "Confirm parked"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
