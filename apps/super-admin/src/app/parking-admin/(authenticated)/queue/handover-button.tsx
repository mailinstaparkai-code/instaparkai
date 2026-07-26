"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogIconHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "../../components/field";
import { PhotoInput } from "../../components/photo-input";
import { DialogPrimaryButton, DialogSecondaryButton } from "../../components/dialog-buttons";

export function HandoverButton({
  ticketId,
  suggestedFare,
  action,
}: {
  ticketId: string;
  suggestedFare: number | null;
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
        render={<Button size="sm" className="bg-brand-orange hover:bg-brand-orange-strong">Complete handover</Button>}
      />
      <DialogContent>
        <DialogIconHeader
          icon={<KeyRound className="size-5" />}
          title="Complete Handover"
          subtitle="Confirm OTP and collect payment to release the vehicle"
          accentClassName="bg-status-success/20 text-status-success"
        />
        <p className="text-sm text-muted-foreground">
          Ask the guest for the OTP sent to their phone and enter it below to confirm the handover.
        </p>
        <form id="handover-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={ticketId} />
          <Field label="Enter OTP to confirm">
            <Input name="otp" required maxLength={4} placeholder="0000" />
          </Field>
          <Field label="Fare amount (₹)">
            <Input
              name="fare_amount"
              type="number"
              step="0.01"
              defaultValue={suggestedFare ?? undefined}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="payment_collected" />
            Payment collected (GPay screenshot confirmed)
          </label>
          <div className="w-1/2 sm:w-1/3">
            <PhotoInput name="photo_handover" label="Handover photo (optional)" />
          </div>
          {error && <p className="text-sm text-status-danger">{error}</p>}
        </form>
        <DialogFooter>
          <DialogSecondaryButton onClick={() => setOpen(false)}>Cancel</DialogSecondaryButton>
          <DialogPrimaryButton type="submit" form="handover-form" disabled={pending}>
            {pending ? "Completing…" : "Complete handover"}
          </DialogPrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
