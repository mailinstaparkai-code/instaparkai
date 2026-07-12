"use client";

import { useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  consequences,
  action,
  hiddenFields,
  actionLabel = "Delete",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  consequences: string[];
  action: (formData: FormData) => Promise<void> | void;
  hiddenFields: Record<string, string>;
  actionLabel?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await action(new FormData(event.currentTarget));
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionLabel} {title}?</AlertDialogTitle>
          <AlertDialogDescription>
            This can&apos;t be undone.
            {consequences.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {consequences.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit}>
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              disabled={pending}
              className="bg-status-danger text-white hover:bg-status-danger/90"
            >
              {pending ? "Working…" : actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
