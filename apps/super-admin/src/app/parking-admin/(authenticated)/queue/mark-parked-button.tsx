"use client";

import { useState, type FormEvent } from "react";
import { ParkingSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogIconHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "../../components/field";
import { DialogPrimaryButton, DialogSecondaryButton } from "../../components/dialog-buttons";

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
        <DialogIconHeader
          icon={<ParkingSquare className="size-5" />}
          title="Mark as Parked"
          subtitle="Choose the slot this vehicle is parked in"
          accentClassName="bg-brand-blue/20 text-brand-blue"
        />
        <form id="mark-parked-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
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
        </form>
        <DialogFooter>
          <DialogSecondaryButton onClick={() => setOpen(false)}>Cancel</DialogSecondaryButton>
          <DialogPrimaryButton type="submit" form="mark-parked-form" disabled={pending || !slots.length}>
            {pending ? "Saving…" : "Confirm parked"}
          </DialogPrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
