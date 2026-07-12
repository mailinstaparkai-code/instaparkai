"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

export function DeleteButton({
  title,
  action,
  hiddenFields,
  consequences = [],
  label = "Delete",
}: {
  title: string;
  action: (formData: FormData) => void;
  hiddenFields: Record<string, string>;
  consequences?: string[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        {label}
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        consequences={consequences}
        action={action}
        hiddenFields={hiddenFields}
      />
    </>
  );
}
