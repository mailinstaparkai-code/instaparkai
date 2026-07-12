"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import type { Slot } from "../types";

const statusStyles: Record<Slot["status"], string> = {
  available: "bg-status-success/15 text-status-success",
  occupied: "bg-status-danger/15 text-status-danger",
  reserved: "bg-status-warning/15 text-status-warning",
  out_of_service: "bg-muted text-muted-foreground",
};

export function SlotChip({
  slot,
  action,
  hiddenFields,
}: {
  slot: Slot;
  action: (formData: FormData) => void;
  hiddenFields: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span
        className={`flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-3 text-xs font-medium ${statusStyles[slot.status]}`}
      >
        {slot.slot_number}
        {slot.is_ev && <span title="EV slot">⚡</span>}
        {slot.is_disabled_slot && <span title="Accessible slot">♿</span>}
        <button
          aria-label={`Delete slot ${slot.slot_number}`}
          onClick={() => setOpen(true)}
          className="rounded-full p-0.5 hover:bg-black/10"
        >
          <X className="size-3" />
        </button>
      </span>

      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={`slot ${slot.slot_number}`}
        consequences={[]}
        action={action}
        hiddenFields={hiddenFields}
      />
    </>
  );
}
