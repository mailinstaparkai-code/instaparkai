"use client";

import { useState, type FormEvent } from "react";
import { MoreVertical, Pencil, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogIconHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "../../components/field";
import { ConfirmDeleteDialog } from "../../components/confirm-delete-dialog";
import { DialogPrimaryButton, DialogSecondaryButton } from "../../components/dialog-buttons";

export function TicketActionsMenu({
  ticketId,
  vehicleNumber,
  mobileNumber,
  updateAction,
  voidAction,
}: {
  ticketId: string;
  vehicleNumber: string;
  mobileNumber: string;
  updateAction: (formData: FormData) => Promise<void> | void;
  voidAction: (formData: FormData) => Promise<void> | void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await updateAction(new FormData(event.currentTarget));
      setEditOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More actions"
          className="rounded-lg p-1.5 hover:bg-muted"
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setVoidOpen(true)}>
            <Ban className="size-4" />
            Void ticket
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogIconHeader
            icon={<Pencil className="size-5" />}
            title="Edit Vehicle Details"
            subtitle="Correct a mis-entered plate or mobile number"
          />
          <form id="edit-ticket-form" onSubmit={handleEditSubmit} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={ticketId} />
            <Field label="Vehicle number">
              <Input name="vehicle_number" required defaultValue={vehicleNumber} />
            </Field>
            <Field label="Mobile number">
              <Input name="mobile_number" required defaultValue={mobileNumber} />
            </Field>
          </form>
          <DialogFooter>
            <DialogSecondaryButton onClick={() => setEditOpen(false)}>Cancel</DialogSecondaryButton>
            <DialogPrimaryButton type="submit" form="edit-ticket-form" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </DialogPrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title={`ticket for ${vehicleNumber}`}
        consequences={["Frees the assigned slot, if one is parked.", "Removes this ticket from the Live Queue."]}
        action={voidAction}
        hiddenFields={{ id: ticketId }}
        actionLabel="Void"
      />
    </>
  );
}
