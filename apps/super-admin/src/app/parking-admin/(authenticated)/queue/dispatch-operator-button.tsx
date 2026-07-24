"use client";

import { useState, type FormEvent } from "react";
import { Users } from "lucide-react";
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

export function DispatchOperatorButton({
  ticketId,
  operators,
  action,
  unavailableReason,
}: {
  ticketId: string;
  operators: { id: string; label: string }[];
  action: (formData: FormData) => Promise<void> | void;
  unavailableReason?: string | null;
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
          <Button size="sm" variant="outline">
            Dispatch operator
          </Button>
        }
      />
      <DialogContent>
        <DialogIconHeader
          icon={<Users className="size-5" />}
          title="Dispatch Operator"
          subtitle="Send this vehicle's pickup to an available operator"
          accentClassName="bg-brand-orange/20 text-brand-orange"
        />
        <form id="dispatch-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={ticketId} />
          {operators.length ? (
            <Field label="Available operators">
              <select
                name="operator_id"
                required
                defaultValue={operators[0]?.id}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">
              {unavailableReason ?? "No operators are currently available."}
            </p>
          )}
          {error && <p className="text-sm text-status-danger">{error}</p>}
        </form>
        <DialogFooter>
          <DialogSecondaryButton onClick={() => setOpen(false)}>Cancel</DialogSecondaryButton>
          <DialogPrimaryButton type="submit" form="dispatch-form" disabled={pending || !operators.length}>
            {pending ? "Dispatching…" : "Dispatch"}
          </DialogPrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
