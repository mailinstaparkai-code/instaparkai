"use client";

import { useState, type FormEvent } from "react";
import { MoreVertical, Pencil, CalendarOff, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "../../components/field";
import { ConfirmDeleteDialog } from "../../components/confirm-delete-dialog";
import { OperatorFormFields } from "./operator-form-fields";
import { DailyStatusSelect } from "./daily-status-select";

// Duplicated rather than imported from @/lib/operator-availability, which pulls in
// "server-only" and can't be bundled into this Client Component (same reason
// operators/page.tsx keeps its own copy instead of importing that lib's).
function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

type Operator = {
  id: string;
  username: string;
  full_name: string | null;
  employee_id: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  driving_license_path: string | null;
  driving_license_expiry: string | null;
  aadhar_path: string | null;
  police_verification_path: string | null;
};

const DAYS_TO_MS = 24 * 60 * 60 * 1000;

function dlExpiryBadge(expiry: string | null): { label: string; className: string } | null {
  if (!expiry) return null;
  const today = todayIST();
  if (expiry < today) {
    return { label: "DL expired", className: "bg-status-danger/15 text-status-danger" };
  }
  const daysLeft = Math.round(
    (new Date(`${expiry}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / DAYS_TO_MS
  );
  if (daysLeft <= 30) {
    return {
      label: `DL expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      className: "bg-status-warning/15 text-status-warning",
    };
  }
  return null;
}

export function OperatorCard({
  operator,
  photoUrl,
  documentUrls,
  dailyStatus,
  updateAction,
  leaveAction,
  activeAction,
  deleteAction,
  dailyStatusAction,
}: {
  operator: Operator;
  photoUrl: string | null;
  documentUrls: {
    driving_license: string | null;
    aadhar: string | null;
    police_verification: string | null;
  };
  dailyStatus: string | null;
  updateAction: (formData: FormData) => Promise<void> | void;
  leaveAction: (formData: FormData) => Promise<void> | void;
  activeAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  dailyStatusAction: (formData: FormData) => Promise<void> | void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [leavePending, setLeavePending] = useState(false);

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditPending(true);
    try {
      await updateAction(new FormData(event.currentTarget));
      setEditOpen(false);
    } finally {
      setEditPending(false);
    }
  }

  async function handleLeaveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeavePending(true);
    try {
      await leaveAction(new FormData(event.currentTarget));
      setLeaveOpen(false);
    } finally {
      setLeavePending(false);
    }
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from a private bucket, next/image can't proxy it
            <img
              src={photoUrl}
              alt={operator.username}
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {operator.username}
              {!operator.is_active && (
                <span className="ml-2 rounded-full bg-status-danger/15 px-2 py-0.5 text-xs font-medium text-status-danger">
                  Inactive
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {[operator.full_name, operator.employee_id].filter(Boolean).join(" · ") || "—"}
            </p>
            {(operator.email || operator.phone) && (
              <p className="truncate text-xs text-muted-foreground">
                {[operator.email, operator.phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger aria-label="More actions" className="shrink-0 rounded-lg p-1.5 hover:bg-muted">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLeaveOpen(true)}>
              <CalendarOff className="size-4" />
              Mark leave
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(() => {
        const badge = dlExpiryBadge(operator.driving_license_expiry);
        const hasDocs =
          documentUrls.driving_license || documentUrls.aadhar || documentUrls.police_verification;
        if (!badge && !hasDocs) return null;
        return (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {documentUrls.driving_license && (
              <a
                href={documentUrls.driving_license}
                target="_blank"
                rel="noreferrer"
                className="text-brand-orange hover:underline"
              >
                Driving License
              </a>
            )}
            {badge && (
              <span className={`rounded-full px-2 py-0.5 font-medium ${badge.className}`}>{badge.label}</span>
            )}
            {documentUrls.aadhar && (
              <a
                href={documentUrls.aadhar}
                target="_blank"
                rel="noreferrer"
                className="text-brand-orange hover:underline"
              >
                Aadhar Card
              </a>
            )}
            {documentUrls.police_verification && (
              <a
                href={documentUrls.police_verification}
                target="_blank"
                rel="noreferrer"
                className="text-brand-orange hover:underline"
              >
                Police Verification
              </a>
            )}
          </div>
        );
      })()}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <DailyStatusSelect operatorId={operator.id} value={dailyStatus} action={dailyStatusAction} />
        <form action={activeAction}>
          <input type="hidden" name="id" value={operator.id} />
          <input type="hidden" name="is_active" value={(!operator.is_active).toString()} />
          <Button type="submit" variant="outline" size="sm">
            {operator.is_active ? "Deactivate" : "Activate"}
          </Button>
        </form>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit valet operator</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={operator.id} />
            <OperatorFormFields defaultValues={operator} passwordPlaceholder="Leave blank to keep current" />
            <Button type="submit" disabled={editPending}>
              {editPending ? "Saving…" : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {operator.username} on leave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeaveSubmit} className="flex flex-col gap-3">
            <input type="hidden" name="operator_id" value={operator.id} />
            <Field label="From">
              <Input name="start_date" type="date" required />
            </Field>
            <Field label="To">
              <Input name="end_date" type="date" required />
            </Field>
            <Button type="submit" disabled={leavePending}>
              {leavePending ? "Saving…" : "Mark leave"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={operator.username}
        consequences={["Removes this operator's login access."]}
        action={deleteAction}
        hiddenFields={{ id: operator.id }}
      />
    </div>
  );
}
