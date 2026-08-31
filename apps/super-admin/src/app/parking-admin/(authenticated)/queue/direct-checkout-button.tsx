"use client";

import { useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export function DirectCheckoutButton({
  ticketId,
  vehicleNumber,
  suggestedFare,
  isPassVehicle,
  action,
}: {
  ticketId: string;
  vehicleNumber: string;
  suggestedFare: number | null;
  isPassVehicle: boolean;
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
        render={<Button size="sm" className="bg-brand-orange hover:bg-brand-orange-strong">Checkout</Button>}
      />
      <DialogContent>
        <DialogIconHeader
          icon={<Wallet className="size-5" />}
          title={`Checkout ${vehicleNumber}`}
          subtitle={
            isPassVehicle
              ? "This vehicle is whitelisted — no payment needed."
              : "Confirm the fare and attach a screenshot of the UPI payment."
          }
          accentClassName="bg-status-success/20 text-status-success"
        />
        <form id="direct-checkout-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={ticketId} />
          {isPassVehicle ? (
            <>
              <input type="hidden" name="fare_amount" value="0" />
              <input type="hidden" name="payment_collected" value="on" />
            </>
          ) : (
            <>
              <Field label="Fare amount (₹)">
                <Input
                  name="fare_amount"
                  type="number"
                  step="0.01"
                  defaultValue={suggestedFare ?? undefined}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="payment_collected" />
                Payment collected (UPI screenshot confirmed)
              </label>
              <div className="w-1/2 sm:w-1/3">
                <PhotoInput name="photo_handover" label="Payment screenshot (optional)" />
              </div>
            </>
          )}
          {error && <p className="text-sm text-status-danger">{error}</p>}
        </form>
        <DialogFooter>
          <DialogSecondaryButton onClick={() => setOpen(false)}>Cancel</DialogSecondaryButton>
          <DialogPrimaryButton type="submit" form="direct-checkout-form" disabled={pending}>
            {pending ? "Completing…" : "Complete checkout"}
          </DialogPrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
