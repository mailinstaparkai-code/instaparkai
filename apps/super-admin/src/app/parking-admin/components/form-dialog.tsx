"use client";

import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogIconHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogPrimaryButton, DialogSecondaryButton } from "./dialog-buttons";

export function FormDialog({
  trigger,
  title,
  subtitle,
  icon,
  accentClassName,
  action,
  children,
  submitLabel = "Save",
}: {
  trigger: ReactElement;
  title: string;
  subtitle?: string;
  // A pre-rendered icon element (e.g. `<Car className="size-5" />`) -- FormDialog is
  // called from Server Components (queue/page.tsx), so a bare component reference
  // can't cross that boundary as a prop. See DialogIconHeader.
  icon?: ReactNode;
  accentClassName?: string;
  action: (formData: FormData) => Promise<void> | void;
  children: ReactNode;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await action(new FormData(event.currentTarget));
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        {icon ? (
          <DialogIconHeader icon={icon} title={title} subtitle={subtitle} accentClassName={accentClassName} />
        ) : (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <form id="form-dialog-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
          {children}
        </form>
        <DialogFooter>
          <DialogSecondaryButton onClick={() => setOpen(false)}>Cancel</DialogSecondaryButton>
          <DialogPrimaryButton type="submit" form="form-dialog-form" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </DialogPrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
